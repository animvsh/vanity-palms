import { useState, useEffect } from "react";
import { Instagram, ExternalLink, Grid3X3, Image as ImageIcon } from "lucide-react";

interface InstagramFeedProps {
  instagramUrl: string;
  providerId?: string;
}

function extractUsername(url: string): string | null {
  const match = url.match(
    /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/,
  );
  return match?.[1] ?? null;
}

export default function InstagramFeed({
  instagramUrl,
}: InstagramFeedProps) {
  const username = extractUsername(instagramUrl);
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      setError(true);
      return;
    }

    const profileUrl = `https://www.instagram.com/${username}/`;
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(profileUrl)}&maxwidth=600&omitscript=true`;

    fetch(oembedUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: { html?: string }) => {
        if (data.html) {
          // Basic sanitization — strip scripts and inline event handlers
          const clean = data.html
            .replace(/<script[^>]*>.*?<\/script>/gi, "")
            .replace(/on\w+="[^"]*"/gi, "");
          setEmbedHtml(clean);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [username]);

  // Load Instagram embed script when we have HTML
  useEffect(() => {
    if (!embedHtml) return;
    const existing = document.querySelector(
      'script[src="https://www.instagram.com/embed.js"]',
    );
    if (existing) {
      (window as unknown as Record<string, { Embeds?: { process?: () => void } }>).instgrm?.Embeds?.process?.();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }, [embedHtml]);

  if (!username) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
            <Instagram className="h-4 w-4 text-white" />
          </div>
          Instagram
        </h2>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-border/40 bg-secondary/30 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/60"
        >
          @{username}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-border/30 bg-secondary/10 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Embed success */}
      {!loading && embedHtml && (
        <div
          className="overflow-hidden rounded-xl [&_iframe]:!rounded-xl [&_iframe]:!border-0"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      )}

      {/* Fallback — styled card linking to Instagram */}
      {!loading && error && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col items-center gap-5 rounded-xl border border-border/40 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5 p-8 transition-all hover:border-border/60 hover:shadow-sm"
        >
          {/* Simulated grid placeholder */}
          <div className="grid grid-cols-3 gap-1.5 opacity-40">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="flex h-16 w-16 items-center justify-center rounded-md bg-gradient-to-br from-secondary/60 to-secondary/30"
              >
                <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              @{username}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              View their latest work and before & after photos on Instagram
            </p>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-border/40 bg-background/80 px-4 py-2 text-xs font-medium text-foreground transition-colors group-hover:bg-foreground/5">
            <Grid3X3 className="h-3.5 w-3.5" />
            View on Instagram
            <ExternalLink className="h-3 w-3" />
          </span>
        </a>
      )}
    </section>
  );
}
