import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { saveTheme } from "@/lib/server/keep";
import { applyThemeClass, persistTheme, readStoredTheme, type Theme } from "@/lib/theme";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  hydrateFromAccount: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? "light");
  const { user } = useCurrentUserState();

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      persistTheme(next);
      if (user) {
        void saveTheme({ data: { theme: next } }).catch(() => {
          // stay on the local choice even if the account write fails
        });
      }
    },
    [user],
  );

  const hydrateFromAccount = useCallback((accountTheme: Theme) => {
    if (readStoredTheme()) return;
    setThemeState(accountTheme);
    persistTheme(accountTheme);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, hydrateFromAccount }),
    [theme, setTheme, hydrateFromAccount],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeIconButton({ night }: { night?: boolean }) {
  const { theme, setTheme } = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
      onClick={() => setTheme(next)}
      suppressHydrationWarning
      className={cn(
        "grid size-10 place-items-center rounded-full transition-transform duration-150 ease-out active:scale-[0.96]",
        night ? "bg-night-3 text-on-night" : "bg-cream text-ink shadow-soft",
      )}
    >
      {theme === "dark" ? <Sun className="size-4" strokeWidth={1.8} /> : <Moon className="size-4" strokeWidth={1.8} />}
    </button>
  );
}

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Appearance">
      {(
        [
          { id: "light", label: "Light", Icon: Sun },
          { id: "dark", label: "Dark", Icon: Moon },
        ] as const
      ).map(({ id, label, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id)}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-md text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.98]",
              active ? "bg-ink text-cream" : "bg-paper text-muted",
            )}
          >
            <Icon className="size-4" strokeWidth={1.8} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
