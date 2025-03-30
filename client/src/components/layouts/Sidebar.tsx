import { useContext } from 'react';
import { Link, useLocation } from 'wouter';
import { UserContext } from '@/main';
import { 
  Home, Clock, FileText, BarChart2, 
  HelpCircle, Receipt, Award, MessageSquare, 
  Bell, Settings
} from 'lucide-react';

const Sidebar = () => {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [location] = useLocation();
  
  // Menu items based on user role
  const getMenuItems = () => {
    const items = [
      { 
        label: 'Main', 
        items: [
          { icon: <Home className="h-5 w-5 mr-3" />, label: 'Dashboard', href: '/dashboard' },
          { icon: <Clock className="h-5 w-5 mr-3" />, label: 'Schedule', href: '/schedule' },
          { icon: <FileText className="h-5 w-5 mr-3" />, label: 'Assignments', href: '/assignments' },
          { icon: <BarChart2 className="h-5 w-5 mr-3" />, label: 'Grades', href: '/grades' },
          { icon: <HelpCircle className="h-5 w-5 mr-3" />, label: 'Requests', href: '/requests' },
        ]
      },
      {
        label: 'Files & Documents',
        items: [
          { icon: <Receipt className="h-5 w-5 mr-3" />, label: 'Invoices', href: '/invoices' },
          { icon: <Award className="h-5 w-5 mr-3" />, label: 'Certificates', href: '/certificates' },
        ]
      },
      {
        label: 'Communication',
        items: [
          { icon: <MessageSquare className="h-5 w-5 mr-3" />, label: 'Chat', href: '/chat' },
          { icon: <Bell className="h-5 w-5 mr-3" />, label: 'Notifications', href: '/notifications' },
        ]
      }
    ];
    
    // Add admin-specific menu items
    if (user?.role === 'admin') {
      items[0].items.push({ 
        icon: <Settings className="h-5 w-5 mr-3" />, 
        label: 'User Management', 
        href: '/users' 
      });
    }
    
    return items;
  };
  
  const menuItems = getMenuItems();
  
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-100 shadow-sm">
      {/* Logo and App Name */}
      <div className="p-4 border-b border-neutral-100 flex items-center">
        <div className="bg-primary p-2 rounded-lg mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-xl font-medium font-heading text-neutral-700">EduPortal</h1>
      </div>
      
      {/* Navigation Items */}
      <div className="py-4 flex-1 overflow-y-auto">
        {menuItems.map((section, idx) => (
          <div key={idx} className="mb-6">
            <div className="px-4 mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {section.label}
            </div>
            <nav className="space-y-1 px-2">
              {section.items.map((item, itemIdx) => {
                const isActive = location === item.href;
                return (
                  <Link 
                    key={itemIdx} 
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${isActive 
                      ? 'bg-primary-light bg-opacity-10 text-primary' 
                      : 'text-neutral-700 hover:bg-primary-light hover:bg-opacity-10 hover:text-primary transition-all'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {item.label === 'Notifications' && (
                      <span className="absolute right-3 flex items-center justify-center h-5 w-5 bg-error text-white text-xs rounded-full">3</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      
      {/* User Profile Section */}
      <div className="border-t border-neutral-100 p-4">
        <div className="flex items-center">
          <img 
            src={`https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random`} 
            alt="User avatar" 
            className="h-10 w-10 rounded-full mr-3"
          />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-neutral-700">
              {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-xs text-neutral-400 capitalize">{user?.role}</p>
          </div>
          <button className="text-neutral-400 hover:text-neutral-700">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
