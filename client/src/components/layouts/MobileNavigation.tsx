import { Link, useLocation } from 'wouter';
import { Home, Clock, FileText, MessageSquare } from 'lucide-react';

const MobileNavigation = () => {
  const [location] = useLocation();
  
  const navItems = [
    { icon: <Home className="h-6 w-6" />, label: 'Home', href: '/dashboard' },
    { icon: <Clock className="h-6 w-6" />, label: 'Schedule', href: '/schedule' },
    { icon: <FileText className="h-6 w-6" />, label: 'Tasks', href: '/assignments' },
    { 
      icon: <MessageSquare className="h-6 w-6" />, 
      label: 'Chat', 
      href: '/chat',
      badge: 2
    },
  ];
  
  return (
    <nav className="md:hidden flex items-center justify-around bg-white border-t border-neutral-200 py-2">
      {navItems.map((item, index) => {
        const isActive = location === item.href;
        
        return (
          <Link 
            key={index} 
            href={item.href}
            className={`flex flex-col items-center px-3 py-2 ${isActive ? 'text-primary' : 'text-neutral-500'}`}
          >
            <div className="relative">
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-xs text-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNavigation;
