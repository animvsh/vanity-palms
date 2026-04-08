import { describe, expect, test } from "vitest";

import {
  applyDeltas,
  parseUserMessage,
  type ChatMessage,
} from "@/visualizer/chatParser";
import { createDefaultFeatureValues } from "@/visualizer/landmarks";

describe("chatParser", () => {
  test("parses a common nose refinement request", () => {
    const result = parseUserMessage(
      "make my nose thinner",
      createDefaultFeatureValues(),
      [],
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.nose_width).toBeLessThan(0);
  });

  test("parses reset against current values", () => {
    const current = { ...createDefaultFeatureValues(), lip_fullness: 0.4 };
    const result = parseUserMessage("reset", current, []);

    expect(result.type).toBe("reset");
    expect(result.featureDeltas.lip_fullness).toBeCloseTo(-0.4);
  });

  test("uses prior assistant delta for relative follow-up", () => {
    const history: ChatMessage[] = [
      {
        id: "a1",
        role: "assistant",
        content: "Adjusted nose",
        timestamp: 1,
        featureDeltas: { nose_width: -0.5 },
      },
    ];

    const result = parseUserMessage("more", createDefaultFeatureValues(), history);

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.nose_width).toBeLessThan(0);
  });

  test("undo negates the last assistant delta", () => {
    const history: ChatMessage[] = [
      {
        id: "a1",
        role: "assistant",
        content: "Adjusted lips",
        timestamp: 1,
        featureDeltas: { lip_fullness: 0.25 },
      },
    ];

    const result = parseUserMessage("undo", createDefaultFeatureValues(), history);

    expect(result.type).toBe("undo");
    expect(result.featureDeltas.lip_fullness).toBeCloseTo(-0.25);
  });

  test("applyDeltas clamps values to valid range", () => {
    const current = { ...createDefaultFeatureValues(), face_width: 0.9 };
    const updated = applyDeltas(current, { face_width: 0.5, brow_lift: -2 });

    expect(updated.face_width).toBe(1);
    expect(updated.brow_lift).toBe(-1);
  });

  test("parses multiple features in one message", () => {
    const result = parseUserMessage(
      "thinner nose and fuller lips",
      createDefaultFeatureValues(),
      [],
    );

    expect(result.type).toBe("adjustment");
    expect(result.featureDeltas.nose_width).toBeLessThan(0);
    expect(result.featureDeltas.lip_fullness).toBeGreaterThan(0);
  });

  test("'a bit less' decreases last feature in same direction", () => {
    const history: ChatMessage[] = [
      {
        id: "a1",
        role: "assistant",
        content: "Adjusted jawline",
        timestamp: 1,
        featureDeltas: { jawline: -0.5 },
      },
    ];

    const result = parseUserMessage("a bit less", createDefaultFeatureValues(), history);

    expect(result.type).toBe("adjustment");
    // "less" after narrowing jaw should widen it (positive delta)
    expect(result.featureDeltas.jawline).toBeGreaterThan(0);
  });

  test("returns helpful suggestions for unrecognized input mentioning a body part", () => {
    const result = parseUserMessage(
      "fix my nose please",
      createDefaultFeatureValues(),
      [],
    );

    // "fix my nose" doesn't match any specific pattern — should suggest nose alternatives
    expect(result.type).toBe("unknown");
    expect(result.responseText).toContain("nose");
  });

  test("returns generic suggestions for completely unrelated input", () => {
    const result = parseUserMessage(
      "pizza delivery",
      createDefaultFeatureValues(),
      [],
    );

    expect(result.type).toBe("unknown");
    expect(result.responseText).toContain("Thinner nose");
  });

  test("undo with no prior changes returns helpful message", () => {
    const result = parseUserMessage("undo", createDefaultFeatureValues(), []);

    expect(result.type).toBe("undo");
    expect(Object.keys(result.featureDeltas)).toHaveLength(0);
    expect(result.responseText).toContain("Nothing to undo");
  });

  test("magnitude modifiers affect delta size", () => {
    const subtle = parseUserMessage(
      "slightly thinner nose",
      createDefaultFeatureValues(),
      [],
    );
    const dramatic = parseUserMessage(
      "very much thinner nose",
      createDefaultFeatureValues(),
      [],
    );

    expect(subtle.featureDeltas.nose_width).toBeDefined();
    expect(dramatic.featureDeltas.nose_width).toBeDefined();
    // Dramatic should have larger absolute delta
    expect(
      Math.abs(dramatic.featureDeltas.nose_width!),
    ).toBeGreaterThan(Math.abs(subtle.featureDeltas.nose_width!));
  });
});
