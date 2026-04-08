/**
 * MediaPipe Face Mesh landmark indices grouped by facial feature.
 * Each group maps a feature name to the landmark indices that control it.
 * These are the 468-point canonical face mesh indices.
 */

// Nose bridge and tip
export const NOSE_BRIDGE = [6, 197, 195, 5, 4, 1, 19, 94, 2];
export const NOSE_TIP = [1, 2, 98, 327];
export const NOSE_LEFT_EDGE = [218, 237, 44, 45, 220, 115, 48, 64, 98];
export const NOSE_RIGHT_EDGE = [438, 457, 274, 275, 440, 344, 278, 294, 327];

// Nose bridge split into left and right sides for bilateral narrowing/widening
export const NOSE_BRIDGE_LEFT = [6, 197, 195, 5]; // left-of-center bridge points
export const NOSE_BRIDGE_RIGHT = [4, 1, 19, 94, 2]; // right-of-center bridge points

// Eyebrows
export const LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
export const RIGHT_EYEBROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];

// Eyes
export const LEFT_EYE_UPPER = [246, 161, 160, 159, 158, 157, 173];
export const LEFT_EYE_LOWER = [33, 7, 163, 144, 145, 153, 154, 155, 133];
export const RIGHT_EYE_UPPER = [466, 388, 387, 386, 385, 384, 398];
export const RIGHT_EYE_LOWER = [263, 249, 390, 373, 374, 380, 381, 382, 362];

// Lips
export const UPPER_LIP_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
export const LOWER_LIP_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
export const UPPER_LIP_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
export const LOWER_LIP_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

// Jawline
export const JAWLINE_LEFT = [234, 127, 162, 21, 54, 103, 67, 109, 10];
export const JAWLINE_RIGHT = [454, 356, 389, 251, 284, 332, 297, 338, 10];

// Chin — ordered left-to-right for reliable bilateral splitting
export const CHIN_LEFT = [152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234];
export const CHIN_RIGHT = [377, 400, 378, 379, 365, 397, 288, 361, 323, 454];
export const CHIN = [...CHIN_LEFT, ...CHIN_RIGHT];

// Cheeks
export const LEFT_CHEEK = [123, 50, 36, 137, 205, 206, 207, 216];
export const RIGHT_CHEEK = [352, 280, 266, 366, 425, 426, 427, 436];

// Forehead — actual forehead landmarks (top of face, not jawline)
export const FOREHEAD = [9, 10, 151, 337, 299, 333, 69, 104, 68, 108, 338, 297, 332, 284, 251];

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface TransformDefinition {
  landmarks: number[];
  dx: number;
  dy: number;
}

/**
 * Given a feature name and intensity (-1 to 1), returns the set of
 * landmark shifts needed for that transformation.
 */
