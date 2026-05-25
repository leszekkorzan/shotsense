import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
};

const themeColors: Record<Theme, string> = {
  light: "#ffffff",
  dark: "#0a0a0a",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function readStoredTheme(storageKey: string, defaultTheme: Theme) {
  try {
    const storedTheme = window.localStorage.getItem(storageKey);

    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }
  } catch {
    // Ignore
  }

  return defaultTheme;
}

function updateMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.append(meta);
  }

  meta.setAttribute("content", content);
}

export function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  const appliedTheme = theme === "dark" ? "dark" : "light";

  root.classList.remove("light", "dark");
  root.classList.add(appliedTheme);
  root.style.colorScheme = appliedTheme;

  updateMeta("theme-color", themeColors[appliedTheme]);
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() =>
    readStoredTheme(storageKey, defaultTheme)
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
