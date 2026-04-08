import "@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "npm:@google/genai@^1.0.0";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || "*");
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface GenerateRequest {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
}

interface ProviderResult {
  resultImageBase64: string;
  resultMimeType: string;
  description: string | null;
  provider: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200, req?: Request) {
  const cors = req ? getCorsHeaders(req) : { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function toBase64(bytes: Uint8Array): string {
  let result = "";
  const CHUNK = 32768;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    result += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(result);
}

// ── Provider: Gemini NanoBanana ─────────────────────────────

async function tryGemini(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<ProviderResult> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { data: imageBase64, mimeType } },
        ],
      },
    ],
    config: {
      responseModalities: ["Text", "Image"],
      temperature: 1,
      topP: 0.95,
      topK: 40,
    },
  });

  let editedImage: string | null = null;
  let description: string | null = null;
  let outputMimeType = "image/png";

  if (response.candidates && response.candidates.length > 0) {
    const parts = response.candidates[0].content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData) {
        editedImage = part.inlineData.data ?? null;
        outputMimeType = part.inlineData.mimeType ?? "image/png";
      } else if (part.text) {
        description = part.text;
      }
    }
  }

  if (!editedImage) {
    throw new Error(
      description ?? "Gemini did not return an image. Try rephrasing.",
    );
  }

  return {
    resultImageBase64: editedImage,
    resultMimeType: outputMimeType,
    description,
    provider: "gemini-nanobanana",
  };
}

// ── Provider: HuggingFace FLUX.1 Kontext (instruction-based editing) ──

async function tryHuggingFace(
  apiKey: string,
  prompt: string,
  imageBase64: string,
): Promise<ProviderResult> {
  // Use the HF router with fal-ai provider for FLUX.1-Kontext-dev
  // This is the official image-to-image endpoint format
  const response = await fetch(
    "https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-Kontext-dev",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: imageBase64,
        parameters: {
          prompt,
          guidance_scale: 2.5,
          num_inference_steps: 28,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FLUX.1 Kontext error (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  // Router returns raw image bytes for image-to-image tasks
  if (contentType.startsWith("image/")) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      resultImageBase64: toBase64(bytes),
      resultMimeType: contentType,
      description: null,
      provider: "flux-kontext",
    };
  }

  // Some providers return JSON with image URL or base64
  const data = await response.json();

  if (data.images && data.images.length > 0) {
    const imageUrl: string = data.images[0].url;

    if (imageUrl.startsWith("data:")) {
      return {
        resultImageBase64: imageUrl.split(",")[1],
        resultMimeType: "image/png",
        description: null,
        provider: "flux-kontext",
      };
    }

    // Fetch the image from URL
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to download generated image`);
    }
    const imgBytes = new Uint8Array(await imgResponse.arrayBuffer());

    return {
      resultImageBase64: toBase64(imgBytes),
      resultMimeType: imgResponse.headers.get("content-type") ?? "image/png",
      description: null,
      provider: "flux-kontext",
    };
  }

  if (data.image) {
    return {
      resultImageBase64: typeof data.image === "string" && data.image.startsWith("data:")
        ? data.image.split(",")[1]
        : data.image,
      resultMimeType: "image/png",
      description: null,
      provider: "flux-kontext",
    };
  }

  throw new Error("FLUX.1 Kontext returned no usable image data");
}

// ── Main Handler ────────────────────────────────────────────

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB base64
const MAX_PROMPT_LENGTH = 2000;
const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const HF_API_KEY = Deno.env.get("HF_API_KEY");

  if (!GEMINI_API_KEY && !HF_API_KEY) {
    return jsonResponse(
      { error: "No AI provider configured. Set GEMINI_API_KEY or HF_API_KEY." },
      500, req,
    );
  }

  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  const { prompt, imageBase64, mimeType = "image/jpeg" } = body;

  if (!prompt || !imageBase64) {
    return jsonResponse(
      { error: "prompt and imageBase64 are required" },
      400, req,
    );
  }

  // Input validation
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return jsonResponse({ error: `Prompt exceeds ${MAX_PROMPT_LENGTH} characters` }, 400, req);
  }
  if (imageBase64.length > MAX_IMAGE_SIZE) {
    return jsonResponse({ error: "Image exceeds 10 MB size limit" }, 400, req);
  }
  if (!VALID_MIME_TYPES.includes(mimeType)) {
    return jsonResponse({ error: `Invalid mimeType. Allowed: ${VALID_MIME_TYPES.join(", ")}` }, 400, req);
  }

  const errors: string[] = [];

  // Try Gemini first (fastest, best quality for face edits)
  if (GEMINI_API_KEY) {
    try {
      const result = await tryGemini(GEMINI_API_KEY, prompt, imageBase64, mimeType);
      return jsonResponse(result, 200, req);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gemini failed";
      errors.push(`Gemini: ${msg}`);
    }
  }

  // Fall back to HuggingFace FLUX.1 Kontext
  if (HF_API_KEY) {
    try {
      const result = await tryHuggingFace(HF_API_KEY, prompt, imageBase64);
      return jsonResponse(result, 200, req);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "HuggingFace failed";
      errors.push(`FLUX Kontext: ${msg}`);
    }
  }

  return jsonResponse(
    {
      error: "All AI providers failed",
    },
    502, req,
  );
});
