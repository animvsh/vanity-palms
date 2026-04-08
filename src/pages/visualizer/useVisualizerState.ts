import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useFaceMesh } from "@/visualizer/useFaceMesh";
import { renderWarpedImage } from "@/visualizer/warp";
import {
  FEATURES,
  createDefaultFeatureValues,
  type FeatureId,
  type FeatureValues,
  type Landmark,
} from "@/visualizer/landmarks";
import {
  parseUserMessage,
  applyDeltas,
  type ChatMessage,
  type ParseResult,
} from "@/visualizer/chatParser";
import {
  generateAIVisualization,
  buildTransformationPrompt,
  imageToBase64,
  base64ToDataUrl,
} from "@/visualizer/aiPipeline";
import type { PhotoSet } from "@/components/PhotoUploadWizard";
import type { HistoryEntry } from "./types";

// ── Constants ─────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function useVisualizerState() {
  // Wizard state
  const [wizardComplete, setWizardComplete] = useState(false);

  // Image state
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const imageUrlRef = useRef<string | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);

  // Feature values & history
  const [featureValues, setFeatureValues] = useState<FeatureValues>(
    createDefaultFeatureValues(),
  );
  const featureValuesRef = useRef(featureValues);
  featureValuesRef.current = featureValues;
  const historyRef = useRef<HistoryEntry[]>([
    { featureValues: createDefaultFeatureValues() },
  ]);
  const historyIndexRef = useRef(0);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Upload a photo to get started. Once I detect your face, describe what you'd like to change \u2014 like \"make my nose thinner\" or \"lift my brows\" \u2014 and I'll show you a preview instantly.",
      timestamp: Date.now(),
    },
  ]);
  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const [chatInput, setChatInput] = useState("");
  const [showTyping, setShowTyping] = useState(false);

  // Chat input history (up-arrow recall)
  const chatInputRef = useRef("");
  const inputHistoryRef = useRef<string[]>([]);
  const inputHistoryIndexRef = useRef(-1);

  // AI state
  const [aiMode, setAiMode] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
  const aiResultActive = useRef(false);
  const [aiStrength, setAiStrength] = useState(0.4);

  // UI state
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [isDragging, setIsDragging] = useState(false);
  const compareDragging = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wizardPhotosRef = useRef<PhotoSet | null>(null);

  // Refs
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const comparePositionRef = useRef(50);

  // Face mesh
  const { loading: meshLoading, error: meshError, detect } = useFaceMesh();

  // ── Helper: push history entry ────────────────────────────

  const pushHistory = useCallback((entry: HistoryEntry) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(entry);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setHistoryIndex(newHistory.length - 1);
  }, []);

  // ── Render warped image whenever features change ─────────

  const renderOutput = useCallback(() => {
    if (!sourceImage || !landmarks || !outputCanvasRef.current) return;
    if (aiResultActive.current) return;
    renderWarpedImage(sourceImage, landmarks, featureValues, outputCanvasRef.current);
  }, [sourceImage, landmarks, featureValues]);

  useEffect(() => {
    renderOutput();
  }, [renderOutput, showBeforeAfter]);

  // Render "before" canvas (original image)
  useEffect(() => {
    if (!sourceImage || !beforeCanvasRef.current) return;
    const canvas = beforeCanvasRef.current;
    const w = sourceImage.naturalWidth || sourceImage.width;
    const h = sourceImage.naturalHeight || sourceImage.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(sourceImage, 0, 0, w, h);
  }, [sourceImage, showBeforeAfter]);

  // Auto-scroll chat
  useEffect(() => {
    const el = chatEndRef.current;
    if (!el) return;
    const viewport = el.closest("[data-radix-scroll-area-viewport]");
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, [chatMessages, showTyping]);

  // Cleanup blob URLs and timers on unmount
  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // ── File validation ───────────────────────────────────────

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please upload a JPG, PNG, or WebP image.";
    }
    if (file.size === 0) {
      return "This file appears to be empty.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`;
    }
    return null;
  }, []);

  // ── Image upload handler ─────────────────────────────────

  const handleImageUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `sys-${crypto.randomUUID()}`,
            role: "assistant",
            content: validationError,
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      imageUrlRef.current = url;

      const analyzingId = `analyzing-${crypto.randomUUID()}`;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        setSourceImage(img);
        setChatMessages((prev) => [
          ...prev,
          {
            id: analyzingId,
            role: "assistant",
            content: "Analyzing your photo...",
            timestamp: Date.now(),
          },
        ]);

        const detected = await detect(img);
        if (detected) {
          setLandmarks(detected);
          setChatMessages((prev) => [
            ...prev.filter((m) => m.id !== analyzingId),
            {
              id: `sys-${crypto.randomUUID()}`,
              role: "assistant",
              content:
                "Face detected! Now describe what you'd like to change. For example:\n\n\u2022 \"Make my nose thinner\"\n\u2022 \"Lift my brows\"\n\u2022 \"Fuller lips\"\n\u2022 \"Sharpen my jawline\"\n\u2022 \"Slim my face\"\n\nOr use the Sliders tab for manual control.",
              timestamp: Date.now(),
            },
          ]);
        } else {
          setChatMessages((prev) => [
            ...prev.filter((m) => m.id !== analyzingId),
            {
              id: `sys-${crypto.randomUUID()}`,
              role: "assistant",
              content:
                "I couldn't detect a face in this photo. Please try a clear, front-facing portrait with good lighting.",
              timestamp: Date.now(),
            },
          ]);
        }
      };
      img.onerror = () => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `sys-${crypto.randomUUID()}`,
            role: "assistant",
            content: "Could not load this image. Please try a different file.",
            timestamp: Date.now(),
          },
        ]);
      };
      img.src = url;
    },
    [detect, validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload],
  );

  // ── Feature value changes (from sliders) ─────────────────

  const sliderDragRef = useRef(false);

  const handleFeatureChange = useCallback(
    (featureId: FeatureId, value: number) => {
      aiResultActive.current = false;
      setAiResultUrl(null);
      sliderDragRef.current = true;
      setFeatureValues((prev) => ({ ...prev, [featureId]: value }));
    },
    [],
  );

  const handleFeatureCommit = useCallback(
    (featureId: FeatureId, value: number) => {
      if (!sliderDragRef.current) return;
      sliderDragRef.current = false;
      setFeatureValues((prev) => {
        const next = { ...prev, [featureId]: value };
        pushHistory({ featureValues: next });
        return next;
      });
    },
    [pushHistory],
  );

  // ── Undo / Reset ─────────────────────────────────────────

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const newIndex = historyIndexRef.current - 1;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    setFeatureValues(historyRef.current[newIndex].featureValues);
    aiResultActive.current = false;
    setAiResultUrl(null);
  }, []);

  const handleReset = useCallback(() => {
    const defaultValues = createDefaultFeatureValues();
    setFeatureValues(defaultValues);
    pushHistory({ featureValues: defaultValues, message: "Reset all" });
    aiResultActive.current = false;
    setAiResultUrl(null);
  }, [pushHistory]);

  // ── AI Generation ───────────────────────────────────────

  const handleAIGenerate = useCallback(
    async (description: string) => {
      if (!sourceImage || aiGenerating) return;

      setAiGenerating(true);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-progress-${crypto.randomUUID()}`,
          role: "assistant",
          content: "Working on your AI visualization \u2014 this usually takes 10-30 seconds...",
          timestamp: Date.now(),
        },
      ]);

      try {
        const { prompt } = buildTransformationPrompt(description, aiStrength);
        const base64 = imageToBase64(sourceImage);
        const result = await generateAIVisualization({
          sourceImageBase64: base64,
          prompt,
          strength: aiStrength,
        });

        const resultUrl = base64ToDataUrl(result.resultImageBase64);
        setAiResultUrl(resultUrl);
        aiResultActive.current = true;

        const img = new Image();
        img.onload = () => {
          if (outputCanvasRef.current) {
            const canvas = outputCanvasRef.current;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.drawImage(img, 0, 0);
          }
        };
        img.onerror = () => {
          aiResultActive.current = false;
        };
        img.src = resultUrl;

        setChatMessages((prev) => [
          ...prev.filter((m) => !m.id.startsWith("ai-progress-")),
          {
            id: `asst-${crypto.randomUUID()}`,
            role: "assistant",
            content: `Here's your AI-enhanced preview! Use the compare button to see before & after, or describe another change you'd like.`,
            timestamp: Date.now(),
          },
        ]);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "AI generation failed";
        setChatMessages((prev) => [
          ...prev.filter((m) => !m.id.startsWith("ai-progress-")),
          {
            id: `asst-${crypto.randomUUID()}`,
            role: "assistant",
            content: `The AI model couldn't process that right now \u2014 ${message}.\n\nYour instant preview is still showing above. Try again or use the sliders for manual control.`,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setAiGenerating(false);
      }
    },
    [sourceImage, aiStrength, aiGenerating],
  );

  // ── Chat send ────────────────────────────────────────────

  const handleSendMessage = useCallback(
    (overrideText?: string) => {
      const text = (overrideText ?? chatInputRef.current).trim();
      if (!text || showTyping || aiGenerating) return;

      inputHistoryRef.current.push(text);
      inputHistoryIndexRef.current = -1;

      const userMsg: ChatMessage = {
        id: `user-${crypto.randomUUID()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      setChatInput("");
      chatInputRef.current = "";

      if (!landmarks && !sourceImage) {
        setChatMessages((prev) => [
          ...prev,
          userMsg,
          {
            id: `asst-${crypto.randomUUID()}`,
            role: "assistant",
            content: "Upload a photo first and I'll get started! I need a clear, front-facing portrait to work with.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      setChatMessages((prev) => [...prev, userMsg]);
      setShowTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
        setShowTyping(false);

        if (landmarks) {
          const currentFV = featureValuesRef.current;
          const result: ParseResult = parseUserMessage(text, currentFV, chatMessagesRef.current);

          const assistantMsg: ChatMessage = {
            id: `asst-${crypto.randomUUID()}`,
            role: "assistant",
            content: result.responseText,
            timestamp: Date.now(),
            featureDeltas: result.featureDeltas,
          };

          setChatMessages((prev) => [...prev, assistantMsg]);

          if (result.type === "reset") {
            handleReset();
          } else if (
            result.type === "adjustment" ||
            result.type === "undo"
          ) {
            aiResultActive.current = false;
            setAiResultUrl(null);
            const newValues = applyDeltas(currentFV, result.featureDeltas);
            setFeatureValues(newValues);
            pushHistory({ featureValues: newValues, message: text });
          }

          if (aiMode && (result.type === "adjustment" || result.type === "unknown")) {
            handleAIGenerate(text);
          }
        } else {
          if (aiMode) {
            handleAIGenerate(text);
          } else {
            setChatMessages((prev) => [
              ...prev,
              {
                id: `asst-${crypto.randomUUID()}`,
                role: "assistant",
                content: "I couldn't detect facial landmarks in this photo. Try enabling AI mode (the sparkle button in the toolbar) for AI-powered editing, or upload a clearer front-facing photo.",
                timestamp: Date.now(),
              },
            ]);
          }
        }
      }, 300);
    },
    [showTyping, aiGenerating, landmarks, sourceImage, handleReset, aiMode, handleAIGenerate, pushHistory],
  );

  // ── Download result ──────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!outputCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = "vanity-palm-visualization.png";
    link.href = outputCanvasRef.current.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // ── Before/After compare drag (pointer capture) ──────────

  const handleComparePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!showBeforeAfter || !compareRef.current) return;
      compareDragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const rect = compareRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(0, Math.min(100, x));
      comparePositionRef.current = clamped;
      setComparePosition(clamped);
    },
    [showBeforeAfter],
  );

  const handleComparePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!compareDragging.current || !compareRef.current) return;
      const rect = compareRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(0, Math.min(100, x));
      comparePositionRef.current = clamped;
      setComparePosition(clamped);
    },
    [],
  );

  const handleComparePointerUp = useCallback(() => {
    compareDragging.current = false;
  }, []);

  // ── Keyboard input history (up/down arrow) ───────────────

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const hist = inputHistoryRef.current;
      if (e.key === "ArrowUp" && hist.length > 0) {
        e.preventDefault();
        const idx =
          inputHistoryIndexRef.current === -1
            ? hist.length - 1
            : Math.max(0, inputHistoryIndexRef.current - 1);
        inputHistoryIndexRef.current = idx;
        setChatInput(hist[idx]);
        chatInputRef.current = hist[idx];
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (inputHistoryIndexRef.current === -1) return;
        const idx = inputHistoryIndexRef.current + 1;
        if (idx >= hist.length) {
          inputHistoryIndexRef.current = -1;
          setChatInput("");
          chatInputRef.current = "";
        } else {
          inputHistoryIndexRef.current = idx;
          setChatInput(hist[idx]);
          chatInputRef.current = hist[idx];
        }
      }
    },
    [],
  );

  // ── Check if any features are active ─────────────────────

  const hasChanges = useMemo(
    () => FEATURES.some((f) => Math.abs(featureValues[f.id]) > 0.01),
    [featureValues],
  );

  // ── Dynamic suggestion chips ─────────────────────────────

  const suggestions = useMemo(() => {
    const all = [
      "Thinner nose",
      "Lift brows",
      "Fuller lips",
      "Sharp jawline",
      "Slim face",
      "Bigger eyes",
      "Higher cheekbones",
      "Nose bridge",
    ];
    return all.filter((s) => {
      const lower = s.toLowerCase();
      if (lower.includes("nose") && Math.abs(featureValues.nose_width) > 0.7) return false;
      if (lower.includes("brow") && Math.abs(featureValues.brow_lift) > 0.7) return false;
      if (lower.includes("lip") && Math.abs(featureValues.lip_fullness) > 0.7) return false;
      if (lower.includes("jaw") && Math.abs(featureValues.jawline) > 0.7) return false;
      if (lower.includes("slim") && Math.abs(featureValues.face_width) > 0.7) return false;
      if (lower.includes("eye") && Math.abs(featureValues.eye_size) > 0.7) return false;
      if (lower.includes("cheek") && Math.abs(featureValues.cheek_fullness) > 0.7) return false;
      if (lower.includes("bridge") && Math.abs(featureValues.nose_bridge) > 0.7) return false;
      return true;
    }).slice(0, 5);
  }, [featureValues]);

  // ── New photo reset ──────────────────────────────────────

  const handleNewPhoto = useCallback(() => {
    if (wizardPhotosRef.current) {
      const photos = wizardPhotosRef.current;
      for (const entry of Object.values(photos)) {
        if (entry && typeof entry === "object" && "objectUrl" in entry) {
          const photoEntry = entry as { objectUrl: string };
          if (photoEntry.objectUrl) {
            URL.revokeObjectURL(photoEntry.objectUrl);
          }
        }
      }
      wizardPhotosRef.current = null;
    }
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    setSourceImage(null);
    setLandmarks(null);
    setFeatureValues(createDefaultFeatureValues());
    historyRef.current = [{ featureValues: createDefaultFeatureValues() }];
    historyIndexRef.current = 0;
    setHistoryIndex(0);
    setAiResultUrl(null);
    aiResultActive.current = false;
    setWizardComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── Chat input change handler ────────────────────────────

  const handleChatInputChange = useCallback((value: string) => {
    setChatInput(value);
    chatInputRef.current = value;
  }, []);

  // ── Wizard complete handler ──────────────────────────────

  const handleWizardComplete = useCallback((photos: PhotoSet) => {
    const frontal = photos.frontal;
    if (!frontal) return;
    wizardPhotosRef.current = photos;
    imageUrlRef.current = frontal.objectUrl;
    setSourceImage(frontal.image);
    setLandmarks(frontal.landmarks);
    setWizardComplete(true);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `sys-${crypto.randomUUID()}`,
        role: "assistant" as const,
        content:
          "Face detected! Now describe what you'd like to change. For example:\n\n\u2022 \"Make my nose thinner\"\n\u2022 \"Lift my brows\"\n\u2022 \"Fuller lips\"\n\u2022 \"Sharpen my jawline\"\n\u2022 \"Slim my face\"\n\nOr use the Sliders tab for manual control.",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  return {
    // State
    wizardComplete,
    sourceImage,
    landmarks,
    featureValues,
    historyIndex,
    chatMessages,
    chatInput,
    showTyping,
    aiMode,
    aiGenerating,
    aiResultUrl,
    aiStrength,
    showBeforeAfter,
    comparePosition,
    activeTab,
    isDragging,
    meshLoading,
    meshError,
    hasChanges,
    suggestions,

    // Refs
    outputCanvasRef,
    beforeCanvasRef,
    fileInputRef,
    chatEndRef,
    compareRef,

    // Setters
    setAiMode,
    setShowBeforeAfter,
    setActiveTab,
    setIsDragging,
    setAiStrength,
    detect,

    // Handlers
    handleImageUpload,
    handleDrop,
    handleFeatureChange,
    handleFeatureCommit,
    handleUndo,
    handleReset,
    handleSendMessage,
    handleDownload,
    handleComparePointerDown,
    handleComparePointerMove,
    handleComparePointerUp,
    handleInputKeyDown,
    handleNewPhoto,
    handleChatInputChange,
    handleWizardComplete,
  };
}
