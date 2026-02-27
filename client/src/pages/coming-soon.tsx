import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import zowehLogoLight from "@assets/zoweh-logo-light.png";
import zowehLogoDark from "@assets/zoweh_life_logo_transparent_1771993303739.png";

const UNLOCK_CODE = "Gen11";
const STORAGE_KEY = "zoweh_coming_soon_unlock";

export function getIsUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function setUnlocked(): void {
  sessionStorage.setItem(STORAGE_KEY, "1");
}

interface ComingSoonProps {
  onUnlock: () => void;
}

export default function ComingSoon({ onUnlock }: ComingSoonProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcode.trim();
    if (trimmed === UNLOCK_CODE) {
      setError(false);
      setUnlocked();
      onUnlock();
    } else {
      setError(true);
      setPasscode("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative">
      {/* Header — Zoweh Life logo, minimal */}
      <header className="w-full border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex justify-center md:justify-start">
          <span className="inline-block" aria-hidden>
            {theme === "dark" ? (
              <img
                src={zowehLogoDark}
                alt="Zoweh Life"
                className="h-10 w-[160px] object-contain md:h-12 md:w-[180px]"
              />
            ) : (
              <img
                src={zowehLogoLight}
                alt="Zoweh Life"
                className="h-10 w-[160px] object-contain md:h-12 md:w-[180px] mix-blend-darken"
              />
            )}
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Zoweh Life is coming soon.
          </h1>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg leading-relaxed">
            A ministry management platform built to support discipleship with
            structure, clarity, and care.
          </p>
        </div>
      </section>

      {/* Vision statement */}
      <section className="px-4 pb-16 md:pb-24">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-muted-foreground/90 leading-relaxed sm:text-base">
            Helping ministries manage discipleship beyond attendance. This is
            personal transformation built with intention.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Zoweh Life
          </p>
        </div>
      </footer>

      {/* Very small passcode field — bottom left */}
      <div className="fixed bottom-4 left-4 z-10">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setError(false);
            }}
            placeholder="Code"
            className="w-20 h-6 text-xs px-2 py-0.5 rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Passcode"
          />
          <button
            type="submit"
            className="h-6 px-2 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Go
          </button>
        </form>
        {error && (
          <p className="mt-1 text-[10px] text-destructive">Incorrect</p>
        )}
      </div>
    </div>
  );
}
