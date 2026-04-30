import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { FaceOperationPlan } from "./llmChatBridge";
import { base64ToDataUrl } from "./aiPipeline";

export interface FaceOperationRequest extends FaceOperationPlan {
  imageBase64: string;
  /** Required only for `swap`. */
  targetBase64?: string;
}

export interface FaceOperationResult {
  resultDataUrl: string;
  durationMs: number;
}

/**
 * Calls the Supabase `face-operation` edge function which proxies to the
 * Railway-hosted FaceFusion service. Returns a data URL ready to draw on
 * the canvas.
 */
export async function runFaceOperation(
  req: FaceOperationRequest,
): Promise<FaceOperationResult> {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
    );
  }
  if (req.type === "swap" && !req.targetBase64) {
    throw new Error(
      "Face swap requires a reference face image (targetBase64).",
    );
  }

  const body: Record<string, unknown> = {
    operation: req.type,
    imageBase64: req.imageBase64,
  };
  if (req.type === "swap") {
    body.targetBase64 = req.targetBase64;
  }
  if (req.type === "age" && typeof req.direction === "number") {
    body.direction = req.direction;
  }
  if (req.type === "enhance") {
    if (req.model) body.model = req.model;
    if (typeof req.blend === "number") body.blend = req.blend;
  }
  if (req.type === "expression" && req.expression) {
    body.expression = req.expression;
  }

  const start = Date.now();
  const { data, error } = await supabase.functions.invoke("face-operation", {
    body,
  });

  if (error) {
    throw new Error(`Face operation failed: ${error.message}`);
  }
  const response = data as {
    resultBase64?: string;
    mimeType?: string;
    error?: string;
  };
  if (response.error) {
    throw new Error(response.error);
  }
  if (!response.resultBase64) {
    throw new Error("FaceFusion returned no image");
  }
  return {
    resultDataUrl: base64ToDataUrl(
      response.resultBase64,
      response.mimeType || "image/jpeg",
    ),
    durationMs: Date.now() - start,
  };
}
