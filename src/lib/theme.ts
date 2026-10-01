export const THEME_KEY = "keep-theme";
export type Theme = "light" | "dark";

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}else{document.documentElement.style.colorScheme="light"}var s=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;if(s)document.documentElement.classList.add("standalone")}catch(e){}})();`;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#161412" : "#F3EEE6");
}

export function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // private mode / quota
  }
  applyThemeClass(theme);
}
