import type { VerificationStatus } from "@/data/constants";
import type { ReactNode } from "react";
import { Hourglass, CircleCheck, CircleX, CirclePause } from "lucide-react";

interface VerificationBadgeProps {
  status: VerificationStatus;
}

const STATUS_CONFIG: Record<VerificationStatus, { icon: ReactNode; label: string; className: string }> = {
  pending: {
    icon: <Hourglass className="h-3 w-3" />,
    label: "Pending Verification",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  verified: {
    icon: <CircleCheck className="h-3 w-3" />,
    label: "Verified",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  rejected: {
    icon: <CircleX className="h-3 w-3" />,
    label: "Rejected",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  suspended: {
    icon: <CirclePause className="h-3 w-3" />,
    label: "Suspended",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  },
};

const VerificationBadge = ({ status }: VerificationBadgeProps) => {
  const config = STATUS_CONFIG[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

export default VerificationBadge;
