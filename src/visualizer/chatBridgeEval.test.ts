import { describe, expect, test, vi } from "vitest";

import { chatToFeatures } from "./llmChatBridge";
import { createDefaultFeatureValues, type FeatureValues } from "./landmarks";
import type { ChatMessage } from "./chatParser";

/**
 * Chat-bridge evaluation suite.
 *
 * Runs ~25 representative user prompts through `chatToFeatures` with a
 * mocked Supabase invoker. Each test verifies:
 *   - the resulting `type` (adjustment | reset | undo | unknown)
 *   - the sign of relevant feature deltas (using the canonical
 *     sign conventions documented in landmarks.ts)
 *   - `shouldInvokeAiImage` where applicable (skin / AI-only intents)
 *
 * The mocked invoker stands in for the LLM-backed edge function so no
 * network calls are made. The fixture plans match what a well-behaved
 * planner would return for each prompt.
 */

const emptyHistory: ChatMessage[] = [];

/**
 * Build a mocked invoker that returns the given LLM plan.
 * Cast satisfies the supabase.functions.invoke type without us needing
 * to import the (heavy, browser-only) supabase client surface here.
 */
function mockInvoker(plan: {
  intent: "adjustment" | "reset" | "undo" | "ai_generate" | "clarify";
  featureDeltas: Partial<FeatureValues>;
  explanation: string;
  shouldInvokeAiImage: boolean;
}) {
  return vi.fn().mockResolvedValue({ data: plan, error: null }) as unknown as never;
}

