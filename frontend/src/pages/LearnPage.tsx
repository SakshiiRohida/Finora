import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import CourseMap from "@/components/CourseMap";
import StockProgress from "@/components/StockProgress";
import { lessonApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useMainLayoutContext } from "@/layouts/MainLayout";
import type { LessonCompletionResult, LessonState } from "@/lib/localAppState";

const categoryImages: Record<string, string> = {
  Banking: "https://images.unsplash.com/photo-1579621970795-87facc2f976d",
  Savings: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e",
  Investing: "https://images.unsplash.com/photo-1535320903710-d993d3d77d29",
  Insurance: "https://images.unsplash.com/photo-1502219422320-9ca47796d03b",
  "Stock Markets": "https://images.unsplash.com/photo-1559526324-593bc073d938",
  Careers: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d"
};

const fallbackImage = "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a";

type LessonQuiz = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

const lessonQuizzes: Record<string, LessonQuiz> = {
  "bank-account-basics": {
    question: "What is the safest reason to keep an emergency fund in a savings account rather than your main spending account?",
    options: [
      "It earns high stock market returns",
      "It keeps your emergency money separated and easily accessible",
      "Banks charge you a fee for using your main account",
      "It doubles your money every month"
    ],
    answer: 1,
    explanation: "Keeping emergency funds separated ensures the money is accessible but not accidentally spent on day-to-day expenses."
  },
  "building-an-emergency-fund": {
    question: "How many months of essential expenses is a common target for an emergency fund?",
    options: [
      "One month",
      "Three to six months",
      "Twelve to fifteen months",
      "No emergency fund is needed"
    ],
    answer: 1,
    explanation: "Most advisors recommend saving three to six months of essential expenses to cover job loss or unexpected bills."
  },
  "introduction-to-mutual-funds": {
    question: "What is one major benefit of investing through mutual funds?",
    options: [
      "Guaranteed returns",
      "Professional management and diversification",
      "Zero risk of loss",
      "They are only available to large investors"
    ],
    answer: 1,
    explanation: "Mutual funds pool money from many investors, providing diversification and professional management."
  },
  "understanding-health-insurance": {
    question: "What is a deductible in a health insurance policy?",
    options: [
      "The maximum the insurer pays each year",
      "The amount you pay before the insurer covers eligible expenses",
      "The monthly premium",
      "A bonus the insurer pays you for staying healthy"
    ],
    answer: 1,
    explanation: "A deductible is the amount you must pay out-of-pocket before your insurer starts covering eligible healthcare costs."
  },
  "stock-market-starter": {
    question: "Which investing approach helps reduce risk during volatile markets?",
    options: [
      "Investing all your money into one trending stock",
      "Dollar-cost averaging into a diversified portfolio",
      "Timing the market by guessing short-term moves",
      "Borrowing money to increase position sizes"
    ],
    answer: 1,
    explanation: "Dollar-cost averaging into a diversified portfolio reduces the impact of volatility and avoids concentrating risk in a single stock."
  },
  "careers-in-fintech": {
    question: "Which skill combination is most valuable for a fintech career?",
    options: [
      "Only advanced accounting",
      "Programming skills with financial domain knowledge",
      "Only marketing skills",
      "The ability to shout loudly on trading floors"
    ],
    answer: 1,
    explanation: "Fintech roles value professionals who understand both technology (like programming) and financial concepts so they can build useful solutions."
  }
};

const LearnPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { updateMascot, refreshProfile } = useMainLayoutContext();

  const { data, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => lessonApi.list()
  });

  const lessons = useMemo<LessonState[]>(() => data?.lessons ?? [], [data]);

  const completeMutation = useMutation<
    LessonCompletionResult,
    Error,
    { lessonId: number; score: number; maxScore: number; accuracy: number }
  >({
    mutationFn: (payload) =>
      lessonApi.complete(payload.lessonId, {
        score: payload.score,
        maxScore: payload.maxScore,
        accuracy: payload.accuracy
      }),
    onSuccess: async (response, variables) => {
      const accuracy = variables?.accuracy ?? 1;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("finora:lastAccuracy", String(accuracy));
      }
      toast({
        title: "Lesson completed!",
        description: `You earned ${response.rewardXp} XP and ${response.rewardCoins} coins.`,
      });
      updateMascot(
        response.mascotEvent.type === "streak_milestone"
          ? {
              mood: "celebrate",
              message: `🔥 ${response.mascotEvent.streakCount}-day streak! Finny is doing a happy twirl.`
            }
          : {
              mood: "celebrate",
              message: "Finny loved your dedication. Keep going!"
            }
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lessons"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        refreshProfile()
      ]);
      setActiveQuiz(null);
      setSelectedOption("");
    },
    onError: (error) => {
      toast({
        title: "Something went wrong",
        description: error?.message || "Unable to mark lesson complete.",
        variant: "destructive"
      });
      setActiveQuiz(null);
      setSelectedOption("");
    }
  });

  const filteredLessons = useMemo<LessonState[]>(() => {
    if (!searchQuery) return lessons;
    const query = searchQuery.toLowerCase();
    return lessons.filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(query) ||
        lesson.body.toLowerCase().includes(query) ||
        lesson.category.toLowerCase().includes(query)
    );
  }, [lessons, searchQuery]);

  const completedCount = lessons.filter((lesson) => lesson.completed).length;

  const categories = useMemo(() => {
    const unique = new Set<string>();
    lessons.forEach((lesson) => unique.add(lesson.category));
    return Array.from(unique);
  }, [lessons]);

  const [activeQuiz, setActiveQuiz] = useState<{ lesson: LessonState; quiz: LessonQuiz } | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");

  const handleLessonCompleteClick = (lesson: LessonState) => {
    const quiz = lessonQuizzes[lesson.slug];
    if (quiz) {
      setActiveQuiz({ lesson, quiz });
      setSelectedOption("");
      return;
    }

    completeMutation.mutate({
      lessonId: lesson.id,
      score: 1,
      maxScore: 1,
      accuracy: 1
    });
  };

  const handleQuizSubmit = () => {
    if (!activeQuiz) return;
    if (!selectedOption) {
      toast({
        title: "Choose an answer",
        description: "Select the option you think is correct before submitting.",
        variant: "destructive"
      });
      return;
    }

    const selectedIndex = Number(selectedOption);
    const isCorrect = selectedIndex === activeQuiz.quiz.answer;
    const score = isCorrect ? 1 : 0;
    const maxScore = 1;
    const accuracy = score / maxScore;

    toast({
      title: isCorrect ? "Correct!" : "Let's review",
      description: activeQuiz.quiz.explanation,
      variant: isCorrect ? "default" : "destructive"
    });

    completeMutation.mutate({
      lessonId: activeQuiz.lesson.id,
      score,
      maxScore,
      accuracy
    });
  };

  return (
    <>
      <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Learn Finance</h1>
          <p className="text-muted-foreground">Pick a lesson and earn XP to grow your streak.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/gamified-lessons">Try the gamified lesson path</Link>
        </Button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <CourseMap courseName="Finance Foundations" totalLessons={lessons.length || 1} completedLessons={completedCount} />
        <StockProgress coursesCompleted={completedCount} totalCourses={lessons.length || 1} stockGrowth={completedCount * 8} />
      </div>

      <Card className="bg-gradient-to-r from-finance to-finance-accent text-white">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">New quests unlock after each lesson</CardTitle>
            <CardDescription className="text-white/80">
              Complete lessons to earn coins, XP, and unlock simulator boosts.
            </CardDescription>
          </div>
          <Button variant="secondary" className="bg-white text-finance hover:bg-white/90" asChild>
            <Link to="/quests">
              View active quests
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search lessons..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="all">All lessons</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-0 space-y-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading lessons...</div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {filteredLessons.map((lesson) => (
                <Card key={lesson.id} className="border border-finance-light/30 hover:border-finance-light transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{lesson.category}</Badge>
                      {lesson.completed && (
                        <span className="flex items-center text-xs text-finance-success gap-1 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg">{lesson.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {lesson.description ?? lesson.body}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>XP reward: <strong>{lesson.xp}</strong></span>
                      <span>Difficulty: <strong className="capitalize">{lesson.difficulty}</strong></span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button variant="outline" asChild>
                        <Link to={`/learn/${lesson.slug}`}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          View lesson
                        </Link>
                      </Button>
                      <Button
                        disabled={lesson.completed || completeMutation.isPending}
                        onClick={() => handleLessonCompleteClick(lesson)}
                      >
                        {lesson.completed ? "Completed" : "Mark complete"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && filteredLessons.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-10 w-10 text-finance mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No lessons match your search</h3>
              <p className="text-muted-foreground">Try adjusting your keywords or explore another category.</p>
            </div>
          )}
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-0 space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {filteredLessons
                .filter((lesson) => lesson.category === category)
                .map((lesson) => (
                  <Card key={lesson.id} className="border border-finance-light/30">
                    <CardHeader>
                      <CardTitle className="text-lg">{lesson.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {lesson.description ?? lesson.body}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>XP reward: <strong>{lesson.xp}</strong></span>
                        <span>
                          Difficulty: <strong className="capitalize">{lesson.difficulty}</strong>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Button variant="outline" asChild>
                          <Link to={`/learn/${lesson.slug}`}>Open lesson</Link>
                        </Button>
                        <Button
                          size="sm"
                          disabled={lesson.completed || completeMutation.isPending}
                          onClick={() => handleLessonCompleteClick(lesson)}
                        >
                          {lesson.completed ? "Completed" : "Mark complete"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      </div>

      <Dialog
        open={Boolean(activeQuiz)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveQuiz(null);
            setSelectedOption("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeQuiz ? `Quick Quiz: ${activeQuiz.lesson.title}` : "Quick Quiz"}
            </DialogTitle>
          </DialogHeader>
          {activeQuiz && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{activeQuiz.quiz.question}</p>
              <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-3">
                {activeQuiz.quiz.options.map((option, idx) => {
                  const optionId = `quiz-option-${idx}`;
                  return (
                    <div
                      key={optionId}
                      className="flex items-center space-x-3 rounded-lg border border-finance-light/30 p-3 hover:border-finance transition-colors"
                    >
                      <RadioGroupItem value={String(idx)} id={optionId} />
                      <Label htmlFor={optionId} className="text-sm leading-snug cursor-pointer flex-1">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setActiveQuiz(null);
                setSelectedOption("");
              }}
              disabled={completeMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleQuizSubmit} disabled={completeMutation.isPending}>
              {completeMutation.isPending ? "Saving..." : "Submit Answer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LearnPage;
