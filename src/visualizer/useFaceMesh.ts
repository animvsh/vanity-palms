import { useCallback, useEffect, useRef, useState } from "react";
import type { Landmark } from "./landmarks";

interface FaceMeshResult {
  landmarks: Landmark[] | null;
  loading: boolean;
  error: string | null;
  detect: (image: HTMLImageElement | HTMLCanvasElement) => Promise<Landmark[] | null>;
}

/**
 * Hook that lazily loads MediaPipe FaceLandmarker (tasks-vision) and runs
 * detection on demand. Tries GPU first with CPU fallback.
 * Properly cleans up WASM resources on unmount.
 */
export function useFaceMesh(): FaceMeshResult {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const detectingRef = useRef(false);

  // Cleanup on unmount — release WASM heap and WebGL context
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch { /* already closed */ }
        landmarkerRef.current = null;
      }
      initPromiseRef.current = null;
    };
  }, []);

  const ensureInit = useCallback(async () => {
    if (landmarkerRef.current) return;
    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return;
    }

    initPromiseRef.current = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );

      // Pin WASM version to match the npm package
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm",
      );

      const options = {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU" as "GPU" | "CPU",
        },
        runningMode: "IMAGE" as const,
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      };

      // Try GPU first, fall back to CPU
      try {
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, options);
      } catch {
        options.baseOptions.delegate = "CPU" as const;
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, options);
      }
    })().catch((err) => {
      // Clear the promise so the next call can retry
      initPromiseRef.current = null;
      throw err;
    });

    await initPromiseRef.current;
  }, []);

  const detect = useCallback(
    async (
      image: HTMLImageElement | HTMLCanvasElement,
    ): Promise<Landmark[] | null> => {
      if (detectingRef.current) return null;
      detectingRef.current = true;
      setError(null);

      // Only show loading spinner if we need to initialize
      if (!landmarkerRef.current) {
        setLoading(true);
      }

      try {
        await ensureInit();
        if (!mountedRef.current) return null;
        const landmarker = landmarkerRef.current;
        if (!landmarker) throw new Error("FaceLandmarker failed to initialize");

        const result = landmarker.detect(image);

        if (!mountedRef.current) return null;

        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          const detected = result.faceLandmarks[0] as Landmark[];
          setLandmarks(detected);
          setLoading(false);
          return detected;
        }

        setError("No face detected. Please try a clearer photo.");
        setLandmarks(null);
        setLoading(false);
        return null;
      } catch (err: unknown) {
        if (!mountedRef.current) return null;
        const message =
          err instanceof Error ? err.message : "Face detection failed";
        setError(message);
        setLoading(false);
        return null;
      } finally {
        detectingRef.current = false;
      }
    },
    [ensureInit],
  );

  return { landmarks, loading, error, detect };
}
