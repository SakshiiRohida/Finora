import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SHARK_TIPS = [
  "Start with savings goals before diving into investments.",
  "Diversify your investments to balance risk and reward.",
  "Compound interest grows faster when you invest consistently.",
  "Set aside an emergency fund covering 3-6 months of expenses.",
  "Compare loan interest rates before borrowing.",
  "Review your spending weekly to spot hidden leaks.",
  "Invest in understanding financial terms—they're your toolkit!",
  "Stay calm during market swings and focus on your plan."
];

export type SharkMood = "idle" | "celebrate" | "encourage" | "wave" | "focus" | "concern";

const moodLabels: Record<SharkMood, string> = {
  idle: "Tap me for a finance tip!",
  celebrate: "Fin-tastic progress!",
  encourage: "Keep the streak alive!",
  wave: "Welcome back! Ready to swim further?",
  focus: "Let's focus on your next lesson.",
  concern: "Losses happen—let's learn from them."
};

const moodAnimations: Record<SharkMood, { scale: number; rotate: number }> = {
  idle: { scale: 1, rotate: 0 },
  celebrate: { scale: 1.1, rotate: 2 },
  encourage: { scale: 1.05, rotate: -2 },
  wave: { scale: 1.08, rotate: 6 },
  focus: { scale: 0.95, rotate: 0 },
  concern: { scale: 0.92, rotate: -4 }
};

type SharkMascotProps = {
  mood?: SharkMood;
  message?: string;
  className?: string;
};

const SharkMascot = ({ mood = "idle", message, className }: SharkMascotProps) => {
  const [showPopover, setShowPopover] = useState(false);
  const [tip, setTip] = useState(SHARK_TIPS[0]);

  useEffect(() => {
    if (!message) {
      setTip(SHARK_TIPS[Math.floor(Math.random() * SHARK_TIPS.length)]);
    }
  }, [message]);

  const displayMessage = message || moodLabels[mood] || moodLabels.idle;

  const animation = useMemo(() => moodAnimations[mood] ?? moodAnimations.idle, [mood]);

  const handleTipClick = () => {
    if (!message) {
      const randomIndex = Math.floor(Math.random() * SHARK_TIPS.length);
      setTip(SHARK_TIPS[randomIndex]);
    }
    setShowPopover(true);
  };

  return (
    <motion.div
      className={cn("relative inline-block", className)}
      animate={{ scale: animation.scale, rotate: animation.rotate }}
      transition={{ type: "spring", stiffness: 260, damping: 12 }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover open={showPopover} onOpenChange={setShowPopover}>
              <PopoverTrigger asChild>
                <button
                  onClick={handleTipClick}
                  className="p-3 rounded-full bg-white shadow-lg border border-finance/20 hover:border-finance/40 transition-all"
                  aria-label="Finny the Finance Shark"
                >
                  <motion.div
                    className="flex flex-col items-center gap-1 text-finance"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                  >
                    <span className="text-3xl leading-none">🦈</span>
                    <span className="text-[10px] font-semibold tracking-wide uppercase text-finance-dark">
                      Finny
                    </span>
                  </motion.div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-white p-3 rounded-xl shadow-lg" sideOffset={8}>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Finny says:</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{displayMessage}</p>
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Tap Finny for guidance</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className={cn("absolute -inset-1 rounded-full -z-10", {
        "bg-finance-light/30 animate-pulse-soft": mood === "idle" || mood === "encourage",
        "bg-finance/20 animate-pulse-soft": mood === "celebrate",
        "bg-amber-200/40 animate-pulse-soft": mood === "wave",
        "bg-red-200/40 animate-pulse-soft": mood === "concern",
        "bg-blue-200/40 animate-pulse-soft": mood === "focus"
      })} />
    </motion.div>
  );
};

export default SharkMascot;

