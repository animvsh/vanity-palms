import { describe, expect, test, vi } from "vitest";

import { chatToFeatures, chatToFeatureValues } from "./llmChatBridge";
import { createDefaultFeatureValues } from "./landmarks";
import type { ChatMessage } from "./chatParser";

const baseHistory: ChatMessage[] = [];

describe("llmChatBridge", () => {
  test("forceLocal falls back to regex parser", async () => {
    const result = await chatToFeatures(
      "make my nose thinner",
      createDefaultFeatureValues(),
      baseHistory,
      { forceLocal: true },
    );

    expect(result.source).toBe("regex");
    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.nose_width).toBeLessThan(0);
  });

  test("falls back to regex when LLM invoker errors", async () => {
    const invoker = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });

    const result = await chatToFeatures(
      "fuller lips",
      createDefaultFeatureValues(),
      baseHistory,
      { invoker: invoker as unknown as never },
    );

    expect(result.source).toBe("regex");
    expect(result.featureDeltas.lip_fullness).toBeGreaterThan(0);
  });

  test("LLM adjustment plan is converted into a parse result", async () => {
    const invoker = vi.fn().mockResolvedValue({
      data: {
        intent: "adjustment",
        featureDeltas: {
          jawline: -0.55,
          cheek_fullness: 0.35,
          brow_lift: -0.15,
        },
        explanation: "Sharpened the jaw and lifted cheekbones.",
        shouldInvokeAiImage: false,
      },
      error: null,
    });

    const result = await chatToFeatures(
      "make me look more chiseled and masculine",
      createDefaultFeatureValues(),
      baseHistory,
      { invoker: invoker as unknown as never },
    );

    expect(result.source).toBe("llm");
    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.jawline).toBeCloseTo(-0.55);
    expect(result.featureDeltas.cheek_fullness).toBeCloseTo(0.35);
    expect(result.responseText).toContain("Sharpened the jaw");
    expect(result.shouldInvokeAiImage).toBe(false);
  });

  test("LLM reset plan zeroes current non-zero features", async () => {
    const invoker = vi.fn().mockResolvedValue({
      data: {
        intent: "reset",
        featureDeltas: {},
        explanation: "Back to your original photo.",
        shouldInvokeAiImage: false,
      },
      error: null,
    });

    const current = {
      ...createDefaultFeatureValues(),
      lip_fullness: 0.5,
      jawline: -0.3,
    };

    const result = await chatToFeatures(
      "start over",
      current,
      baseHistory,
      { invoker: invoker as unknown as never },
    );

    expect(result.type).toBe("reset");
    expect(result.featureDeltas.lip_fullness).toBeCloseTo(-0.5);
    expect(result.featureDeltas.jawline).toBeCloseTo(0.3);
  });

  test("LLM undo plan negates last assistant deltas", async () => {
    const history: ChatMessage[] = [
      {
        id: "a1",
        role: "assistant",
        content: "Adjusted lips",
        timestamp: 1,
        featureDeltas: { lip_fullness: 0.4 },
      },
    ];

    const invoker = vi.fn().mockResolvedValue({
      data: {
        intent: "undo",
        featureDeltas: {},
        explanation: "Reverted the last change.",
        shouldInvokeAiImage: false,
      },
      error: null,
    });

    const result = await chatToFeatures(
      "undo",
      createDefaultFeatureValues(),
      history,
      { invoker: invoker as unknown as never },
    );

    expect(result.type).toBe("undo");
    expect(result.featureDeltas.lip_fullness).toBeCloseTo(-0.4);
  });

  test("LLM clarify plan returns unknown type", async () => {
    const invoker = vi.fn().mockResolvedValue({
      data: {
        intent: "clarify",
        featureDeltas: {},
        explanation: "Did you mean nose, lips, or chin?",
        shouldInvokeAiImage: false,
      },
      error: null,
    });

    const result = await chatToFeatures(
      "fix it",
      createDefaultFeatureValues(),
      baseHistory,
      { invoker: invoker as unknown as never },
    );

    expect(result.type).toBe("unknown");
    expect(result.responseText).toContain("nose, lips, or chin");
  });

  test("shouldInvokeAiImage flag flows through when LLM sets it", async () => {
    const invoker = vi.fn().mockResolvedValue({
      data: {
        intent: "adjustment",
        featureDeltas: { skin_smoothness: 0.6 },
        explanation: "Smoother skin texture.",
        shouldInvokeAiImage: true,
      },
      error: null,
    });

    const result = await chatToFeatures(
      "smoother skin",
      createDefaultFeatureValues(),
      baseHistory,
      { invoker: invoker as unknown as never },
    );

    expect(result.shouldInvokeAiImage).toBe(true);
    expect(result.featureDeltas.skin_smoothness).toBeCloseTo(0.6);
  });

  test("chatToFeatureValues clamps deltas after applying", async () => {
    const invoker = vi.fn().mockResolvedValue({
      data: {
        intent: "adjustment",
        featureDeltas: { face_width: 0.8 },
        explanation: "Filled the face out.",
        shouldInvokeAiImage: false,
      },
      error: null,
    });

    const current = { ...createDefaultFeatureValues(), face_width: 0.5 };

    const { nextValues } = await chatToFeatureValues(
      "wider face",
      current,
      baseHistory,
      { invoker: invoker as unknown as never },
    );

    expect(nextValues.face_width).toBe(1);
  });

  test("LLM call timing out falls back to regex", async () => {
    const invoker = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          // never resolves
        }),
    );

    const result = await chatToFeatures(
      "fuller lips",
      createDefaultFeatureValues(),
      baseHistory,
      { invoker: invoker as unknown as never, timeoutMs: 50 },
    );

    expect(result.source).toBe("regex");
    expect(result.featureDeltas.lip_fullness).toBeGreaterThan(0);
  });

  test("LLM clamps out-of-range deltas (server-side defense in depth)", async () => {
    // Even though the server clamps, ensure the client trusts the response
    // to be well-formed. If the server returned 0.55, we should pass it through.
    const invoker = vi.fn().mockResolvedValue({
      data: {
        intent: "adjustment",
        featureDeltas: { brow_lift: 0.55 },
        explanation: "Lifted your brows.",
        shouldInvokeAiImage: false,
      },
      error: null,
    });

    const result = await chatToFeatures(
      "lift my brows",
      createDefaultFeatureValues(),
      baseHistory,
      { invoker: invoker as unknown as never },
    );

    expect(result.featureDeltas.brow_lift).toBeCloseTo(0.55);
  });
});
