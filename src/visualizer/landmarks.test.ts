import { describe, expect, test } from "vitest";

import { getTransformations } from "@/visualizer/landmarks";

describe("landmark transformations", () => {
  test("nose bridge transformation is symmetric instead of shifting sideways", () => {
    const transforms = getTransformations("nose_bridge", 1);

    expect(transforms).toHaveLength(2);
    expect(transforms[0].dx).toBeGreaterThan(0);
    expect(transforms[1].dx).toBeLessThan(0);
  });

  test("unknown features return no transforms", () => {
    expect(getTransformations("unknown-feature", 1)).toEqual([]);
  });
});
