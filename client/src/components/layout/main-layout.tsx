import React, { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useLocation } from "wouter";
import { NotificationBell } from "../notifications/NotificationBell";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const [location] = useLocation();
  
  // Получаем заголовок страницы в зависимости от текущего пути
  const getPageTitle = () => {
    // Если передан заголовок через параметр - используем его
    if (title) return title;
    
    // Иначе генерируем из текущего пути
    const path = location === "/" ? "dashboard" : location.substring(1);
    
    // Капитализируем первую букву и заменяем дефисы пробелами
    const generatedTitle = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
    
    return generatedTitle;
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Верхняя панель навигации должна быть под сайдбаром */}
      <div style={{ zIndex: 50 }} className="fixed top-0 left-0 right-0 glass-sidebar dark:bg-sidebar-background p-1 shadow-md ml-16 lg:ml-[4.5rem] border-b border-sidebar-border">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center h-14 pl-6">
            <h2 className="font-semibold text-lg text-sidebar-foreground">{getPageTitle()}</h2>
            {subtitle && <p className="text-sm text-sidebar-foreground ml-2 opacity-70">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4 border border-red-500 p-1">
            <NotificationBell />
          </div>
        </div>
      </div>
      
      {/* Sidebar - fixed position, должен перекрывать топбар - поэтому выше в DOM */}
      <Sidebar />
      
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