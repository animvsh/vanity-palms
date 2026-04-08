import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import BrandMark from "@/components/BrandMark";
import { getCurrentUser, getProviderByUserId, signOut } from "@/lib/api";
import { ChevronDown, User, TrendingUp, LogOut, X, Menu } from "lucide-react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ email: string; isProvider: boolean } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check auth state on mount and route changes
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const u = await getCurrentUser();
        if (cancelled) return;
        if (u) {
          const provider = await getProviderByUserId(u.id);
          setUser({ email: u.email ?? "", isProvider: !!provider });
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/provider/signup") {
      return location.pathname === "/provider/signup" || location.pathname === "/provider/login";
    }
    return location.pathname === path;
  };

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

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setMenuOpen(false);
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? "glass-nav border-b border-border/40 shadow-sm" : "bg-transparent"}`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Vanity Palms home">
          <BrandMark sizeClassName="h-8 w-8" textClassName="text-xs font-bold" />
          <span className="text-[15px] font-semibold text-foreground tracking-tight">
            Vanity Palms
          </span>
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {(location.pathname === "/" ? [
            { path: "/#how-it-works", label: "How it Works" },
            { path: "/providers", label: "Providers" },
            ...(!user ? [{ path: "/provider/signup", label: "For Providers" }] : []),
          ] : [
            { path: "/#concerns", label: "Browse Concerns" },
            { path: "/providers", label: "Find Providers" },
            ...(!user ? [{ path: "/provider/signup", label: "For Providers" }] : []),
          ]).map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              onClick={(e) => handleHashLink(e, path)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                isActive(path)
                  ? "bg-foreground/5 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-foreground/5 transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-semibold">
                  {user.email[0].toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{user.email.split("@")[0]}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-border/60 bg-card shadow-lg p-1.5 animate-fade-in">
                    <div className="px-3 py-2 text-[12px] text-muted-foreground truncate">{user.email}</div>
                    <hr className="my-1 border-border/50" />
                    <Link to="/account" onClick={() => setMenuOpen(false)} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-foreground hover:bg-foreground/5 transition-colors">
                      <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      My Account
                    </Link>
                    {user.isProvider && (
                      <Link to="/provider/dashboard" onClick={() => setMenuOpen(false)} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-foreground hover:bg-foreground/5 transition-colors">
                        <TrendingUp className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        Provider Dashboard
                      </Link>
                    )}
                    <hr className="my-1 border-border/50" />
                    <button
                      onClick={handleSignOut}
                      className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-foreground hover:bg-foreground/5 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-[13px] h-8 px-5 border-foreground/80 text-foreground hover:bg-foreground hover:text-background transition-all"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>

        <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" aria-expanded={mobileOpen}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="glass-nav border-t border-border/30 p-5 md:hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            {(location.pathname === "/" ? [
              { path: "/#how-it-works", label: "How it Works" },
              { path: "/providers", label: "Providers" },
              ...(!user ? [{ path: "/provider/signup", label: "For Providers" }] : []),
            ] : [
              { path: "/#concerns", label: "Browse Concerns" },
              { path: "/providers", label: "Find Providers" },
              ...(!user ? [{ path: "/provider/signup", label: "For Providers" }] : []),
            ]).map(({ path, label }) => (
              <Link key={path} to={path} onClick={(e) => { handleHashLink(e, path); setMobileOpen(false); }} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors">
                {label}
              </Link>
            ))}
            <hr className="my-2 border-border/50" />
            {user ? (
              <>
                <Link to="/account" onClick={() => setMobileOpen(false)} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors">
                  My Account
                </Link>
                {user.isProvider && (
                  <Link to="/provider/dashboard" onClick={() => setMobileOpen(false)} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors">
                    Provider Dashboard
                  </Link>
                )}
                <button
                  onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block w-full rounded-xl border border-foreground/80 text-center py-2.5 text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
