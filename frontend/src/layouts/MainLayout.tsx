import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";
import BottomNavigation from "@/components/BottomNavigation";
import DashboardHeader from "@/components/DashboardHeader";
import { SharkIcon } from "@/components/ui/shark-icon";
import { useAppState } from "@/contexts/AppStateContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import type { SharkMood } from "@/components/SharkMascot";

export type MainLayoutContext = {
  updateMascot: (state: { mood: SharkMood; message?: string }) => void;
  refreshProfile: () => Promise<void>;
};

const MainLayout = () => {
  const location = useLocation();
  const { profile, resetProgress, rank, refreshProfile, loading } = useAppState();
  const { toast } = useToast();
  const [mascotState, setMascotState] = useState<{ mood: SharkMood; message?: string }>({
    mood: "idle"
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const updateMascot = useCallback(
    (state: { mood: SharkMood; message?: string }) => {
      setMascotState(state);
      if (state.mood === "celebrate") {
        toast({
          title: "Fin-tastic job!",
          description: state.message || "Finny is impressed with your dedication."
        });
      }
      if (state.mood === "concern") {
        toast({
          title: "Every fin counts",
          description: state.message || "Losses teach great lessons. Let's keep learning!",
        });
      }
    },
    [toast]
  );

  const headerProps = useMemo(() => {
    if (!profile) return null;
    return {
      name: profile.name,
      xp: profile.xp,
      coins: profile.coins,
      streak: profile.streakCount,
      knowledgeIndex: profile.knowledgeIndex,
      rank,
      mascot: mascotState
    };
  }, [profile, rank, mascotState]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <span className="text-sm text-muted-foreground">Loading your dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="app-container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <SharkIcon className="hidden sm:block h-12 w-12" />
            <div>
              <p className="text-sm text-muted-foreground">Finora · guided by Finny</p>
              <h2 className="text-lg font-semibold">Gamified finance academy</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted-foreground">
              Knowledge Index · {profile ? `${profile.knowledgeIndex.toFixed(1)}%` : "--"} · Data stored locally
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetProgress();
                toast({
                  title: "Progress reset",
                  description: "Local stats cleared. Start fresh with Finny!"
                });
              }}
            >
              Reset Progress
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="app-container py-6 space-y-6 animate-fade-in">
          {location.pathname === "/" && headerProps && <DashboardHeader {...headerProps} />}
          <Outlet context={{ updateMascot, refreshProfile }} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export const useMainLayoutContext = () => useOutletContext<MainLayoutContext>();

export default MainLayout;

