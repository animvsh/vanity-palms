/**
 * AI-powered plastic surgery visualization pipeline (Gemini / NanoBanana).
 *
 * Calls a Supabase Edge Function (ai-visualize) which holds the Gemini API
 * key as a secret. The client never sees or stores any API key.
 *
 * Pipeline (server-side):
 *   Receive image + prompt → Gemini image editing (NanoBanana) → return edited image
 */

import { supabase, supabaseConfigured } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────

export interface AIGenerationRequest {
  /** Base64 encoded source image (no data: prefix) */
  sourceImageBase64: string;
  /** Natural language instruction describing the edit */
  prompt: string;
  /** Negative prompt to avoid unwanted outputs */
  negativePrompt?: string;
  /** Strength 0-1 (controls prompt intensity wording) */
  strength: number;
}

export interface AIGenerationResult {
  /** Base64 encoded result image */
  resultImageBase64: string;
  /** Provider that generated the result */
  provider: string;
  /** Time taken in ms */
  durationMs: number;
}

// ── Helper: Canvas/Image → Base64 ─────────────────────────

const MAX_DIMENSION = 2048;

export function imageToBase64(
  image: HTMLImageElement | HTMLCanvasElement,
): string {
  const canvas = document.createElement("canvas");
  let w =
    image instanceof HTMLImageElement
      ? image.naturalWidth || image.width
      : image.width;
  let h =
    image instanceof HTMLImageElement
      ? image.naturalHeight || image.height
      : image.height;

  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context for image encoding");
  ctx.drawImage(image, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
}

export function base64ToDataUrl(base64: string, mimeType = "image/png"): string {
  if (base64.startsWith("data:")) return base64;
  return `data:${mimeType};base64,${base64}`;
}

// ── Prompt Builder for Gemini Image Editing ─────────────────

/** Maps user intent to a precise editing instruction for Gemini */
const PROCEDURE_INSTRUCTIONS: Record<string, (strength: string) => string> = {
  rhinoplasty: (s) =>
    `Edit this photo: make the nose ${s} thinner and more refined. Narrow the nasal bridge and refine the tip. Keep everything else identical — same person, skin, expression, background, lighting.`,
  nose_wider: (s) =>
    `Edit this photo: make the nose ${s} wider. Keep everything else identical — same person, skin, expression, background, lighting.`,
  nose_shorter: (s) =>
    `Edit this photo: make the nose ${s} shorter. Keep everything else identical — same person, skin, expression, background, lighting.`,
  nose_longer: (s) =>
    `Edit this photo: make the nose ${s} longer. Keep everything else identical — same person, skin, expression, background, lighting.`,
  brow_lift: (s) =>
    `Edit this photo: ${s} lift the eyebrows higher for a more open, refreshed look. Keep everything else identical — same person, skin, expression, background, lighting.`,
  brow_lower: (s) =>
    `Edit this photo: ${s} lower the eyebrows. Keep everything else identical — same person, skin, expression, background, lighting.`,
  lip_fuller: (s) =>
    `Edit this photo: make the lips ${s} fuller and more plump, like a subtle lip filler result. Keep everything else identical — same person, skin, expression, background, lighting.`,
  lip_thinner: (s) =>
    `Edit this photo: make the lips ${s} thinner. Keep everything else identical — same person, skin, expression, background, lighting.`,
  jawline_sharper: (s) =>
    `Edit this photo: make the jawline ${s} sharper and more defined, creating a V-line contour. Keep everything else identical — same person, skin, expression, background, lighting.`,
  jawline_wider: (s) =>
    `Edit this photo: make the jawline ${s} wider and more square. Keep everything else identical — same person, skin, expression, background, lighting.`,
  eye_bigger: (s) =>
    `Edit this photo: make the eyes ${s} bigger and more open. Keep everything else identical — same person, skin, expression, background, lighting.`,
  eye_smaller: (s) =>
    `Edit this photo: make the eyes ${s} smaller. Keep everything else identical — same person, skin, expression, background, lighting.`,
  cheek_fuller: (s) =>
    `Edit this photo: make the cheekbones ${s} more prominent and defined. Keep everything else identical — same person, skin, expression, background, lighting.`,
  cheek_slimmer: (s) =>
    `Edit this photo: make the cheeks ${s} slimmer. Keep everything else identical — same person, skin, expression, background, lighting.`,
  chin_longer: (s) =>
    `Edit this photo: make the chin ${s} longer with more projection. Keep everything else identical — same person, skin, expression, background, lighting.`,
  chin_shorter: (s) =>
    `Edit this photo: make the chin ${s} shorter. Keep everything else identical — same person, skin, expression, background, lighting.`,
  face_slimmer: (s) =>
    `Edit this photo: make the face ${s} slimmer and narrower. Keep everything else identical — same person, skin, expression, background, lighting.`,
  face_wider: (s) =>
    `Edit this photo: make the face ${s} wider. Keep everything else identical — same person, skin, expression, background, lighting.`,
  facelift: (s) =>
    `Edit this photo: apply a ${s} facelift effect — tighten the skin, reduce sagging, create a more youthful appearance. Keep the same person, skin tone, expression, background, lighting.`,
  forehead_smaller: (s) =>
    `Edit this photo: make the forehead ${s} smaller. Keep everything else identical — same person, skin, expression, background, lighting.`,
  forehead_bigger: (s) =>
    `Edit this photo: make the forehead ${s} bigger. Keep everything else identical — same person, skin, expression, background, lighting.`,
  skin_smoother: (s) =>
    `Edit this photo: ${s} smooth and refine the skin texture, reducing pores and giving a more refined complexion. Keep everything else identical — same person, skin, expression, background, lighting.`,
  skin_textured: (s) =>
    `Edit this photo: ${s} add more natural skin texture with visible pores. Keep everything else identical — same person, skin, expression, background, lighting.`,
  skin_firmer: (s) =>
    `Edit this photo: ${s} tighten and firm the skin, improving elasticity and density for a more taut appearance. Keep everything else identical — same person, skin, expression, background, lighting.`,
  skin_softer: (s) =>
    `Edit this photo: ${s} soften and relax the skin. Keep everything else identical — same person, skin, expression, background, lighting.`,
};

function detectProcedure(text: string): string | null {
  const lower = text.toLowerCase();

  if (/thin(ner)?\s*nose|nose\s*thin|narrow(er)?\s*nose|slim(mer)?\s*nose|small(er)?\s*nose|rhinoplast|nose\s*(job|refine|reshap)|refine.*nose/i.test(lower))
    return "rhinoplasty";
  if (/wide(r)?\s*nose|nose\s*wide|broad(er)?\s*nose|big(ger)?\s*nose/i.test(lower))
    return "nose_wider";
  if (/short(er)?\s*nose|nose\s*short|reduce\s*nose/i.test(lower))
    return "nose_shorter";
  if (/long(er)?\s*nose|nose\s*long|extend\s*nose/i.test(lower))
    return "nose_longer";
  if (/lift.*brow|brow.*lift|raise.*brow|higher.*brow|elevate.*brow|brow.*(plasty|surgery)/i.test(lower))
    return "brow_lift";
  if (/lower.*brow|drop.*brow|brow.*down/i.test(lower))
    return "brow_lower";
  if (/full(er)?\s*lip|lip.*full|plump\s*lip|lip.*plump|big(ger)?\s*lip|lip\s*filler|pouty|lip\s*(augment|enhanc|inject)/i.test(lower))
    return "lip_fuller";
  if (/thin(ner)?\s*lip|lip.*thin|reduce\s*lip|lip.*small|small(er)?\s*lip/i.test(lower))
    return "lip_thinner";
  if (/sharp(er|en)?\s*jaw|jaw.*sharp|define.*jaw|jaw.*defin|sculpt.*jaw|slim(mer)?\s*jaw|narrow(er)?\s*jaw|v.?line|jaw\s*(contour|surgery|reshap)/i.test(lower))
    return "jawline_sharper";
  if (/wide(r)?\s*jaw|jaw.*wide|square\s*jaw|broad(er)?\s*jaw/i.test(lower))
    return "jawline_wider";
  if (/big(ger)?\s*eye|eye.*big|open.*eye|widen.*eye|larger\s*eye|eye.*larger|eye.*open|blepharoplast|eyelid\s*(surgery|lift)/i.test(lower))
    return "eye_bigger";
  if (/small(er)?\s*eye|eye.*small|narrow.*eye/i.test(lower))
    return "eye_smaller";
  if (/cheek\s*bone|high(er)?\s*cheek|define\s*cheek|sculpt\s*cheek|prominent\s*cheek|more\s*cheek|cheek\s*(augment|filler|implant|inject)/i.test(lower))
    return "cheek_fuller";
  if (/slim(mer)?\s*cheek|less\s*cheek|reduce\s*cheek|flatten\s*cheek/i.test(lower))
    return "cheek_slimmer";
  if (/long(er)?\s*chin|chin.*long|extend\s*chin|more\s*chin/i.test(lower))
    return "chin_longer";
  if (/short(er)?\s*chin|chin.*short|reduce\s*chin|less\s*chin/i.test(lower))
    return "chin_shorter";
  if (/slim(mer)?\s*face|face.*slim|narrow(er)?\s*face|thin(ner)?\s*face|face\s*(contour|sculpt|tighten)/i.test(lower))
    return "face_slimmer";
  if (/wide(r)?\s*face|face.*wide|broad(er)?\s*face|full(er)?\s*face/i.test(lower))
    return "face_wider";
  if (/facelift|face\s*lift/i.test(lower))
    return "facelift";
  if (/small(er)?\s*forehead|reduce\s*forehead|lower\s*hairline|less\s*forehead/i.test(lower))
    return "forehead_smaller";
  if (/big(ger)?\s*forehead|higher\s*forehead|more\s*forehead/i.test(lower))
    return "forehead_bigger";

  // Skin
  if (/smooth(er)?\s*skin|skin\s*smooth|refine\s*skin|skin\s*texture|reduce\s*pore|less\s*pore|clear(er)?\s*skin|skin\s*resurfac/i.test(lower))
    return "skin_smoother";
  if (/natural\s*skin|more\s*texture|textured\s*skin|visible\s*pore|rough(er)?\s*skin/i.test(lower))
    return "skin_textured";
  if (/firm(er)?\s*skin|skin\s*firm|tight(er|en)?\s*skin|skin\s*tight|taut(er)?\s*skin|skin\s*elasticity|skin\s*density|denser\s*skin|improve\s*skin/i.test(lower))
    return "skin_firmer";
  if (/soft(er)?\s*skin|skin\s*soft|relax(ed)?\s*skin|loose(r)?\s*skin|less\s*firm/i.test(lower))
    return "skin_softer";

  return null;
}

export function buildTransformationPrompt(
  userDescription: string,
  strength: number,
  featureValues?: Record<string, number>,
): { prompt: string; negativePrompt: string } {
  const strengthWord =
    strength > 0.7
      ? "significantly"
      : strength > 0.4
        ? "noticeably"
        : "subtly";

  const procedure = detectProcedure(userDescription);

  let prompt: string;
  if (procedure && PROCEDURE_INSTRUCTIONS[procedure]) {
    prompt = PROCEDURE_INSTRUCTIONS[procedure](strengthWord);
  } else {
    prompt = `Edit this photo: ${userDescription}. Keep everything else identical — same person, same identity, same skin tone, same expression, same background, same lighting. Make only the requested change, nothing else.`;
  }

  // Append skin feature modifiers (AI-only, no geometric transforms)
  if (featureValues) {
    const skinParts: string[] = [];
    const smoothness = featureValues["skin_smoothness"] ?? 0;
    const firmness = featureValues["skin_firmness"] ?? 0;

    if (smoothness > 0) {
      skinParts.push("smoother, more refined skin texture, reduced pores");
    } else if (smoothness < 0) {
      skinParts.push("more textured, natural skin with visible pores");
    }

    if (firmness > 0) {
      skinParts.push("firmer, more taut skin with improved elasticity");
    } else if (firmness < 0) {
      skinParts.push("softer, more relaxed skin");
    }

    if (skinParts.length > 0) {
      prompt += ` Also apply: ${skinParts.join("; ")}.`;
    }
  }

  const negativePrompt = [
    "different person, changed identity, unrealistic, cartoon, anime,",
    "painting, illustration, deformed, disfigured, bad anatomy,",
    "blurry, low quality, watermark, text, logo, signature,",
    "over-processed, plastic looking, uncanny valley,",
    "drastic change, unrecognizable, different ethnicity,",
    "different age, different gender, different face shape",
  ].join(" ");

  return { prompt, negativePrompt };
}

// ── Main Generation Function ───────────────────────────────

/** Timeout for AI generation (90 seconds) */
const AI_TIMEOUT_MS = 90_000;

export async function generateAIVisualization(
  request: AIGenerationRequest,
): Promise<AIGenerationResult> {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable AI mode.");
  }

  const start = Date.now();

  const invokePromise = supabase.functions.invoke("ai-visualize", {
    body: {
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      strength: request.strength,
      imageBase64: request.sourceImageBase64,
      mimeType: "image/jpeg",
    },
  });

  let timerId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error("AI generation timed out after 90 seconds")),
      AI_TIMEOUT_MS,
    );
  });

  let data: unknown;
  let error: { message: string } | null = null;
  try {
    ({ data, error } = await Promise.race([invokePromise, timeoutPromise]));
  } finally {
    clearTimeout(timerId!);
  }

  if (error) {
    throw new Error(`AI visualization failed: ${error.message}`);
  }

  const response = data as {
    resultImageBase64?: string;
    resultMimeType?: string;
    description?: string;
    provider?: string;
    error?: string;
    details?: string;
  };

  if (response.error) {
    throw new Error(response.details || response.error);
  }

  if (!response.resultImageBase64) {
    throw new Error("No image returned from AI pipeline");
  }

  return {
    resultImageBase64: response.resultImageBase64,
    provider: response.provider || "gemini-nanobanana",
    durationMs: Date.now() - start,
  };
}