// ---------------------------------------------------------------------------
// 1. Direct simple intents
// ---------------------------------------------------------------------------
describe("chatBridgeEval — direct simple intents", () => {
  test("'thinner nose' => negative nose_width", async () => {
    const result = await chatToFeatures(
      "thinner nose",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { nose_width: -0.5 },
          explanation: "Slimmed your nose width.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.nose_width).toBeLessThan(0);
  });

  test("'lift my brows' => positive brow_lift", async () => {
    const result = await chatToFeatures(
      "lift my brows",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { brow_lift: 0.5 },
          explanation: "Lifted your brows.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.brow_lift).toBeGreaterThan(0);
  });

  test("'fuller lips' => positive lip_fullness", async () => {
    const result = await chatToFeatures(
      "fuller lips",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { lip_fullness: 0.5 },
          explanation: "Plumped up your lips.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.lip_fullness).toBeGreaterThan(0);
  });

  test("'sharper jawline' => negative jawline (V-line)", async () => {
    const result = await chatToFeatures(
      "sharper jawline",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { jawline: -0.55 },
          explanation: "Sharpened your jawline.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.jawline).toBeLessThan(0);
  });

  test("'bigger eyes' => positive eye_size", async () => {
    const result = await chatToFeatures(
      "bigger eyes",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { eye_size: 0.5 },
          explanation: "Opened up your eyes.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.eye_size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Multi-feature requests
// ---------------------------------------------------------------------------
describe("chatBridgeEval — multi-feature requests", () => {
  test("'thinner nose and fuller lips' => both deltas correct sign", async () => {
    const result = await chatToFeatures(
      "thinner nose and fuller lips",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { nose_width: -0.45, lip_fullness: 0.45 },
          explanation: "Slimmed nose and plumped lips.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.nose_width).toBeLessThan(0);
    expect(result.featureDeltas.lip_fullness).toBeGreaterThan(0);
  });

  test("'softer feminine look' => fuller lips, bigger eyes, sharper jaw", async () => {
    const result = await chatToFeatures(
      "softer feminine look",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: {
            lip_fullness: 0.4,
            eye_size: 0.3,
            jawline: -0.35,
            cheek_fullness: 0.25,
          },
          explanation: "Softened the features for a more feminine look.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.lip_fullness).toBeGreaterThan(0);
    expect(result.featureDeltas.eye_size).toBeGreaterThan(0);
    expect(result.featureDeltas.jawline).toBeLessThan(0);
  });

  test("'more masculine, chiseled' => wider jaw, prominent cheekbones, lowered brow", async () => {
    const result = await chatToFeatures(
      "more masculine, chiseled",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: {
            jawline: 0.5,
            cheek_fullness: 0.4,
            brow_lift: -0.2,
            chin_width: 0.3,
          },
          explanation: "Squared the jaw and accentuated cheekbones.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.jawline).toBeGreaterThan(0);
    expect(result.featureDeltas.cheek_fullness).toBeGreaterThan(0);
    expect(result.featureDeltas.brow_lift).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. High-level concepts
// ---------------------------------------------------------------------------
describe("chatBridgeEval — high-level concepts", () => {
  test("'look 5 years younger' => firmer + smoother skin, fuller cheeks", async () => {
    const result = await chatToFeatures(
      "look 5 years younger",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: {
            skin_firmness: 0.5,
            skin_smoothness: 0.4,
            cheek_fullness: 0.3,
            brow_lift: 0.2,
          },
          explanation: "Tightened skin, smoothed texture, and lifted cheeks.",
          shouldInvokeAiImage: true,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.skin_firmness).toBeGreaterThan(0);
    expect(result.featureDeltas.skin_smoothness).toBeGreaterThan(0);
    expect(result.featureDeltas.cheek_fullness).toBeGreaterThan(0);
  });

  test("'glow up' => smoother skin, fuller lips, bigger eyes", async () => {
    const result = await chatToFeatures(
      "glow up",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: {
            skin_smoothness: 0.45,
            lip_fullness: 0.3,
            eye_size: 0.25,
            cheek_fullness: 0.2,
          },
          explanation: "Polished your features for a glow up.",
          shouldInvokeAiImage: true,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.skin_smoothness).toBeGreaterThan(0);
    expect(result.featureDeltas.lip_fullness).toBeGreaterThan(0);
    expect(result.featureDeltas.eye_size).toBeGreaterThan(0);
  });

  test("'k-pop idol look' => sharp jaw, bigger eyes, fuller lips, V-line", async () => {
    const result = await chatToFeatures(
      "k-pop idol look",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: {
            jawline: -0.6,
            eye_size: 0.4,
            lip_fullness: 0.3,
            chin_width: -0.4,
            nose_width: -0.3,
          },
          explanation: "Sculpted a clean V-line idol look.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.jawline).toBeLessThan(0);
    expect(result.featureDeltas.eye_size).toBeGreaterThan(0);
    expect(result.featureDeltas.chin_width).toBeLessThan(0);
  });

  test("'model jawline' => sharper jaw, sculpted cheekbones", async () => {
    const result = await chatToFeatures(
      "model jawline",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: {
            jawline: -0.65,
            cheek_fullness: 0.35,
            chin_width: -0.2,
          },
          explanation: "Carved a model-style jawline.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.jawline).toBeLessThan(0);
    expect(result.featureDeltas.cheek_fullness).toBeGreaterThan(0);
  });

  test("'more athletic features' => square jaw, defined cheekbones, firmer skin", async () => {
    const result = await chatToFeatures(
      "more athletic features",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: {
            jawline: 0.4,
            cheek_fullness: 0.4,
            skin_firmness: 0.3,
            face_width: -0.2,
          },
          explanation: "Emphasized athletic structure.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.jawline).toBeGreaterThan(0);
    expect(result.featureDeltas.cheek_fullness).toBeGreaterThan(0);
    expect(result.featureDeltas.skin_firmness).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Magnitude variations
// ---------------------------------------------------------------------------
describe("chatBridgeEval — magnitude variations", () => {
  test("'slightly thinner nose' => small negative nose_width", async () => {
    const result = await chatToFeatures(
      "slightly thinner nose",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { nose_width: -0.2 },
          explanation: "Subtly slimmed your nose.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.nose_width).toBeLessThan(0);
    expect(Math.abs(result.featureDeltas.nose_width ?? 0)).toBeLessThan(0.35);
  });

  test("'very dramatic jawline' => large negative jawline", async () => {
    const result = await chatToFeatures(
      "very dramatic jawline",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { jawline: -0.85 },
          explanation: "Dramatically sharpened the jawline.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.jawline).toBeLessThan(0);
    expect(Math.abs(result.featureDeltas.jawline ?? 0)).toBeGreaterThan(0.6);
  });

  test("'subtle brow lift' => small positive brow_lift", async () => {
    const result = await chatToFeatures(
      "subtle brow lift",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { brow_lift: 0.18 },
          explanation: "Gently lifted your brows.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.brow_lift).toBeGreaterThan(0);
    expect(result.featureDeltas.brow_lift ?? 0).toBeLessThan(0.35);
  });
});

// ---------------------------------------------------------------------------
// 5. Conversational follow-ups
// ---------------------------------------------------------------------------
describe("chatBridgeEval — conversational follow-ups", () => {
  test("'more' after a prior nose adjustment => extends in same direction", async () => {
    const history: ChatMessage[] = [
      {
        id: "a1",
        role: "assistant",
        content: "Slimmed your nose.",
        timestamp: 1,
        featureDeltas: { nose_width: -0.4 },
      },
    ];

    const result = await chatToFeatures(
      "more",
      createDefaultFeatureValues(),
      history,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { nose_width: -0.2 },
          explanation: "Took the nose a bit thinner.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.nose_width).toBeLessThan(0);
  });

  test("'less' after a prior lip change => reverses some of the change", async () => {
    const history: ChatMessage[] = [
      {
        id: "a1",
        role: "assistant",
        content: "Plumped your lips.",
        timestamp: 1,
        featureDeltas: { lip_fullness: 0.5 },
      },
    ];

    const result = await chatToFeatures(
      "less",
      createDefaultFeatureValues(),
      history,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { lip_fullness: -0.2 },
          explanation: "Pulled the lip fullness back a bit.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.lip_fullness).toBeLessThan(0);
  });

  test("'undo' after a prior change => negates the last assistant deltas", async () => {
    const history: ChatMessage[] = [
      {
        id: "a1",
        role: "assistant",
        content: "Sharpened your jawline.",
        timestamp: 1,
        featureDeltas: { jawline: -0.5 },
      },
    ];

    const result = await chatToFeatures(
      "undo",
      createDefaultFeatureValues(),
      history,
      {
        invoker: mockInvoker({
          intent: "undo",
          featureDeltas: {},
          explanation: "Reverted your last change.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("undo");
    // The undo path negates the last assistant's deltas, so jawline -0.5 -> +0.5
    expect(result.featureDeltas.jawline).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// 6. Reset intent
// ---------------------------------------------------------------------------
describe("chatBridgeEval — reset intent", () => {
  test("'reset' zeroes out all current non-zero features", async () => {
    const current: FeatureValues = {
      ...createDefaultFeatureValues(),
      nose_width: -0.4,
      lip_fullness: 0.6,
      jawline: -0.3,
    };

    const result = await chatToFeatures(
      "reset",
      current,
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "reset",
          featureDeltas: {},
          explanation: "Back to the original photo.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("reset");
    expect(result.featureDeltas.nose_width).toBeCloseTo(0.4);
    expect(result.featureDeltas.lip_fullness).toBeCloseTo(-0.6);
    expect(result.featureDeltas.jawline).toBeCloseTo(0.3);
  });

  test("'start over from scratch' triggers a reset plan", async () => {
    const current: FeatureValues = {
      ...createDefaultFeatureValues(),
      cheek_fullness: 0.5,
      brow_lift: 0.25,
    };

    const result = await chatToFeatures(
      "start over from scratch",
      current,
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "reset",
          featureDeltas: {},
          explanation: "Cleared every adjustment.",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("reset");
    expect(result.featureDeltas.cheek_fullness).toBeCloseTo(-0.5);
    expect(result.featureDeltas.brow_lift).toBeCloseTo(-0.25);
  });
});

// ---------------------------------------------------------------------------
// 7. Ambiguous / clarify
// ---------------------------------------------------------------------------
describe("chatBridgeEval — ambiguous / clarify", () => {
  test("'fix it' => clarify (unknown type)", async () => {
    const result = await chatToFeatures(
      "fix it",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "clarify",
          featureDeltas: {},
          explanation: "What would you like to change — nose, lips, jaw?",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("unknown");
    expect(result.responseText.length).toBeGreaterThan(0);
  });

  test("'make me prettier' => clarify (unknown type)", async () => {
    const result = await chatToFeatures(
      "make me prettier",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "clarify",
          featureDeltas: {},
          explanation: "Could you point me at a feature? Lips, eyes, jaw?",
          shouldInvokeAiImage: false,
        }),
      },
    );

    expect(result.type).toBe("unknown");
    expect(result.responseText.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Skin / AI-only
// ---------------------------------------------------------------------------
describe("chatBridgeEval — skin / AI-only", () => {
  test("'smoother skin please' => positive skin_smoothness, shouldInvokeAiImage=true", async () => {
    const result = await chatToFeatures(
      "smoother skin please",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { skin_smoothness: 0.55 },
          explanation: "Softened your skin texture.",
          shouldInvokeAiImage: true,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.skin_smoothness).toBeGreaterThan(0);
    expect(result.shouldInvokeAiImage).toBe(true);
  });

  test("'firmer skin' => positive skin_firmness", async () => {
    const result = await chatToFeatures(
      "firmer skin",
      createDefaultFeatureValues(),
      emptyHistory,
      {
        invoker: mockInvoker({
          intent: "adjustment",
          featureDeltas: { skin_firmness: 0.5 },
          explanation: "Tightened your skin.",
          shouldInvokeAiImage: true,
        }),
      },
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.skin_firmness).toBeGreaterThan(0);
    expect(result.shouldInvokeAiImage).toBe(true);
  });
});
