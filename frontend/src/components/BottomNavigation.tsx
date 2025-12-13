
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  TrendingUp,
  Trophy,
  User,
  Award,
  Home,
  History
} from "lucide-react";
import { SharkIcon } from "@/components/ui/shark-icon";

const BottomNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Learn", path: "/learn", icon: BookOpen },
    { name: "Simulator", path: "/simulator", icon: TrendingUp },
    { name: "Time Travel", path: "/time-travel", icon: History },
    { name: "Quests", path: "/quests", icon: Award },
    { name: "Leaderboard", path: "/leaderboard", icon: Trophy },
    { name: "Profile", path: "/profile", icon: User }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg rounded-t-3xl z-50">
      <div className="relative flex justify-around items-center max-w-3xl mx-auto px-4 py-2">
        {/* Shark mascot that appears when in learning section */}
        {location.pathname.includes('/learn') && (
          <div className="absolute -top-14 left-[calc(16.6%-28px)] w-14 h-14 bg-finance rounded-full flex items-center justify-center animate-bounce">
            <SharkIcon className="h-8 w-8" />
          </div>
        )}
        
        {navItems.map((item, index) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "bottom-nav-icon group",
              location.pathname === item.path ? "active" : ""
            )}
          >
            <div className={cn(
              "h-12 w-12 flex items-center justify-center rounded-xl mb-1 transition-all duration-200",
              location.pathname === item.path 
                ? "bg-finance-light/20 text-finance-accent shadow-duolingo transform -translate-y-2" 
                : "bg-gray-100 text-gray-500 group-hover:bg-finance-light/10 group-hover:text-finance-accent"
            )}>
              <item.icon className="h-6 w-6" />
            </div>
            <span className={cn(
              "text-xs font-semibold",
              location.pathname === item.path 
                ? "text-finance" 
                : "text-gray-500 group-hover:text-finance"
            )}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
