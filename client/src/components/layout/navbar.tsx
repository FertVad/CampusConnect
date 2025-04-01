import React from "react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Calendar, 
  Award, 
  Users, 
  FileText, 
  MessageSquare,
  LogOut,
  Menu,
  X
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: BookOpen },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Assignments", href: "/assignments", icon: FileText },
  { name: "Grades", href: "/grades", icon: Award },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Users", href: "/users", icon: Users, adminOnly: true },
];

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-50 border-b glass-sidebar">
      <div className="container flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">College MS</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navigationItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {user && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout} 
              disabled={logoutMutation.isPending}
              className="rounded-full"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          )}
          
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-sidebar px-0 sm:max-w-xs">
                <SheetHeader className="px-6">
                  <SheetTitle className="text-left text-lg bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
                    College MS
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-10 px-6">
                  {navigationItems.map((item) => {
                    if (item.adminOnly && !isAdmin) return null;
                    
                    const isActive = location === item.href;
                    const Icon = item.icon;
                    
                    return (
                      <SheetClose asChild key={item.name}>
                        <Link 
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActive 
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          {item.name}
                        </Link>
                      </SheetClose>
                    );
                  })}
                  
                  {user && (
                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        onClick={handleLogout} 
                        disabled={logoutMutation.isPending}
                        className="justify-start px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Logout
                      </Button>
                    </SheetClose>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}