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
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

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
    
    // Update state
    setResolvedTheme(resolvedValue);
    
    // Remove transition class after change is complete
    setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 500); // Match the CSS transition duration
  };

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  // Toggle between light and dark (ignoring system)
  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    localStorage.setItem(storageKey, newTheme);
    setTheme(newTheme);
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
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