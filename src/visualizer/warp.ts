import type { Landmark, FeatureValues } from "./landmarks";
import { getTransformations, FEATURES } from "./landmarks";

/**
 * Moving Least Squares (MLS) image warping.
 *
 * Given source landmarks, target landmarks (shifted), and an image,
 * produces a warped image on a canvas. Uses the rigid MLS variant
 * from Schaefer et al. 2006 for natural-looking deformations.
 */

interface Point {
  x: number;
  y: number;
}

/** Maximum working dimension — larger images are downscaled before warping */
const MAX_WARP_DIMENSION = 1920;

/**
 * Compute the target landmark positions given feature values.
 */
export function computeTargetLandmarks(
  sourceLandmarks: Landmark[],
  featureValues: FeatureValues,
  imageWidth: number,
  imageHeight: number,
): Point[] {
  // Start with a copy of source positions in pixel space
  const targets: Point[] = sourceLandmarks.map((l) => ({
    x: l.x * imageWidth,
    y: l.y * imageHeight,
  }));

  // Accumulate shifts from each active feature
  for (const feature of FEATURES) {
    const intensity = featureValues[feature.id];
    if (Math.abs(intensity) < 0.01) continue;

    const transforms = getTransformations(feature.id, intensity);
    for (const t of transforms) {
      for (const idx of t.landmarks) {
        if (idx < targets.length) {
          targets[idx] = {
            x: targets[idx].x + t.dx * imageWidth,
            y: targets[idx].y + t.dy * imageHeight,
          };
        }
      }
    }
  }

  return targets;
}

/**
 * Get the working dimensions for the warp (capped to MAX_WARP_DIMENSION).
 */
function getWorkingDimensions(
  image: HTMLImageElement | HTMLCanvasElement,
): { w: number; h: number; scale: number } {
  const nw = image instanceof HTMLImageElement
    ? (image.naturalWidth || image.width)
    : image.width;
  const nh = image instanceof HTMLImageElement
    ? (image.naturalHeight || image.height)
    : image.height;

  const maxDim = Math.max(nw, nh);
  if (maxDim <= MAX_WARP_DIMENSION) {
    return { w: nw, h: nh, scale: 1 };
  }
  const scale = MAX_WARP_DIMENSION / maxDim;
  return {
    w: Math.round(nw * scale),
    h: Math.round(nh * scale),
    scale,
  };
}

function createSrcCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/**
 * Render a warped image onto an output canvas using a simplified MLS approach.
 * Uses a grid-based interpolation for performance. Images larger than
 * MAX_WARP_DIMENSION are downscaled before warping.
 */
