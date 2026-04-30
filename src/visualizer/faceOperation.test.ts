import { describe, expect, test, vi, beforeEach } from "vitest";

import { runFaceOperation } from "./faceOperation";

vi.mock("@/lib/supabase", () => {
  const invoke = vi.fn();
  return {
    supabase: { functions: { invoke } },
    supabaseConfigured: true,
  };
});

import { supabase } from "@/lib/supabase";

const invokeMock = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;

describe("runFaceOperation", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  test("enhance: passes model + blend, returns data URL", async () => {
    invokeMock.mockResolvedValue({
      data: { resultBase64: "ABC", mimeType: "image/jpeg" },
      error: null,
    });

    const result = await runFaceOperation({
      type: "enhance",
      imageBase64: "Zm9v",
      model: "codeformer",
      blend: 70,
    });

    expect(invokeMock).toHaveBeenCalledWith("face-operation", {
      body: {
        operation: "enhance",
        imageBase64: "Zm9v",
        model: "codeformer",
        blend: 70,
      },
    });
    expect(result.resultDataUrl).toBe("data:image/jpeg;base64,ABC");
  });

  test("age: passes direction", async () => {
    invokeMock.mockResolvedValue({
      data: { resultBase64: "XYZ" },
      error: null,
    });

    await runFaceOperation({
      type: "age",
      imageBase64: "Zm9v",
      direction: -25,
    });

    expect(invokeMock).toHaveBeenCalledWith("face-operation", {
      body: {
        operation: "age",
        imageBase64: "Zm9v",
        direction: -25,
      },
    });
  });

  test("expression: passes expression label", async () => {
    invokeMock.mockResolvedValue({
      data: { resultBase64: "XYZ" },
      error: null,
    });

    await runFaceOperation({
      type: "expression",
      imageBase64: "Zm9v",
      expression: "laugh",
    });

    expect(invokeMock).toHaveBeenCalledWith("face-operation", {
      body: {
        operation: "expression",
        imageBase64: "Zm9v",
        expression: "laugh",
      },
    });
  });

  test("swap: requires targetBase64", async () => {
    await expect(
      runFaceOperation({
        type: "swap",
        imageBase64: "Zm9v",
      }),
    ).rejects.toThrow(/reference face/i);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  test("swap: passes both images when target provided", async () => {
    invokeMock.mockResolvedValue({
      data: { resultBase64: "OUT" },
      error: null,
    });

    await runFaceOperation({
      type: "swap",
      imageBase64: "user-img",
      targetBase64: "ref-face",
    });

    expect(invokeMock).toHaveBeenCalledWith("face-operation", {
      body: {
        operation: "swap",
        imageBase64: "user-img",
        targetBase64: "ref-face",
      },
    });
  });

  test("propagates edge function error", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "FaceFusion 502" },
    });

    await expect(
      runFaceOperation({ type: "enhance", imageBase64: "Zm9v" }),
    ).rejects.toThrow(/FaceFusion 502/);
  });

  test("rejects when no resultBase64 returned", async () => {
    invokeMock.mockResolvedValue({ data: {}, error: null });

    await expect(
      runFaceOperation({ type: "enhance", imageBase64: "Zm9v" }),
    ).rejects.toThrow(/no image/i);
  });

  test("propagates server-reported error inside data", async () => {
    invokeMock.mockResolvedValue({
      data: { error: "out of GPU memory" },
      error: null,
    });

    await expect(
      runFaceOperation({ type: "enhance", imageBase64: "Zm9v" }),
    ).rejects.toThrow(/out of GPU/);
  });
});
