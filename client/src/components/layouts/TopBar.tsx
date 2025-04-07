import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Menu, Search, MessageSquare, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const TopBar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logoutMutation, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    // This would control a mobile sidebar in a real implementation
  };
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden">
          <button 
            onClick={toggleSidebar}
            className="text-neutral-500 hover:text-neutral-700 focus:outline-none focus:text-neutral-700"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center">
          <div className="bg-primary p-1.5 rounded-lg mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-lg font-medium font-heading text-neutral-700">EduPortal</h1>
        </div>
        
        {/* Search Bar (Hidden on mobile) */}
        <div className="flex-1 max-w-xl mx-8 hidden md:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neutral-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search for courses, assignments, etc." 
              className="block w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        {/* Action Icons */}
        <div className="flex items-center space-x-4">
          {user && isAuthenticated && (
            <NotificationBell />
          )}
          
          <Link href="/chat">
            <button className="text-neutral-500 hover:text-neutral-700 focus:outline-none">
              <MessageSquare className="h-6 w-6" />
            </button>
          </Link>
          
          <div className="border-l border-neutral-200 h-6 mx-2"></div>
          
          {/* User Profile */}
          <div className="hidden md:flex items-center">
            <img 
              src={`https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random`} 
              alt="User avatar" 
              className="h-8 w-8 rounded-full"
            />
            <div className="ml-2">
              <span className="text-sm font-medium text-neutral-700">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
          
          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
