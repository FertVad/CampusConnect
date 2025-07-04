import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { 
  FileText as FileManagerIcon, 
  Calendar, 
  Award, 
  Users, 
  FileText, 
  MessageSquare,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Settings,
  LayoutDashboard,
  ClipboardList
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/theme/language-switcher";

// Define navigation items with translation keys
const navigationItems = [
  { key: "dashboard.title", href: "/", icon: LayoutDashboard },
  { key: "schedule.title", href: "/schedule", icon: Calendar },
  { key: "assignments.title", href: "/assignments", icon: FileText },
  { key: "grades.title", href: "/grades", icon: Award },
  { key: "chat.title", href: "/chat", icon: MessageSquare },
  { key: "common.taskManager", href: "/tasks", icon: ClipboardList },
  { key: "users.title", href: "/users", icon: Users, adminOnly: true },
  { key: "schedule.import.fileManager", href: "/admin/imported-files", icon: FileManagerIcon, adminOnly: true },
  { key: "curriculum.title", href: "/curriculum-plans", icon: FileText, adminOnly: true },
  { key: "settings.title", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    setIsManuallyExpanded(!isCollapsed);
  };

  // Handle hover events
  const handleMouseEnter = () => {
    if (!isManuallyExpanded) {
      setIsCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isManuallyExpanded) {
      setIsCollapsed(true);
    }
  };

  // Handle clicks outside the sidebar to collapse it when manually expanded
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isManuallyExpanded) {
        setIsCollapsed(true);
        setIsManuallyExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isManuallyExpanded]);

  // Render navigation items
  const renderNavItems = () => {
    return navigationItems.map((item) => {
      // Skip admin-only items for non-admin users
      if (item.adminOnly && !isAdmin) return null;
      
      const isActive = location === item.href;
      const Icon = item.icon;
      
      // When sidebar is collapsed, show tooltips
      if (isCollapsed) {
        return (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <Link href={item.href}>
                <div className={cn(
                  "flex items-center rounded-md transition-colors group h-10 justify-center",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {t(item.key)}
            </TooltipContent>
          </Tooltip>
        );
      }
      
      // When sidebar is expanded, show full menu items
      return (
        <Link key={item.key} href={item.href}>
          <div className={cn(
            "flex items-center rounded-md transition-colors group h-10",
            isActive 
              ? "bg-primary/10 text-primary" 
              : "hover:bg-primary/5 text-muted-foreground hover:text-foreground",
            "px-3"
          )}>
            <Icon className="h-5 w-5 mr-3" />
            <span className="text-sm font-medium">
              {t(item.key)}
            </span>
          </div>
        </Link>
      );
    });
  };

  return (
    <div 
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-[1000] h-full flex flex-col glass-sidebar shadow-xl",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
              College MS
            </span>
          </Link>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleCollapse} 
          className="text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto scrollbar-thin">
        <div className="space-y-1 px-2">
          <TooltipProvider delayDuration={0}>
            {renderNavItems()}
          </TooltipProvider>
        </div>
      </nav>

      {/* Settings section */}
      <div className={cn(
        "border-t border-sidebar-border pt-4 px-4",
        isCollapsed ? "flex flex-col items-center gap-3" : ""
      )}>
        {isCollapsed ? (
          <>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 flex items-center justify-center">
                    <ThemeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('settings.theme')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 flex items-center justify-center">
                    <LanguageSwitcher />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('settings.language')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">{t('settings.appearance')}</span>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
      
      {/* User section */}
      {user && (
        <div className={cn(
          "border-t border-sidebar-border py-4 px-4",
          isCollapsed ? "flex justify-center" : ""
        )}>
          {isCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost"
                    onClick={handleLogout} 
                    disabled={logoutMutation.isPending}
                    className="w-10 h-10 rounded-full p-0 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('dashboard.logout')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              variant="ghost"
              onClick={handleLogout} 
              disabled={logoutMutation.isPending}
              className="justify-start text-sm w-full hover:bg-primary/5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-5 w-5 mr-3" />
              {t('dashboard.logout')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}