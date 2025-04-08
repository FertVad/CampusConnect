import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNavigation from './MobileNavigation';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const MainLayout = ({ children, title, subtitle }: MainLayoutProps) => {
  const { user } = useAuth();
  
  // Временно отключаем редирект для отладки
  // if (!user) {
  //   return <Redirect to="/auth" />;
  // }
  console.log("MainLayout rendered, user:", user);
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (hidden on mobile) */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar используется как fixed-компонент и находится над всеми слоями */}
        <TopBar />
        
        {/* Main Content Area с большим отступом сверху, чтобы не перекрывать шапку */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6 lg:p-8 mt-24">
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
