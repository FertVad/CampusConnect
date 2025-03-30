import { ReactNode, useContext } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNavigation from './MobileNavigation';
import { UserContext } from '@/main';
import { Redirect } from 'wouter';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const MainLayout = ({ children, title, subtitle }: MainLayoutProps) => {
  const userContext = useContext(UserContext);
  
  // Redirect if not logged in
  if (!userContext?.user) {
    return <Redirect to="/login" />;
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (hidden on mobile) */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <TopBar />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6 lg:p-8">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold font-heading text-neutral-700">{title}</h1>}
              {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
            </div>
          )}
          
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        <MobileNavigation />
      </div>
    </div>
  );
};

export default MainLayout;
