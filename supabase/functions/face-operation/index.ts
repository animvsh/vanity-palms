import "@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge function that proxies chat-driven face operations to the
 * Railway-hosted FaceFusion service. Holds the FaceFusion bearer
 * token server-side so the public Railway URL stays closed.
 *
 * Required secrets (set via `supabase secrets set ...`):
 *   FACEFUSION_URL        — e.g. https://vanity-facefusion-production.up.railway.app
 *   FACEFUSION_API_TOKEN  — same value set on the Railway service
 *
 * Optional:
 *   FACEFUSION_TIMEOUT_MS — default 180000 (3 min)
 */

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  req?: Request,
) {
  const cors = req
    ? corsHeaders(req)
    : {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type Operation = "swap" | "enhance" | "age" | "expression";

interface RequestBody {
  operation: Operation;
  imageBase64: string;
  /** swap: required reference face */
  targetBase64?: string;
  /** swap: face_enhancer model after the swap */
  faceEnhancer?: "none" | "gfpgan_1.4" | "codeformer";
  /** enhance: model id */
  model?: "gfpgan_1.4" | "codeformer" | "gpen_bfr_512";
  /** enhance: blend % */
  blend?: number;
  /** age: -100..+100 */
  direction?: number;
  /** expression: which expression */
  expression?:
    | "neutral"
    | "smile"
    | "laugh"
    | "frown"
    | "surprised"
    | "sad"
    | "angry";
}

const VALID_OPERATIONS: Operation[] = ["swap", "enhance", "age", "expression"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = parseInt(
  Deno.env.get("FACEFUSION_TIMEOUT_MS") || "180000",
  10,
);

function validate(body: RequestBody): string | null {
  if (!body.operation || !VALID_OPERATIONS.includes(body.operation)) {
    return `operation must be one of ${VALID_OPERATIONS.join(", ")}`;
  }
  if (typeof body.imageBase64 !== "string" || body.imageBase64.length === 0) {
    return "imageBase64 is required";
  }
  if (body.imageBase64.length > MAX_IMAGE_BYTES) {
    return "image exceeds 15 MB";
  }
  if (body.operation === "swap") {
    if (typeof body.targetBase64 !== "string" || body.targetBase64.length === 0) {
      return "swap requires `targetBase64` (reference face)";
    }
    if (body.targetBase64.length > MAX_IMAGE_BYTES) {
      return "target image exceeds 15 MB";
    }
  }
  if (body.operation === "age") {
    const dir = Number(body.direction);
    if (!Number.isFinite(dir) || dir < -100 || dir > 100) {
      return "age requires `direction` between -100 and 100";
    }
  }
  return null;
}

function endpointFor(op: Operation): string {
  return `/api/${op}`;
}

function bodyFor(req: RequestBody): Record<string, unknown> {
  switch (req.operation) {
    case "swap":
      return {
        imageBase64: req.imageBase64,
        targetBase64: req.targetBase64,
        faceEnhancer: req.faceEnhancer ?? "gfpgan_1.4",
      };
    case "enhance":
      return {
        imageBase64: req.imageBase64,
        model: req.model ?? "gfpgan_1.4",
        blend: typeof req.blend === "number" ? req.blend : 80,
      };
    case "age":
      return {
        imageBase64: req.imageBase64,
        direction: Number(req.direction),
      };
    case "expression":
      return {
        imageBase64: req.imageBase64,
        expression: req.expression ?? "smile",
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  const url = (Deno.env.get("FACEFUSION_URL") || "").replace(/\/$/, "");
  const token = Deno.env.get("FACEFUSION_API_TOKEN") || "";
  if (!url) {
    return jsonResponse(
      {
        error:
          "FACEFUSION_URL is not configured. Run `supabase secrets set FACEFUSION_URL=<your-railway-url>`.",
      },
      500,
      req,
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  const validationError = validate(body);
  if (validationError) {
    return jsonResponse({ error: validationError }, 400, req);
  }

  const target = `${url}${endpointFor(body.operation)}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyFor(body)),
      signal: ctrl.signal,
    });
  } catch (err: unknown) {
    clearTimeout(t);
    const msg = err instanceof Error ? err.message : "FaceFusion request failed";
    return jsonResponse(
      {
        error: ctrl.signal.aborted
          ? `FaceFusion timed out after ${DEFAULT_TIMEOUT_MS}ms`
          : `FaceFusion unreachable: ${msg}`,
      },
      502,
      req,
    );
  }
  clearTimeout(t);

  if (!upstream.ok) {
    const text = await upstream.text();
    return jsonResponse(
      { error: `FaceFusion ${upstream.status}: ${text.slice(0, 800)}` },
      upstream.status >= 500 ? 502 : upstream.status,
      req,
    );
  }

  const data = await upstream.json();
  return jsonResponse(data, 200, req);
});
