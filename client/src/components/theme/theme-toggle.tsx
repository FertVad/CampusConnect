import React from "react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, toggleTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = resolvedTheme === "dark";

  return (
    <>
      {/* Quick toggle button */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleTheme}
        className={cn(
          "rounded-full relative overflow-hidden",
          "hover:bg-primary/10 transition-all duration-300"
        )}
      >
        <div className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500",
          !isDark && "opacity-100"
        )}>
          <div className="absolute inset-0 bg-amber-100/20 rounded-full scale-0 transition-transform duration-500" 
            style={{ transform: !isDark ? 'scale(1)' : 'scale(0)' }} />
        </div>
        
        <div className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500",
          isDark && "opacity-100"
        )}>
          <div className="absolute inset-0 bg-indigo-900/20 rounded-full scale-0 transition-transform duration-500" 
            style={{ transform: isDark ? 'scale(1)' : 'scale(0)' }} />
        </div>

        {/* Sun icon with rays that animate */}
        <div className={cn(
          "transform transition-all duration-500 absolute",
          isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        )}>
          <Sun className="h-5 w-5 text-amber-500" />
        </div>

        {/* Moon icon with stars that animate */}
        <div className={cn(
          "transform transition-all duration-500 absolute",
          !isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        )}>
          <Moon className="h-5 w-5 text-indigo-300" />
        </div>
        
        <span className="sr-only">{t('settings.toggleTheme')}</span>
      </Button>

      {/* Extended dropdown menu for theme options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden xs:flex rounded-full ml-1 hover:bg-primary/10"
          >
            <Monitor className="h-4 w-4" />
            <span className="sr-only">{t('settings.themeOptions')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-modal">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium">{t('settings.themeTitle')}</span>
            <div className="flex space-x-0.5">
              <span className={cn(
                "size-3 rounded-full cursor-pointer border",
                theme === "light" ? "bg-amber-50 border-amber-400" : "bg-amber-100 border-transparent opacity-50"
              )} onClick={() => setTheme("light")} />
              <span className={cn(
                "size-3 rounded-full cursor-pointer border",
                theme === "dark" ? "bg-gray-900 border-gray-600" : "bg-gray-800 border-transparent opacity-50"
              )} onClick={() => setTheme("dark")} />
              <span className={cn(
                "size-3 rounded-full cursor-pointer border overflow-hidden",
                theme === "system" ? "border-primary" : "border-transparent opacity-50"
              )} onClick={() => setTheme("system")}>
                <div className="flex h-full">
                  <div className="w-1/2 bg-amber-100" />
                  <div className="w-1/2 bg-gray-900" />
                </div>
              </span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme("light")} className={theme === "light" ? "bg-primary/10" : ""}>
            <Sun className="h-4 w-4 mr-2 text-amber-500" />
            {t('settings.lightTheme')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")} className={theme === "dark" ? "bg-primary/10" : ""}>
            <Moon className="h-4 w-4 mr-2 text-indigo-300" />
            {t('settings.darkTheme')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")} className={theme === "system" ? "bg-primary/10" : ""}>
            <Monitor className="h-4 w-4 mr-2" />
            {t('settings.systemTheme')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}