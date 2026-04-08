import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

let base64ToDataUrl: typeof import("@/visualizer/aiPipeline").base64ToDataUrl;
let buildTransformationPrompt: typeof import("@/visualizer/aiPipeline").buildTransformationPrompt;

beforeAll(async () => {
  const mod = await import("@/visualizer/aiPipeline");
  base64ToDataUrl = mod.base64ToDataUrl;
  buildTransformationPrompt = mod.buildTransformationPrompt;
});

describe("aiPipeline helpers", () => {
  test("buildTransformationPrompt maps common intents to constrained prompts", () => {
    const result = buildTransformationPrompt("make my nose thinner", 0.6);

    expect(result.prompt.toLowerCase()).toContain("nose");
    expect(result.prompt.toLowerCase()).toContain("same person");
  });

  test("base64ToDataUrl preserves an existing data url", () => {
    const input = "data:image/png;base64,abc123";
    expect(base64ToDataUrl(input)).toBe(input);
  });

  test("base64ToDataUrl wraps raw base64 png data", () => {
    expect(base64ToDataUrl("abc123")).toBe("data:image/png;base64,abc123");
  });
});
