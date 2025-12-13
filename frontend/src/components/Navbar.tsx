
import { Link } from "react-router-dom";
import { Menu, User, Coins, TrendingUp, Clock, LineChart as LineChartIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  toggleSidebar: () => void;
  streak: number;
  coins: number;
}

const Navbar = ({ toggleSidebar, streak, coins }: NavbarProps) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b shadow-sm">
      <div className="app-container">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={toggleSidebar}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
              <div className="relative">
                <span className="text-finance-dark text-2xl font-bold">SharkWise</span>
                <span className="text-finance-light text-2xl font-bold">.</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex md:gap-6 lg:gap-10">
            <Link
              to="/learn"
              className="flex items-center gap-2 text-sm font-medium hover:text-finance transition-colors"
            >
              Learn
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1 text-sm font-medium hover:text-finance">
                  Simulators
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/simulator" className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4 text-finance" />
                    Stock Simulator
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/time-travel" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-finance" />
                    Time Travel
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <div className="h-6 w-6 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-finance-success" />
                    </div>
                    <span className="text-muted-foreground">{streak} day streak</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your learning streak!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <div className="h-6 w-6 flex items-center justify-center">
                      <Coins className="h-4 w-4 text-finance-warning" />
                    </div>
                    <span className="text-muted-foreground">{coins}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coins for trading in simulator</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Link to="/profile">
              <Avatar className="h-8 w-8 transition-transform hover:scale-105">
                <AvatarFallback className="bg-finance text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
