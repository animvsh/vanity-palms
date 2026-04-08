import { Button } from "@/components/ui/button";
import { Upload, Camera, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotoUploadPanelProps } from "./types";

export default function PhotoUploadPanel({
  isDragging,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}: PhotoUploadPanelProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-6 p-8 transition-colors",
        isDragging && "bg-primary/5",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/5">
          <Camera className="h-10 w-10 text-primary/40" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Upload a photo
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
            Drop a clear, front-facing portrait here or click to browse.
            Works best with even lighting and a neutral expression.
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 gap-2 rounded-full px-6"
        >
          <Upload className="h-4 w-4" />
          Choose Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* Sample photos hint */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" />
        <span>JPG, PNG, or WebP — up to 10 MB</span>
      </div>
    </div>
  );
}
