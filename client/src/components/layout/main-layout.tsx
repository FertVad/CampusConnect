import React, { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useLocation } from "wouter";
import { NotificationBell } from "../notifications/NotificationBell";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  
  // Получаем заголовок страницы в зависимости от текущего пути
  const getPageTitle = () => {
    // Преобразуем текущий путь в заголовок
    const path = location === "/" ? "dashboard" : location.substring(1);
    
    // Капитализируем первую букву и заменяем дефисы пробелами
    const title = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
    
    return title;
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Sidebar - fixed position, will overlay content */}
      <Sidebar />
      
      {/* Верхняя панель навигации */}
      <div className="fixed top-0 left-0 right-0 glass-sidebar dark:bg-sidebar-background p-2 shadow-md z-[90] ml-16 lg:ml-[4.5rem] border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center">
            <h2 className="font-semibold text-lg text-sidebar-foreground pl-8">{getPageTitle()}</h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
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