interface PriceRangeScaleProps {
  costMin: number;
  costMax: number;
  medianPrice?: number;
}

const PriceRangeScale = ({ costMin, costMax, medianPrice }: PriceRangeScaleProps) => {
  const median = medianPrice ?? Math.round((costMin + costMax) / 2);
  const range = costMax - costMin;
  const position = range > 0 ? ((median - costMin) / range) * 100 : 50;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
        <span>Lower</span>
        <span>Higher</span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-primary/10 via-primary/30 to-primary/60">
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-primary border-2 border-background shadow-md transition-all"
          style={{ left: `${Math.min(Math.max(position, 5), 95)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[12px] text-muted-foreground">${costMin.toLocaleString()}</span>
        <span className="text-[13px] font-semibold text-foreground">
          Median: ${median.toLocaleString()}
        </span>
        <span className="text-[12px] text-muted-foreground">${costMax.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default PriceRangeScale;
