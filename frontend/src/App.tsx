
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import LearnPage from "./pages/LearnPage";
import CoursePage from "./pages/CoursePage";
import ProfilePage from "./pages/ProfilePage";
import TradingExamplesPage from "./pages/TradingExamplesPage";
import SimulatorPage from "./pages/SimulatorPage";
import TimeTravel from "./pages/TimeTravel";
import GamifiedCourse from "./pages/GamifiedCourse";
import GamifiedLessons from "./pages/GamifiedLessons";
import LeaderboardPage from "./pages/LeaderboardPage";
import QuestsPage from "./pages/QuestsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="learn" element={<LearnPage />} />
            <Route path="learn/:courseId" element={<CoursePage />} />
            <Route path="learn/gamified" element={<GamifiedCourse />} />
            <Route path="gamified-lessons" element={<GamifiedLessons />} />
            <Route path="trading-examples" element={<TradingExamplesPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="time-travel" element={<TimeTravel />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="quests" element={<QuestsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
