import "@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .filter(Boolean);

function getCorsHeaders(req: Request) {
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

function jsonResponse(body: Record<string, unknown>, status = 200, req?: Request) {
  const cors = req
    ? getCorsHeaders(req)
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

const FEATURE_IDS = [
  "nose_width",
  "nose_length",
  "nose_bridge",
  "brow_lift",
  "brow_gap",
  "eye_size",
  "lip_fullness",
  "lip_width",
  "jawline",
  "chin_height",
  "chin_width",
  "cheek_fullness",
  "face_width",
  "forehead",
  "skin_smoothness",
  "skin_firmness",
] as const;

type FeatureId = (typeof FEATURE_IDS)[number];

interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
  featureDeltas?: Partial<Record<FeatureId, number>>;
}

interface RequestBody {
  message: string;
  currentFeatureValues: Record<FeatureId, number>;
  history?: ChatHistoryEntry[];
  aiModeEnabled?: boolean;
}

interface PlannerResponse {
  intent: "adjustment" | "reset" | "undo" | "ai_generate" | "clarify";
  featureDeltas: Partial<Record<FeatureId, number>>;
  explanation: string;
  shouldInvokeAiImage: boolean;
}

const SYSTEM_PROMPT = `You are the chat-to-controls planner for a face visualization platform. The user is editing a face photo using natural language. Convert each user message into a JSON object that adjusts up to 16 face parameters.

Each feature is a delta in the range [-1, 1] that will be ADDED to the current value (clamped to [-1, 1]).

The 16 controllable features (sign meaning):
- nose_width: -1 thinner, +1 wider
- nose_length: -1 shorter, +1 longer
- nose_bridge: -1 narrower bridge, +1 wider bridge
- brow_lift: +1 raised brows, -1 lowered
- brow_gap: -1 brows closer, +1 brows farther apart
- eye_size: +1 bigger eyes, -1 smaller
- lip_fullness: +1 fuller, -1 thinner
- lip_width: +1 wider mouth, -1 narrower
- jawline: -1 sharper/V-line, +1 wider/square
- chin_height: +1 longer chin, -1 shorter
- chin_width: -1 narrower, +1 wider
- cheek_fullness: +1 higher cheekbones, -1 slimmer cheeks
- face_width: -1 slimmer, +1 fuller
- forehead: +1 bigger, -1 smaller
- skin_smoothness: +1 smoother (AI image only), -1 more texture
- skin_firmness: +1 firmer (AI image only), -1 softer

Magnitudes:
- subtle: ~0.2
- moderate: ~0.4-0.5 (default if user gives no qualifier)
- noticeable: ~0.6-0.7
- dramatic: ~0.8-1.0

High-level concept decomposition examples:
- "look 5 years younger" -> brow_lift +0.25, cheek_fullness +0.35, skin_smoothness +0.5, skin_firmness +0.5, jawline -0.15
- "more feminine, softer" -> jawline +0.3, lip_fullness +0.35, eye_size +0.25, cheek_fullness +0.2
- "more masculine, chiseled" -> jawline -0.55, lip_fullness -0.2, cheek_fullness +0.35, brow_lift -0.15
- "glow up" -> skin_smoothness +0.4, skin_firmness +0.4, lip_fullness +0.25, brow_lift +0.2
- "k-pop idol look" -> jawline -0.6, eye_size +0.3, skin_smoothness +0.5, lip_fullness +0.2, nose_width -0.3
- "natural look" -> set all current non-zero deltas back toward 0 (this is intent: "reset")
- "model jawline" -> jawline -0.7, cheek_fullness +0.4

Rules:
- Output ONLY valid JSON. No markdown fences, no prose outside JSON.
- For "more" / "less" / "a bit more" follow-ups: look at the most recent assistant feature_deltas in history, apply ~0.15 in the same direction (or opposite for "less").
- For "undo" or "undo that": intent = "undo", featureDeltas = {}.
- For "reset" or "start over": intent = "reset", featureDeltas = {}.
- If skin_smoothness or skin_firmness are non-zero in your output, set shouldInvokeAiImage = true (these only render via the AI image pipeline).
- If you genuinely can't tell what the user wants, intent = "clarify" with a one-sentence explanation asking what to change.
- Be conservative: most single-feature requests should be ~0.4 magnitude unless the user says "dramatic", "very", "max", etc.
- Only include features in featureDeltas that the user is changing. Omit unchanged features.
- The "explanation" field is shown to the user — write it as a friendly one-line summary like "Lifted brows and softened the jawline."

Return shape:
{
  "intent": "adjustment" | "reset" | "undo" | "ai_generate" | "clarify",
  "featureDeltas": { "<feature_id>": <number between -1 and 1>, ... },
  "explanation": "<one-line user-facing summary>",
  "shouldInvokeAiImage": <boolean>
}`;

function buildUserPrompt(body: RequestBody): string {
  const recentHistory = (body.history ?? []).slice(-6);
  const historyText = recentHistory
    .map((m) => {
      const deltas = m.featureDeltas
        ? ` (deltas: ${JSON.stringify(m.featureDeltas)})`
        : "";
      return `${m.role}: ${m.content}${deltas}`;
    })
    .join("\n");

  return `Current feature values: ${JSON.stringify(body.currentFeatureValues)}
AI image mode: ${body.aiModeEnabled ? "ON" : "off"}

Recent conversation:
${historyText || "(no prior messages)"}

User says: "${body.message}"

Return the JSON plan now.`;
}

function clampDeltas(
  raw: unknown,
): Partial<Record<FeatureId, number>> {
  if (!raw || typeof raw !== "object") return {};
  const result: Partial<Record<FeatureId, number>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!FEATURE_IDS.includes(k as FeatureId)) continue;
    const num = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(num)) continue;
    result[k as FeatureId] = Math.max(-1, Math.min(1, num));
  }
  return result;
}

