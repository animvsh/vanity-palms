import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";

type Section = {
  title: string;
  body: string[];
};

interface StaticPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Section[];
}

const StaticPage = ({ eyebrow, title, intro, sections }: StaticPageProps) => {
  return (
    <PageTransition>
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Vanity Palms
        </Link>

        <div className="mb-12 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
          <h1 className="text-display-sm text-foreground">{title}</h1>
          <p className="text-body-lg text-muted-foreground">{intro}</p>
        </div>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="apple-card p-6 sm:p-8">
              <h2 className="mb-4 text-title text-foreground">{section.title}</h2>
              <div className="space-y-4 text-[14px] leading-relaxed text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default StaticPage;
