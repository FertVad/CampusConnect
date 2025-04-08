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
      
      {/* Глобальный TopBar - виден на всех страницах */}
      <div className="fixed top-0 left-0 right-0 bg-red-500 p-4 rounded-lg shadow-lg z-[9999] mb-4 border-4 border-black ml-16 lg:ml-[4.5rem]">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-xl">ГЛОБАЛЬНЫЙ TOPBAR</h2>
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white hover:bg-gray-100 transition-colors rounded-full flex items-center justify-center cursor-pointer relative border-2 border-black">
              <div className="h-6 w-6 text-black">Bell</div>
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