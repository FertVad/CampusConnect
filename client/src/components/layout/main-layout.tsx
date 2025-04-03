import React, { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/theme/language-switcher";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Sidebar - fixed position, will overlay content */}
      <Sidebar />
      
      {/* Main content area - fixed margin for collapsed sidebar */}
      <div className="ml-16 min-h-screen">
        {/* Content container */}
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
}