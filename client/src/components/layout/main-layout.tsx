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
      
      {/* Верхняя панель навигации */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 p-2 shadow-md z-[100] ml-16 lg:ml-[4.5rem] border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4">
          <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-200">EduPortal</h2>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 hover:bg-primary/20 transition-colors rounded-full flex items-center justify-center cursor-pointer relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">2</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content area - fixed margin for collapsed sidebar and top margin for global topbar */}
      <div className="ml-16 lg:ml-[4.5rem] min-h-screen pt-24">
        {/* Content container */}
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
}