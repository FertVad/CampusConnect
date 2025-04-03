import React, { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/theme/language-switcher";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-900 text-gray-200">
      {/* Sidebar - fixed position, will overlay content */}
      <Sidebar />
      
      {/* Main content - will always have left margin for collapsed sidebar */}
      <div className="ml-16 flex flex-col min-h-screen">
        {/* Top actions bar */}
        <div className="flex items-center justify-end h-16 px-4 border-b glass-sidebar">
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}