import ConsultationThread from "@/components/ConsultationThread";
import type { Consultation } from "./types";
import { ChevronLeft, Inbox, ChevronRight } from "lucide-react";

interface InboxTabProps {
  consultations: Consultation[];
  providerName: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const InboxTab = ({
  consultations,
  providerName,
  selectedId,
  onSelect,
}: InboxTabProps) => {
  if (selectedId) {
    return (
      <div className="max-w-3xl animate-fade-up">
        <button
          onClick={() => onSelect(null)}
          className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to inbox
        </button>
        <div className="rounded-xl border bg-card h-[550px] flex flex-col overflow-hidden">
          <ConsultationThread
            consultationId={selectedId}
            senderType="provider"
            senderName={providerName}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-up">
      <div className="mb-6">
        <h1 className="text-display-sm text-foreground">Inbox</h1>
        <p className="mt-2 text-muted-foreground">
          Manage consultations and message patients.
        </p>
      </div>
      <div className="space-y-2">
        {consultations.length === 0 ? (
          <div className="apple-card p-8">
            <div className="flex flex-col items-center text-center py-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[14px] font-medium text-foreground mb-2">No messages yet</p>
              <p className="text-[13px] text-muted-foreground max-w-sm">
                When patients request consultations, their messages will appear here.
              </p>
            </div>
          </div>
        ) : (
          consultations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="w-full rounded-xl border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{c.patient_name}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        c.status === "new"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : c.status === "replied"
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : c.status === "booked"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : c.status === "cancelled"
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {c.message || "New consultation request"}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
