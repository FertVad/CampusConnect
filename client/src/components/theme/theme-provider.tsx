import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const getStoredTheme = (): Theme => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      return (stored as Theme) || defaultTheme;
    } catch (error) {
      return defaultTheme;
    }
  };

  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  const resolvedTheme: "light" | "dark" =
    theme === "system"
      ? typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : (theme as "light" | "dark");
  

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    setIsInitialized(true);
  }, [storageKey, defaultTheme]);

  // Handle system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (theme === "system") {
        updateTheme(theme);
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Update the theme when it changes
  const updateTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    
    // First determine what the resolved theme should be
    let resolvedValue: "light" | "dark";
    
    if (newTheme === "system") {
      resolvedValue = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      resolvedValue = newTheme as "light" | "dark";
    }
    
    // Apply smooth transition class before changing
    root.classList.add("theme-transition");
    
    // Remove old theme classes
    root.classList.remove("light", "dark");
    
    // Add new theme class
    root.classList.add(resolvedValue);
    root.style.colorScheme = resolvedValue;
    
    // Remove transition class after change is complete
    setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 500); // Match the CSS transition duration
  };

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, theme);
      } catch (error) {
        console.warn("Failed to save theme:", error);
      }
    }
  }, [theme, storageKey, isInitialized]);

  // Toggle between light and dark (ignoring system)
  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
    },
    toggleTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  
  return context;
}