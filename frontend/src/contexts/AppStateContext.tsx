import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { localAppState } from "@/lib/localAppState";
import { leaderboardApi, profileApi } from "@/lib/api";

type ProfileSnapshot = ReturnType<typeof localAppState.getProfile>;

type AppStateContextValue = {
  profile: ProfileSnapshot | null;
  loading: boolean;
  rank: number | null;
  refreshProfile: () => Promise<void>;
  resetProgress: () => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

const computeRank = () => {
  const { currentUser } = localAppState.getLeaderboard("xp");
  return currentUser?.rank ?? null;
};

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

const loadProfile = useCallback(async () => {
  setLoading(true);
  try {
    const localProfile = localAppState.getProfile();

    try {
      const remote = await profileApi.me();
      localProfile.xp = remote.profile.xp;
      localProfile.coins = remote.profile.coins;
      localProfile.streakCount = remote.profile.streakCount;
      localProfile.knowledgeIndex = remote.profile.knowledgeIndex ?? localProfile.knowledgeIndex;
    } catch (error) {
      console.warn("[AppState] failed to fetch remote profile, using local snapshot", error);
    }

    setProfile(localProfile);

    try {
      const leaderboard = await leaderboardApi.list("xp");
      setRank(leaderboard.currentUser?.rank ?? null);
    } catch (error) {
      console.warn("[AppState] failed to fetch leaderboard rank", error);
      setRank(computeRank());
    }
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

const refreshProfile = useCallback(async () => {
  await loadProfile();
}, [loadProfile]);

const resetProgress = useCallback(() => {
  localAppState.reset();
  loadProfile();
}, [loadProfile]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      rank,
      refreshProfile,
      resetProgress
    }),
    [profile, loading, rank, refreshProfile, resetProgress]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
};


