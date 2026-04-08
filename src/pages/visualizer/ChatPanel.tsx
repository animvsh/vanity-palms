import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatPanelProps } from "./types";

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-secondary/70 px-3.5 py-2.5">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({
  chatMessages,
  chatInput,
  showTyping,
  aiGenerating,
  landmarks,
  suggestions,
  chatEndRef,
  onChatInputChange,
  onInputKeyDown,
  onSendMessage,
}: ChatPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="flex flex-col gap-3">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary/70 text-foreground rounded-bl-md",
                )}
              >
                {msg.content.split("\n").map((line, i, arr) => (
                  <span key={`${msg.id}-${i}`}>
                    {line}
                    {i < arr.length - 1 && <br />}
                  </span>
                ))}
                {msg.featureDeltas &&
                  Object.keys(msg.featureDeltas).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(msg.featureDeltas).map(
                        ([key, val]) => (
                          <span
                            key={key}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              "bg-primary/10 text-primary",
                            )}
                          >
                            {key.replace(/_/g, " ")}
                            <span className="opacity-60">
                              {(val as number) > 0 ? "+" : ""}
                              {Math.round((val as number) * 100)}%
                            </span>
                          </span>
                        ),
                      )}
                    </div>
                  )}
              </div>
            </div>
          ))}
          {showTyping && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/40 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyDown={onInputKeyDown}
              disabled={showTyping || aiGenerating}
              placeholder={
                aiGenerating
                  ? "AI is generating..."
                  : landmarks
                    ? "Describe a change..."
                    : "Upload a photo first..."
              }
              maxLength={500}
              className="w-full rounded-full border border-border/60 bg-secondary/30 px-4 py-2.5 pr-10 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
            />
            {chatInput.trim() && (
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>
        {landmarks && suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSendMessage(suggestion)}
                className="rounded-full border border-border/40 bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              >
                <Sparkles className="mr-1 inline-block h-3 w-3" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
