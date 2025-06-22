import React, { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Link, useLocation } from "wouter";
import { NotificationBell } from "../notifications/NotificationBell";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  MessageSquare,
  ClipboardList,
  Users,
  Settings,
  Menu,
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const navigationItems = [
  { key: "dashboard.title", href: "/", icon: LayoutDashboard },
  { key: "schedule.title", href: "/schedule", icon: Calendar },
  { key: "assignments.title", href: "/assignments", icon: FileText },
  { key: "chat.title", href: "/chat", icon: MessageSquare },
  { key: "common.taskManager", href: "/tasks", icon: ClipboardList },
  { key: "users.title", href: "/users", icon: Users, adminOnly: true },
  { key: "settings.title", href: "/settings", icon: Settings },
];

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const isAdmin = user?.role === "admin";
  
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
      <div style={{ zIndex: 50 }} className="fixed top-0 left-0 right-0 glass-sidebar dark:bg-sidebar-background p-1 shadow-md md:ml-16 lg:ml-[4.5rem] border-b border-sidebar-border">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center h-14 pl-6">
            <h2 className="font-semibold text-lg text-sidebar-foreground">{getPageTitle()}</h2>
            {subtitle && <p className="text-sm text-sidebar-foreground ml-2 opacity-70">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="glass-sidebar px-0 sm:max-w-xs">
                  <SheetHeader className="px-6">
                    <SheetTitle className="text-left text-lg bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
                      {t('navigation_menu')}
                    </SheetTitle>
                    <SheetDescription>
                      {t('navigation_menu_description')}
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="flex flex-col gap-4 mt-10 px-6">
                    {navigationItems.map((item) => {
                      if (item.adminOnly && !isAdmin) return null;

                      const isActive = location === item.href;
                      const Icon = item.icon;

                      return (
                        <SheetClose asChild key={item.key}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            {t(item.key)}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar - fixed position, должен перекрывать топбар - поэтому выше в DOM */}
      <Sidebar />

      {/* Main content area - fixed margin for collapsed sidebar and top margin for global topbar */}
      <div className="md:ml-16 lg:ml-[4.5rem] min-h-screen pt-24">
        {/* Content container */}
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
}