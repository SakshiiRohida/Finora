
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, BookOpen, TrendingUp, User, Clock } from "lucide-react";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SharkIcon } from "@/components/ui/shark-icon";

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

const Sidebar = ({ visible, onClose }: SidebarProps) => {
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (visible && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  // Close sidebar when changing routes on mobile
  useEffect(() => {
    if (visible && window.innerWidth < 768) {
      onClose();
    }
  }, [location.pathname, visible, onClose]);

  const navItems = [
    { name: "Learn", path: "/learn", icon: BookOpen },
    { name: "Stock Simulator", path: "/simulator", icon: TrendingUp },
    { name: "Time Travel", path: "/time-travel", icon: Clock },
    { name: "Profile", path: "/profile", icon: User }
  ];

  return (
    <>
      {/* Sidebar overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen w-[280px] bg-finance-dark text-white border-r border-finance/20 z-50 shadow-lg md:shadow-none transition-transform duration-300 ease-in-out",
          visible ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-finance/20">
            <Link to="/" className="flex items-center gap-2" onClick={onClose}>
              <SharkIcon className="h-6 w-6 text-finance-light" />
              <span className="text-lg font-bold">Finny Finance</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-white hover:bg-finance/20" 
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      location.pathname === item.path 
                        ? "bg-finance text-white" 
                        : "hover:bg-finance/20 text-white/80 hover:text-white"
                    )}
                    onClick={onClose}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-finance/20 mt-auto">
            <div className="flex flex-col rounded-lg bg-finance/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <SharkIcon className="h-5 w-5 text-finance-light animate-pulse-soft" />
                <span className="font-medium">Tip from Finny</span>
              </div>
              <p className="text-sm text-white/70">
                Consistency is key! Complete a lesson daily to build your streak and earn bonus coins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
