import { supabase, supabaseConfigured } from "@/lib/supabase";
import {
  parseUserMessage,
  applyDeltas,
  type ChatMessage,
  type ParseResult,
} from "./chatParser";
import type { FeatureValues } from "./landmarks";

/**
 * Bridge between user chat input and feature deltas.
 *
 * Strategy: try the LLM-backed Supabase edge function first
 * (which uses MiniMax to decompose high-level intent like "look 5 years
 * younger" into multiple feature deltas). Fall back to the local regex
 * parser if the edge function is not configured or fails.
 *
 * The fallback path keeps the UI fully functional offline / without an
 * LLM key, preserving the existing behavior for direct intents like
 * "thinner nose" or "fuller lips".
 */

export interface LLMBridgeOptions {
  /** Force the regex fallback (skip the LLM call). Useful for tests. */
  forceLocal?: boolean;
  /** Override fetch for tests. */
  invoker?: typeof supabase.functions.invoke;
  aiModeEnabled?: boolean;
  /** Timeout in ms for the LLM call. Default 12s. */
  timeoutMs?: number;
}

export type FaceOperationType = "swap" | "enhance" | "age" | "expression";

export interface FaceOperationPlan {
  type: FaceOperationType;
  direction?: number;
  model?: string;
  blend?: number;
  expression?: string;
  needsTargetFace?: boolean;
}

interface LLMPlan {
  intent:
    | "adjustment"
    | "reset"
    | "undo"
    | "ai_generate"
    | "clarify"
    | "face_operation";
  featureDeltas: Partial<FeatureValues>;
  explanation: string;
  shouldInvokeAiImage: boolean;
  faceOperation?: FaceOperationPlan;
  provider?: string;
  model?: string;
}

const DEFAULT_TIMEOUT_MS = 12_000;

function planToParseResult(
  plan: LLMPlan,
  _text: string,
  currentValues: FeatureValues,
  history: ChatMessage[],
): ParseResult {
  if (plan.intent === "face_operation") {
    // Treat as unknown for the warp pipeline; the caller handles
    // the actual face-operation invocation via shouldInvokeAiImage flow.
    return {
      type: "unknown",
      featureDeltas: {},
      responseText: plan.explanation || "Running that face operation now.",
    };
  }
  if (plan.intent === "reset") {
    // Build deltas that zero out current non-zero features so the same
    // applyDeltas pipeline can render the result.
    const deltas: Partial<FeatureValues> = {};
    for (const [key, val] of Object.entries(currentValues)) {
      if (Math.abs(val) > 0.01) {
        deltas[key as keyof FeatureValues] = -val;
      }
    }
    return {
      type: "reset",
      featureDeltas: deltas,
      responseText:
        plan.explanation ||
        "Reset to your original photo. Ready when you are.",
    };
  }

  if (plan.intent === "undo") {
    const lastAssistant = [...history]
      .reverse()
      .find((m) => m.role === "assistant" && m.featureDeltas);
    if (lastAssistant?.featureDeltas) {
      const deltas: Partial<FeatureValues> = {};
      for (const [key, val] of Object.entries(lastAssistant.featureDeltas)) {
        deltas[key as keyof FeatureValues] = -(val as number);
      }
      return {
        type: "undo",
        featureDeltas: deltas,
        responseText: plan.explanation || "Undone the last change.",
        undoMessageId: lastAssistant.id,
      };
    }
    return {
      type: "undo",
      featureDeltas: {},
      responseText:
        plan.explanation || "Nothing to undo yet — try a change first.",
    };
  }

  if (plan.intent === "clarify" || Object.keys(plan.featureDeltas).length === 0) {
    return {
      type: "unknown",
      featureDeltas: {},
      responseText:
        plan.explanation ||
        "Could you describe that another way? Try \"thinner nose\" or \"lift my brows\".",
    };
  }

  // adjustment / ai_generate both produce concrete deltas
  return {
    type: "adjustment",
    featureDeltas: plan.featureDeltas,
    responseText: plan.explanation || "Updated.",
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("LLM call timed out")), ms);
    promise.then(
      (val) => {
        clearTimeout(t);
        resolve(val);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

export interface BridgeResult extends ParseResult {
  /** Whether the LLM (true) or the regex fallback (false) produced this. */
  source: "llm" | "regex";
  /** True when the planner explicitly asked for the AI image pipeline. */
  shouldInvokeAiImage: boolean;
  /** Set when the planner picked a FaceFusion operation. */
  faceOperation?: FaceOperationPlan;
}

export async function chatToFeatures(
  text: string,
  currentValues: FeatureValues,
  history: ChatMessage[],
  options: LLMBridgeOptions = {},
): Promise<BridgeResult> {
  const { forceLocal, invoker, aiModeEnabled, timeoutMs } = options;

  const fallback = (): BridgeResult => {
    const local = parseUserMessage(text, currentValues, history);
    return {
      ...local,
      source: "regex",
      shouldInvokeAiImage: false,
      faceOperation: undefined,
    };
  };

  if (forceLocal) {
    return fallback();
  }
  // If no test invoker is provided and Supabase is not configured, fall back.
  if (!invoker && !supabaseConfigured) {
    return fallback();
  }

  const callInvoke = invoker ?? supabase.functions.invoke;

  try {
    const { data, error } = await withTimeout(
      callInvoke("chat-to-features", {
        body: {
          message: text,
          currentFeatureValues: currentValues,
          history: history.slice(-12).map((m) => ({
            role: m.role,
            content: m.content,
            featureDeltas: m.featureDeltas,
          })),
          aiModeEnabled: Boolean(aiModeEnabled),
        },
      }),
      timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    if (error || !data || (data as { error?: string }).error) {
      return fallback();
    }

    const plan = data as LLMPlan;
    const result = planToParseResult(plan, text, currentValues, history);
    return {
      ...result,
      source: "llm",
      shouldInvokeAiImage: Boolean(plan.shouldInvokeAiImage),
      faceOperation:
        plan.intent === "face_operation" ? plan.faceOperation : undefined,
    };
  } catch {
    return fallback();
  }
}

/**
 * Convenience wrapper: runs the bridge and returns the new feature values
 * after applying the planner's deltas. Useful for non-React callers and tests.
 */
export async function chatToFeatureValues(
  text: string,
  currentValues: FeatureValues,
  history: ChatMessage[],
  options: LLMBridgeOptions = {},
): Promise<{ result: BridgeResult; nextValues: FeatureValues }> {
  const result = await chatToFeatures(text, currentValues, history, options);
  const nextValues =
    result.type === "adjustment" || result.type === "undo" || result.type === "reset"
      ? applyDeltas(currentValues, result.featureDeltas)
      : currentValues;
  return { result, nextValues };
}
