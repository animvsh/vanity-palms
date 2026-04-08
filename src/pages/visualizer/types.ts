import type { RefObject } from "react";
import type {
  FeatureId,
  FeatureValues,
  Landmark,
} from "@/visualizer/landmarks";
import type { ChatMessage } from "@/visualizer/chatParser";

export interface HistoryEntry {
  featureValues: FeatureValues;
  message?: string;
}

export interface CanvasDisplayProps {
  sourceImage: HTMLImageElement | null;
  meshLoading: boolean;
  meshError: string | null;
  landmarks: Landmark[] | null;
  aiResultUrl: string | null;
  aiGenerating: boolean;
  showBeforeAfter: boolean;
  comparePosition: number;
  outputCanvasRef: RefObject<HTMLCanvasElement | null>;
  beforeCanvasRef: RefObject<HTMLCanvasElement | null>;
  compareRef: RefObject<HTMLDivElement | null>;
  onComparePointerDown: (e: React.PointerEvent) => void;
  onComparePointerMove: (e: React.PointerEvent) => void;
  onComparePointerUp: () => void;
}

export interface ToolbarControlsProps {
  aiMode: boolean;
  showBeforeAfter: boolean;
  historyIndex: number;
  hasChanges: boolean;
  landmarks: Landmark[] | null;
  aiResultUrl: string | null;
  onToggleAiMode: () => void;
  onToggleCompare: () => void;
  onUndo: () => void;
  onReset: () => void;
  onDownload: () => void;
  onNewPhoto: () => void;
}

export interface PhotoUploadPanelProps {
  isDragging: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface SliderPanelProps {
  featureValues: FeatureValues;
  landmarks: Landmark[] | null;
  aiMode: boolean;
  aiStrength: number;
  onFeatureChange: (featureId: FeatureId, value: number) => void;
  onFeatureCommit: (featureId: FeatureId, value: number) => void;
  onAiStrengthChange: (value: number) => void;
}

export interface ChatPanelProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  showTyping: boolean;
  aiGenerating: boolean;
  landmarks: Landmark[] | null;
  suggestions: string[];
  chatEndRef: RefObject<HTMLDivElement | null>;
  onChatInputChange: (value: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSendMessage: (overrideText?: string) => void;
}
