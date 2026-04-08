import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { Mail, Briefcase, Headset } from "lucide-react";
import type { ReactNode } from "react";
import BrandMark from "@/components/BrandMark";

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleHashLink = useCallback((e: React.MouseEvent, path: string) => {
    if (path.startsWith("/#")) {
      const hash = path.slice(1);
      if (location.pathname === "/") {
        e.preventDefault();
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: "smooth" });
      } else {
        e.preventDefault();
        navigate("/");
        setTimeout(() => {
          const el = document.getElementById(hash.slice(1));
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, [location.pathname, navigate]);

  return (
    <footer className="border-t border-border/40 bg-surface/30">
      <div className="container mx-auto px-6 py-12 sm:py-20">
        <div className="grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <BrandMark sizeClassName="h-8 w-8" textClassName="text-xs font-bold" />
              <span className="text-[15px] font-semibold text-foreground tracking-tight">
                Vanity Palms
              </span>
            </div>
            <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[220px]">
              Better decisions for aesthetic treatments.
            </p>
            <div className="mt-5 flex gap-3">
              {([
                { href: "mailto:hello@vanitypalms.com", icon: <Mail className="h-4 w-4" /> as ReactNode, label: "Email Vanity Palms" },
                { href: "mailto:partners@vanitypalms.com", icon: <Briefcase className="h-4 w-4" /> as ReactNode, label: "Partner with Vanity Palms" },
                { href: "mailto:support@vanitypalms.com", icon: <Headset className="h-4 w-4" /> as ReactNode, label: "Vanity Palms support" },
              ]).map(({ href, icon, label }) => (
                <a key={label} href={href} className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground transition-all duration-200" aria-label={label}>
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {[
            {
              title: "Platform",
              links: [
                { label: "Browse Concerns", to: "/#concerns" },
                { label: "Explore Treatments", to: "/#concerns" },
                { label: "Find Providers", to: "/providers" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About", to: "/about" },
                { label: "Careers", to: "mailto:careers@vanitypalms.com" },
                { label: "Contact", to: "mailto:hello@vanitypalms.com" },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Privacy", to: "/privacy" },
                { label: "Terms", to: "/terms" },
                { label: "Cookies", to: "/cookies" },
                { label: "Disclaimer", to: "/terms" },
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.to.startsWith("mailto:") ? (
                      <a
                        href={link.to}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        onClick={(e) => handleHashLink(e, link.to)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 sm:pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Vanity Palms
          </p>
          <div className="flex gap-6">
            {[
              { label: "Privacy", to: "/privacy" },
              { label: "Terms", to: "/terms" },
              { label: "Cookies", to: "/cookies" },
            ].map((item) => (
              <Link key={item.label} to={item.to} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