export function getTransformations(
  feature: string,
  intensity: number,
): TransformDefinition[] {
  const scale = intensity * 0.015; // max 1.5% of face width per unit

  switch (feature) {
    case "nose_width":
      return [
        { landmarks: NOSE_LEFT_EDGE, dx: scale, dy: 0 },
        { landmarks: NOSE_RIGHT_EDGE, dx: -scale, dy: 0 },
      ];

    case "nose_length":
      return [
        { landmarks: NOSE_TIP, dx: 0, dy: scale },
        { landmarks: [...NOSE_LEFT_EDGE.slice(-3), ...NOSE_RIGHT_EDGE.slice(-3)], dx: 0, dy: scale * 0.5 },
      ];

    case "nose_bridge":
      // Bilateral: left side moves right, right side moves left (narrowing)
      return [
        { landmarks: NOSE_BRIDGE_LEFT, dx: scale * 0.5, dy: 0 },
        { landmarks: NOSE_BRIDGE_RIGHT, dx: -scale * 0.5, dy: 0 },
      ];

    case "brow_lift":
      return [
        { landmarks: LEFT_EYEBROW, dx: 0, dy: -scale },
        { landmarks: RIGHT_EYEBROW, dx: 0, dy: -scale },
      ];

    case "brow_gap":
      return [
        { landmarks: LEFT_EYEBROW.slice(0, 4), dx: scale, dy: 0 },
        { landmarks: RIGHT_EYEBROW.slice(0, 4), dx: -scale, dy: 0 },
      ];

    case "eye_size":
      return [
        { landmarks: LEFT_EYE_UPPER, dx: 0, dy: -scale * 0.5 },
        { landmarks: LEFT_EYE_LOWER, dx: 0, dy: scale * 0.5 },
        { landmarks: RIGHT_EYE_UPPER, dx: 0, dy: -scale * 0.5 },
        { landmarks: RIGHT_EYE_LOWER, dx: 0, dy: scale * 0.5 },
      ];

    case "lip_fullness":
      return [
        { landmarks: UPPER_LIP_OUTER, dx: 0, dy: -scale * 0.4 },
        { landmarks: LOWER_LIP_OUTER, dx: 0, dy: scale * 0.6 },
      ];

    case "lip_width":
      return [
        { landmarks: [...UPPER_LIP_OUTER.slice(0, 2), ...LOWER_LIP_OUTER.slice(0, 2)], dx: -scale, dy: 0 },
        { landmarks: [...UPPER_LIP_OUTER.slice(-2), ...LOWER_LIP_OUTER.slice(-2)], dx: scale, dy: 0 },
      ];

    case "jawline":
      return [
        { landmarks: JAWLINE_LEFT, dx: scale, dy: 0 },
        { landmarks: JAWLINE_RIGHT, dx: -scale, dy: 0 },
      ];

    case "chin_height":
      return [
        { landmarks: CHIN, dx: 0, dy: scale },
      ];

    case "chin_width":
      // Use properly ordered left/right halves
      return [
        { landmarks: CHIN_LEFT, dx: scale, dy: 0 },
        { landmarks: CHIN_RIGHT, dx: -scale, dy: 0 },
      ];

    case "cheek_fullness":
      return [
        { landmarks: LEFT_CHEEK, dx: -scale * 0.7, dy: -scale * 0.3 },
        { landmarks: RIGHT_CHEEK, dx: scale * 0.7, dy: -scale * 0.3 },
      ];

    case "face_width":
      return [
        { landmarks: [...JAWLINE_LEFT, ...LEFT_CHEEK], dx: scale, dy: 0 },
        { landmarks: [...JAWLINE_RIGHT, ...RIGHT_CHEEK], dx: -scale, dy: 0 },
      ];

    case "forehead":
      return [
        { landmarks: FOREHEAD, dx: 0, dy: -scale },
      ];

    default:
      return [];
  }
}

/** All available transformation features with display labels */
export const FEATURES = [
  { id: "nose_width", label: "Nose Width", category: "Nose" },
  { id: "nose_length", label: "Nose Length", category: "Nose" },
  { id: "nose_bridge", label: "Nose Bridge", category: "Nose" },
  { id: "brow_lift", label: "Brow Lift", category: "Eyes" },
  { id: "brow_gap", label: "Brow Spacing", category: "Eyes" },
  { id: "eye_size", label: "Eye Size", category: "Eyes" },
  { id: "lip_fullness", label: "Lip Fullness", category: "Lips" },
  { id: "lip_width", label: "Lip Width", category: "Lips" },
  { id: "jawline", label: "Jawline", category: "Face" },
  { id: "chin_height", label: "Chin Length", category: "Face" },
  { id: "chin_width", label: "Chin Width", category: "Face" },
  { id: "cheek_fullness", label: "Cheekbones", category: "Face" },
  { id: "face_width", label: "Face Width", category: "Face" },
  { id: "forehead", label: "Forehead", category: "Face" },
  { id: "skin_smoothness", label: "Skin Smoothness", category: "Skin" },
  { id: "skin_firmness", label: "Skin Firmness", category: "Skin" },
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];
export type FeatureValues = Record<FeatureId, number>;

export function createDefaultFeatureValues(): FeatureValues {
  return Object.fromEntries(FEATURES.map((f) => [f.id, 0])) as FeatureValues;
}
