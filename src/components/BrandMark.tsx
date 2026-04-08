import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  sizeClassName?: string;
  textClassName?: string;
}

const BrandMark = ({
  className,
  sizeClassName = "h-10 w-10",
  textClassName = "text-sm font-bold",
}: BrandMarkProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-black text-white shadow-sm",
        sizeClassName,
        className,
      )}
    >
      <span className={textClassName}>V</span>
    </div>
  );
};

export default BrandMark;
