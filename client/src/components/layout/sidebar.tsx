import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Calendar, 
  Award, 
  Users, 
  FileText, 
  MessageSquare,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Settings,
  LayoutDashboard
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Define navigation items with translation keys
const navigationItems = [
  { key: "dashboard.title", href: "/", icon: LayoutDashboard },
  { key: "schedule.title", href: "/schedule", icon: Calendar },
  { key: "assignments.title", href: "/assignments", icon: FileText },
  { key: "grades.title", href: "/grades", icon: Award },
  { key: "chat.title", href: "/chat", icon: MessageSquare },
  { key: "users.title", href: "/users", icon: Users, adminOnly: true },
  { key: "admin.importedFiles.title", href: "/admin/imported-files", icon: BookOpen, adminOnly: true },
  { key: "settings.title", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 bottom-0 z-50 h-full flex flex-col glass-sidebar transition-all duration-300",
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
          <TooltipProvider delayDuration={isCollapsed ? 0 : 999999}>
            {navigationItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <div className={cn(
                        "flex items-center rounded-md transition-colors group relative",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-primary/5 text-muted-foreground hover:text-foreground",
                        isCollapsed ? "justify-center px-2 py-3" : "px-3 py-2"
                      )}>
                        <Icon className={cn("flex-shrink-0", isCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3")} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">
                            {t(item.key)}
                          </span>
                        )}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      {t(item.key)}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </nav>

      {/* User section */}
      {user && (
        <div className={cn(
          "border-t border-sidebar-border py-4 px-4",
          isCollapsed ? "flex justify-center" : ""
        )}>
          <TooltipProvider delayDuration={isCollapsed ? 0 : 999999}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost"
                  onClick={handleLogout} 
                  disabled={logoutMutation.isPending}
                  className={cn(
                    "hover:bg-primary/5 text-muted-foreground hover:text-foreground",
                    isCollapsed ? "w-10 h-10 rounded-full p-0" : "justify-start text-sm w-full"
                  )}
                >
                  <LogOut className={isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"} />
                  {!isCollapsed && t('dashboard.logout')}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  {t('dashboard.logout')}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}