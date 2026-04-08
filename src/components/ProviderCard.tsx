import { memo } from "react";
import { Provider } from "@/data/mockData";
import { Star, Clock, MapPin, ShieldCheck, ArrowUpRight, Instagram, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

interface ProviderCardProps {
  provider: Provider;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showSelect?: boolean;
  contextSignal?: string;
}

const ProviderCard = memo(({ provider, selected, onSelect, showSelect, contextSignal }: ProviderCardProps) => {
  return (
    <div className={`apple-card-interactive relative overflow-hidden p-5 ${selected ? "ring-2 ring-primary border-primary/30 shadow-lg shadow-primary/10" : ""}`}>
      {showSelect && (
        <div className="absolute right-4 top-4 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect?.(provider.id)}
            className="rounded-md transition-transform duration-200 hover:scale-110"
            aria-label={`Select ${provider.name} for comparison`}
          />
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-foreground/10 to-foreground/[0.03] text-foreground/80 font-semibold text-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-foreground/5">
          {provider.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>

        <div className="min-w-0 flex-1">
          <Link to={`/providers/${provider.id}`} className="group/link">
            <h3 className="font-semibold text-foreground text-[15px] transition-colors duration-200 group-hover/link:text-primary flex items-center gap-1 truncate">
              {provider.name}
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 translate-y-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 group-hover/link:translate-y-0 transition-all duration-200" />
            </h3>
          </Link>
          {provider.subscriptionTier === "premium" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3 w-3" />
              Featured
            </span>
          )}
          <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {provider.rating}
            </span>
            <span className="text-border">·</span>
            <span>{provider.reviewCount} reviews</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {provider.specialty.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground transition-colors duration-200 hover:bg-primary/10 hover:text-primary">
                {s}
              </span>
            ))}
          </div>
          {provider.certifications.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {provider.certifications.slice(0, 2).map((cert) => (
                <span key={cert} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  {cert.replace("Board Certified ", "").replace("Plastic Surgeon", "ABPS").replace("Facial Plastic Surgeon", "ABFPRS").replace("Dermatologist", "AAD")}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/40 pt-3.5 text-[12px] text-muted-foreground">
        <div className="flex items-center gap-1.5 transition-colors hover:text-foreground">
          <MapPin className="h-3 w-3" />
          {provider.distance} mi
        </div>
        <div className="flex items-center gap-1.5 transition-colors hover:text-foreground">
          <Clock className="h-3 w-3" />
          {provider.responseTime}
        </div>
        <div className="flex items-center gap-1.5 text-success">
          <ShieldCheck className="h-3 w-3" />
          Verified
        </div>
      </div>
      {(provider.instagramUrl || contextSignal) && (
        <div className="mt-2.5 flex items-center justify-between gap-3">
          {contextSignal ? (
            <p className="text-[11px] text-muted-foreground italic">{contextSignal}</p>
          ) : (
            <span />
          )}
          {provider.instagramUrl && (
            <a
              href={provider.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Open ${provider.name} Instagram profile`}
              onClick={(e) => e.stopPropagation()}
            >
              <Instagram className="h-3.5 w-3.5" />
              Instagram
            </a>
          )}
        </div>
      )}
    </div>
  );
});

ProviderCard.displayName = "ProviderCard";

export default ProviderCard;