function normalizePlan(parsed: unknown): PlannerResponse {
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<
    string,
    unknown
  >;

  const intent = (() => {
    const raw = String(obj.intent ?? "adjustment").toLowerCase();
    if (
      raw === "adjustment" ||
      raw === "reset" ||
      raw === "undo" ||
      raw === "ai_generate" ||
      raw === "clarify"
    ) {
      return raw;
    }
    return "adjustment" as const;
  })();

  const deltasField =
    (obj.featureDeltas as unknown) ??
    (obj.feature_deltas as unknown) ??
    {};
  const featureDeltas = clampDeltas(deltasField);

  const explanation =
    typeof obj.explanation === "string" && obj.explanation.trim().length > 0
      ? obj.explanation.trim()
      : "Done.";

  const shouldInvokeAiImage = Boolean(
    obj.shouldInvokeAiImage ?? obj.should_invoke_ai_image,
  );

  return {
    intent: intent as PlannerResponse["intent"],
    featureDeltas,
    explanation,
    shouldInvokeAiImage,
  };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  // Strip ``` fences
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Try to grab the first {...} block
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

function getProvider(): ProviderConfig | null {
  const apiKey = Deno.env.get("MINIMAX_API_KEY");
  if (!apiKey) return null;
  const baseUrl = (
    Deno.env.get("MINIMAX_API_BASE") || "https://api.minimax.chat/v1"
  ).replace(/\/$/, "");
  const model = Deno.env.get("MINIMAX_MODEL") || "MiniMax-Text-01";
  return { baseUrl, model, apiKey };
}

async function callMinimax(
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const url = `${config.baseUrl}/text/chatcompletion_v2`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.reply ??
    data?.choices?.[0]?.text ??
    "";

  if (!content) {
    throw new Error("MiniMax returned an empty response");
  }
  return String(content);
}

const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 1500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return jsonResponse({ error: "message is required" }, 400, req);
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: `message exceeds ${MAX_MESSAGE_LENGTH} characters` },
      400,
      req,
    );
  }
  if (body.history && body.history.length > MAX_HISTORY) {
    body.history = body.history.slice(-MAX_HISTORY);
  }
  if (
    !body.currentFeatureValues ||
    typeof body.currentFeatureValues !== "object"
  ) {
    return jsonResponse(
      { error: "currentFeatureValues is required" },
      400,
      req,
    );
  }

  const provider = getProvider();
  if (!provider) {
    return jsonResponse(
      {
        error:
          "MINIMAX_API_KEY not configured on the edge function. Set it via `supabase secrets set MINIMAX_API_KEY=...`",
      },
      500,
      req,
    );
  }

  const userPrompt = buildUserPrompt(body);

  try {
    const raw = await callMinimax(provider, SYSTEM_PROMPT, userPrompt);
    const parsed = extractJsonObject(raw);
    if (!parsed) {
      return jsonResponse(
        {
          error: "MiniMax did not return parsable JSON",
          raw,
        },
        502,
        req,
      );
    }
    const plan = normalizePlan(parsed);
    return jsonResponse(
      { ...plan, provider: "minimax", model: provider.model },
      200,
      req,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "MiniMax call failed";
    return jsonResponse({ error: msg }, 502, req);
  }
});
