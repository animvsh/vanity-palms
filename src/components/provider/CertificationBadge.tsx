import { getCertificationDisplayLabel, BOARD_CERTIFICATIONS } from "@/data/constants";
import { ShieldCheck } from "lucide-react";

interface CertificationBadgeProps {
  boardCertifications: string[];
  compact?: boolean;
}

const CertificationBadge = ({ boardCertifications, compact }: CertificationBadgeProps) => {
  const displayLabel = getCertificationDisplayLabel(boardCertifications);
  if (!displayLabel && boardCertifications.length === 0) return null;

  const certLabels = boardCertifications.map((val) => {
    const found = BOARD_CERTIFICATIONS.find((c) => c.value === val);
    return found ? found.value : val;
  });

  return (
    <div className="space-y-1.5">
      {displayLabel && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="h-3 w-3" />
          {displayLabel}
        </span>
      )}
      {!compact && certLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {certLabels.map((cert) => (
            <span
              key={cert}
              className="rounded-md bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {cert}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CertificationBadge;
