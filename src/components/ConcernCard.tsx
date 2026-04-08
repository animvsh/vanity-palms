import { concerns } from "@/data/mockData";
import { Link } from "react-router-dom";
import { Eye, Sparkles, Heart, Scissors, Star, SmilePlus, Waves, Syringe, ArrowRight } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  smile: <SmilePlus className="h-6 w-6" />,
  wind: <Scissors className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
  heart: <Heart className="h-6 w-6" />,
  eye: <Eye className="h-6 w-6" />,
  syringe: <Syringe className="h-6 w-6" />,
  waves: <Waves className="h-6 w-6" />,
  star: <Star className="h-6 w-6" />,
};

const ConcernCard = ({ concern, index }: { concern: typeof concerns[0]; index?: number }) => {
  return (
    <Link to={`/concerns/${concern.id}`}>
      <div className="apple-card-interactive group relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg group-hover:shadow-primary/20">
            {iconMap[concern.icon]}
          </div>
          <h3 className="mb-1.5 text-[15px] font-semibold text-foreground">{concern.name}</h3>
          <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{concern.description}</p>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-primary">
            <span className="transition-all duration-300 group-hover:mr-1">{concern.procedureCount} procedures</span>
            <ArrowRight className="h-3.5 w-3.5 transition-all duration-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ConcernCard;