export function renderWarpedImage(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  sourceLandmarks: Landmark[],
  featureValues: FeatureValues,
  outputCanvas: HTMLCanvasElement,
): void {
  const { w, h } = getWorkingDimensions(sourceImage);

  outputCanvas.width = w;
  outputCanvas.height = h;

  const ctx = outputCanvas.getContext("2d");
  if (!ctx) return;

  // Check if any features are active
  const hasActiveFeatures = FEATURES.some(
    (f) => Math.abs(featureValues[f.id]) > 0.01,
  );

  if (!hasActiveFeatures) {
    ctx.drawImage(sourceImage, 0, 0, w, h);
    return;
  }

  // Compute target positions
  const sourcePoints: Point[] = sourceLandmarks.map((l) => ({
    x: l.x * w,
    y: l.y * h,
  }));
  const targetPoints = computeTargetLandmarks(
    sourceLandmarks,
    featureValues,
    w,
    h,
  );

  // Find which landmarks actually moved
  const movedIndices: number[] = [];
  for (let i = 0; i < sourcePoints.length; i++) {
    const dx = targetPoints[i].x - sourcePoints[i].x;
    const dy = targetPoints[i].y - sourcePoints[i].y;
    if (dx * dx + dy * dy > 0.25) {
      movedIndices.push(i);
    }
  }

  if (movedIndices.length === 0) {
    ctx.drawImage(sourceImage, 0, 0, w, h);
    return;
  }

  // Get source image data
  const srcCanvas = createSrcCanvas(w, h);
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) return;
  srcCtx.drawImage(sourceImage, 0, 0, w, h);
  const srcData = srcCtx.getImageData(0, 0, w, h);

  const outData = ctx.createImageData(w, h);

  // Grid-based MLS: compute displacement on a coarse grid, then bilinear interpolate
  const GRID_SIZE = 8;
  const gridW = Math.ceil(w / GRID_SIZE) + 1;
  const gridH = Math.ceil(h / GRID_SIZE) + 1;

  // Precompute displacement at grid vertices using MLS
  const dispX = new Float32Array(gridW * gridH);
  const dispY = new Float32Array(gridW * gridH);

  const alpha = 1.5; // Weight falloff exponent

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const px = gx * GRID_SIZE;
      const py = gy * GRID_SIZE;

      let sumWx = 0;
      let sumWy = 0;
      let sumW = 0;

      for (const idx of movedIndices) {
        const tx = targetPoints[idx].x;
        const ty = targetPoints[idx].y;
        const sx = sourcePoints[idx].x;
        const sy = sourcePoints[idx].y;

        const ddx = tx - px;
        const ddy = ty - py;
        const dist2 = ddx * ddx + ddy * ddy;

        if (dist2 < 0.01) {
          // Very close to this target point — map directly to source
          sumWx = sx - px;
          sumWy = sy - py;
          sumW = 1;
          break;
        }

        const weight = 1.0 / Math.pow(dist2, alpha / 2);
        sumWx += weight * (sx - tx);
        sumWy += weight * (sy - ty);
        sumW += weight;
      }

      const gi = gy * gridW + gx;
      if (sumW > 0) {
        dispX[gi] = sumWx / sumW;
        dispY[gi] = sumWy / sumW;
      }
    }
  }

  // For each output pixel, bilinear interpolate displacement from grid
  for (let y = 0; y < h; y++) {
    const gy = y / GRID_SIZE;
    const gy0 = Math.floor(gy);
    const gy1 = Math.min(gy0 + 1, gridH - 1);
    const fy = gy - gy0;

    for (let x = 0; x < w; x++) {
      const gx = x / GRID_SIZE;
      const gx0 = Math.floor(gx);
      const gx1 = Math.min(gx0 + 1, gridW - 1);
      const fx = gx - gx0;

      // Bilinear interpolation of displacement
      const i00 = gy0 * gridW + gx0;
      const i10 = gy0 * gridW + gx1;
      const i01 = gy1 * gridW + gx0;
      const i11 = gy1 * gridW + gx1;

      const dx =
        dispX[i00] * (1 - fx) * (1 - fy) +
        dispX[i10] * fx * (1 - fy) +
        dispX[i01] * (1 - fx) * fy +
        dispX[i11] * fx * fy;

      const dy =
        dispY[i00] * (1 - fx) * (1 - fy) +
        dispY[i10] * fx * (1 - fy) +
        dispY[i01] * (1 - fx) * fy +
        dispY[i11] * fx * fy;

      // Sample from source image at displaced position — clamp at edges
      const sx = Math.max(0, Math.min(w - 1.001, x + dx));
      const sy = Math.max(0, Math.min(h - 1.001, y + dy));

      const sx0 = Math.floor(sx);
      const sy0 = Math.floor(sy);

      const sfx = sx - sx0;
      const sfy = sy - sy0;

      const sx1 = Math.min(sx0 + 1, w - 1);
      const sy1 = Math.min(sy0 + 1, h - 1);

      const outIdx = (y * w + x) * 4;
      const si00 = (sy0 * w + sx0) * 4;
      const si10 = (sy0 * w + sx1) * 4;
      const si01 = (sy1 * w + sx0) * 4;
      const si11 = (sy1 * w + sx1) * 4;

      for (let c = 0; c < 4; c++) {
        outData.data[outIdx + c] = Math.round(
          srcData.data[si00 + c] * (1 - sfx) * (1 - sfy) +
            srcData.data[si10 + c] * sfx * (1 - sfy) +
            srcData.data[si01 + c] * (1 - sfx) * sfy +
            srcData.data[si11 + c] * sfx * sfy,
        );
      }
    }
  }

  ctx.putImageData(outData, 0, 0);
}
