import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lessonApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { useMainLayoutContext } from "@/layouts/MainLayout";
import { cn } from "@/lib/utils";
import {
  Anchor,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Compass,
  Droplet,
  Fish,
  Lock,
  Ship,
  Shell,
  Sparkles,
  Star,
  Trophy,
  Waves
} from "lucide-react";

const formatProgressMarker = (value, completed, unlocked) => {
  if (completed) return "100% complete";
  if (!unlocked) return "Locked";
  if (value >= 90) return "90% complete";
  if (value >= 67) return "66% complete";
  if (value >= 34) return "33% complete";
  if (value > 0) return "10% complete";
  return "0% complete";
};

const GamifiedLessons = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { updateMascot, refreshProfile } = useMainLayoutContext();

  const { data, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => lessonApi.list()
  });

  const lessons = useMemo(() => {
    if (!data?.lessons) return [];
    return [...data.lessons].sort((a, b) => a.id - b.id);
  }, [data?.lessons]);

  const [unlockedLessons, setUnlockedLessons] = useState(() => new Set());
  const [completedLessons, setCompletedLessons] = useState(() => new Set());
  const [lessonProgress, setLessonProgress] = useState({});
  const [activeLessonIndex, setActiveLessonIndex] = useState(null);
  const [viewMode, setViewMode] = useState("overview");
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [justUnlockedId, setJustUnlockedId] = useState(null);
  const [celebrationMessage, setCelebrationMessage] = useState(null);
  const [quizAnswerFeedback, setQuizAnswerFeedback] = useState({});
  const [quizSubmissionWave, setQuizSubmissionWave] = useState(0);

  const activeLesson = typeof activeLessonIndex === "number" ? lessons[activeLessonIndex] : null;
  const activeLessonSlug = activeLesson?.slug;

  const lessonDetailQuery = useQuery({
    queryKey: ["gamified-lesson-detail", activeLessonSlug],
    queryFn: () => lessonApi.get(activeLessonSlug),
    enabled: Boolean(activeLessonSlug),
    staleTime: 60 * 1000
  });

  const detailLesson = lessonDetailQuery.data?.lesson;

  const fallbackSections = useMemo(() => {
    if (!activeLesson?.body) return [];
    return activeLesson.body
      .split(/\n{2,}/)
      .map((paragraph, index) => ({
        heading: `${activeLesson.title} · Section ${index + 1}`,
        content: paragraph.trim()
      }))
      .filter((section) => section.content.length);
  }, [activeLesson?.body, activeLesson?.title]);

  const sections = detailLesson?.sections ?? activeLesson?.sections ?? fallbackSections;
  const quizQuestions = detailLesson?.quiz?.questions ?? [];
  const sectionCount = sections?.length ?? 0;

  const ambientBubbles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        id: index,
        left: (index * 9 + 7) % 100,
        size: 80 + ((index % 5) + 1) * 16,
        duration: 14 + (index % 4) * 4,
        delay: index * 0.6
      })),
    []
  );

  const islandPattern = useMemo(() => {
    const pattern = [
      { key: "center", selfClass: "self-center items-center", x: 50 },
      { key: "left", selfClass: "self-start items-start", x: 18 },
      { key: "right", selfClass: "self-end items-end", x: 82 }
    ];
    return lessons.map((_, index) => pattern[index % pattern.length]);
  }, [lessons]);

  const islandIcons = [Ship, Anchor, Shell, Fish, Compass];

  useEffect(() => {
    if (!lessons.length) return;
    const unlocked = new Set();
    const completed = new Set();

    lessons.forEach((lesson, index) => {
      if (index === 0) {
        unlocked.add(lesson.id);
      }
      if (lesson.completed) {
        completed.add(lesson.id);
        unlocked.add(lesson.id);
        if (lessons[index + 1]) {
          unlocked.add(lessons[index + 1].id);
        }
      }
    });

    setUnlockedLessons((prev) => {
      const next = new Set(unlocked);
      prev.forEach((id) => next.add(id));
      return next;
    });
    setCompletedLessons((prev) => {
      const next = new Set(completed);
      prev.forEach((id) => next.add(id));
      return next;
    });
    setLessonProgress((prev) => {
      const next = { ...prev };
      lessons.forEach((lesson) => {
        next[lesson.id] = completed.has(lesson.id) ? 100 : next[lesson.id] ?? 0;
      });
      return next;
    });
  }, [lessons]);

  useEffect(() => {
    if (!activeLesson) return;
    setViewMode("sections");
    setActiveSectionIndex(0);
    setSelectedOptions({});
    setQuizResult(null);
    setCelebrationMessage(null);
    setQuizAnswerFeedback({});
    setLessonProgress((prev) => ({
      ...prev,
      [activeLesson.id]: activeLesson.completed ? 100 : Math.max(prev[activeLesson.id] ?? 0, 15)
    }));
  }, [activeLesson?.id]);

  useEffect(() => {
    if (!activeLesson || !sectionCount || viewMode !== "sections") return;
    const fraction = (activeSectionIndex + 1) / sectionCount;
    const progressValue = Math.min(85, Math.round(10 + fraction * 70));
    setLessonProgress((prev) => ({
      ...prev,
      [activeLesson.id]: activeLesson.completed ? 100 : Math.max(prev[activeLesson.id] ?? 0, progressValue)
    }));
  }, [activeSectionIndex, sectionCount, activeLesson, viewMode]);

  useEffect(() => {
    if (!activeLesson) return;
    if (viewMode === "pre-quiz") {
      setLessonProgress((prev) => ({
        ...prev,
        [activeLesson.id]: activeLesson.completed ? 100 : Math.max(prev[activeLesson.id] ?? 0, 90)
      }));
    }
    if (viewMode === "quiz") {
      setLessonProgress((prev) => ({
        ...prev,
        [activeLesson.id]: activeLesson.completed ? 100 : Math.max(prev[activeLesson.id] ?? 0, 95)
      }));
    }
    if (viewMode === "result" && quizResult?.passed) {
      setLessonProgress((prev) => ({
        ...prev,
        [activeLesson.id]: 100
      }));
    }
  }, [viewMode, activeLesson, quizResult?.passed]);

  useEffect(() => {
    if (!justUnlockedId) return;
    const timeout = setTimeout(() => setJustUnlockedId(null), 2200);
    return () => clearTimeout(timeout);
  }, [justUnlockedId]);

  const completeMutation = useMutation({
    mutationFn: (payload) =>
      lessonApi.complete(payload.lessonId, {
        score: payload.score,
        maxScore: payload.maxScore
      }),
    onSuccess: async (result, variables) => {
      toast({
        title: result.passed ? "Lesson completed!" : "Progress saved",
        description: result.passed
          ? `You earned ${result.rewardXp} XP and ${result.rewardCoins} coins.`
          : "Keep practising to unlock the next lesson."
      });

      updateMascot(
        result.passed
          ? {
              mood: "celebrate",
              message: "Brilliant momentum! Keep pushing forward."
            }
          : {
              mood: "encourage",
              message: "Almost there—review the hints and try again."
            }
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lessons"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        refreshProfile()
      ]);

      if (activeLesson) {
        setCompletedLessons((prev) => {
          const next = new Set(prev);
          if (result.passed) {
            next.add(activeLesson.id);
          }
          return next;
        });
        if (result.passed) {
          setLessonProgress((prev) => ({ ...prev, [activeLesson.id]: 100 }));
          const nextLesson = lessons[activeLessonIndex + 1];
          if (nextLesson) {
            setUnlockedLessons((prev) => {
              const next = new Set(prev);
              next.add(nextLesson.id);
              return next;
            });
            setJustUnlockedId(nextLesson.id);
          }
        }
      }

      setQuizResult({
        correctCount: variables.score,
        total: variables.maxScore,
        percent: variables.maxScore ? Math.round((variables.score / variables.maxScore) * 100) : 100,
        passed: result.passed
      });
      setCelebrationMessage(
        result.passed
          ? "Island cleared! Treasure shimmers on the horizon."
          : "Keep charting the course and try the island again."
      );
      setQuizAnswerFeedback({});
      setViewMode("result");
    },
    onError: (error) => {
      toast({
        title: "Unable to record progress",
        description: error?.message ?? "Please try again in a moment.",
        variant: "destructive"
      });
    }
  });

  const handleLessonSelect = (index) => {
    const lesson = lessons[index];
    if (!lesson) return;
    if (!unlockedLessons.has(lesson.id)) {
      toast({
        title: "Island locked",
        description: "Sail through the previous island to reveal this destination.",
        variant: "destructive"
      });
      return;
    }
    setActiveLessonIndex(index);
  };

  const handleAdvanceSection = () => {
    if (!sections?.length) {
      setViewMode("pre-quiz");
      return;
    }

    if (activeSectionIndex >= sections.length - 1) {
      setViewMode("pre-quiz");
      return;
    }

    setActiveSectionIndex((previous) => Math.min(previous + 1, sections.length - 1));
  };

  const handleStartQuiz = () => {
    if (!activeLesson) return;
    if (!quizQuestions.length) {
      completeMutation.mutate({
        lessonId: detailLesson?.id ?? activeLesson.id,
        score: 1,
        maxScore: 1
      });
      return;
    }

    setSelectedOptions({});
    setQuizAnswerFeedback({});
    setViewMode("quiz");
  };

  const handleQuizSubmit = () => {
    if (!activeLesson) return;
    if (!quizQuestions.length) {
      toast({
        title: "Quiz unavailable",
        description: "This lesson does not have quiz questions yet.",
        variant: "destructive"
      });
      return;
    }
    const unanswered = quizQuestions.some((_, index) => selectedOptions[index] === undefined);
    if (unanswered) {
      toast({
        title: "Keep going",
        description: "Answer every question before submitting.",
        variant: "destructive"
      });
      return;
    }
    const correctCount = quizQuestions.reduce((total, question, index) => {
      return total + (selectedOptions[index] === question.answer ? 1 : 0);
    }, 0);

    const feedbackMap = {};
    quizQuestions.forEach((question, index) => {
      const selected = selectedOptions[index];
      feedbackMap[index] = {
        status: selected === question.answer ? "correct" : "incorrect",
        selected,
        correct: question.answer
      };
    });
    setQuizAnswerFeedback(feedbackMap);
    setQuizSubmissionWave((prev) => prev + 1);

    completeMutation.mutate({
      lessonId: detailLesson?.id ?? activeLesson.id,
      score: correctCount,
      maxScore: quizQuestions.length
    });
  };

  const handleContinue = () => {
    const nextLesson = lessons[activeLessonIndex + 1];
    if (nextLesson && unlockedLessons.has(nextLesson.id)) {
      setActiveLessonIndex(activeLessonIndex + 1);
    } else {
      setActiveLessonIndex(null);
    }
  };

  const handleClose = () => {
    setActiveLessonIndex(null);
  };

  const renderSectionView = () => {
    if (!activeLesson) {
      return (
        <Card className="border-blue-100 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Select a lesson</CardTitle>
            <CardDescription>
              Tap a glowing node to begin. Lessons unlock one by one as you complete them.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    if (lessonDetailQuery.isLoading) {
      return (
        <Card className="border-blue-100 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Loading lesson…</CardTitle>
            <CardDescription>The next adventure is preparing its content. Hang tight!</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <Card className="border-none bg-gradient-to-br from-white/90 via-blue-50/80 to-sky-50/80 shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <CardTitle className="text-2xl font-semibold text-slate-900">{activeLesson.title}</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  {activeLesson.description}
                </CardDescription>
              </div>
              <motion.button
                type="button"
                onClick={handleClose}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                Exit
              </motion.button>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-sky-100/70 border border-blue-100 p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-400 shadow-lg flex items-center justify-center">
                <Anchor className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700">Coach tip</p>
                <p className="text-sm text-slate-600">
                  Breeze through each segment, build your streak, and unlock the next challenge.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wide">
                <span>
                  {viewMode === "quiz"
                    ? "Quiz time"
                    : viewMode === "pre-quiz"
                      ? "Prep complete"
                      : `Section ${Math.min(activeSectionIndex + 1, sectionCount)} of ${Math.max(sectionCount, 1)}`}
                </span>
                <span className="flex items-center gap-2">
                  <Droplet className="h-3.5 w-3.5 text-sky-500" />
                  <span>{Math.round(lessonProgress[activeLesson.id] ?? 0)}% full</span>
                </span>
              </div>
              <div className="relative h-4 w-full rounded-full bg-sky-100/70 shadow-inner">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                  animate={{ width: `${Math.min(lessonProgress[activeLesson.id] ?? 0, 100)}%` }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -top-1.5 h-7 w-7 rounded-full bg-white shadow-lg flex items-center justify-center text-sky-500"
                  animate={{ left: `calc(${Math.min(lessonProgress[activeLesson.id] ?? 0, 100)}% - 14px)` }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                  <Droplet className="h-4 w-4" />
                </motion.div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <AnimatePresence mode="wait">
          {viewMode === "sections" && sections?.length > 0 ? (
            <motion.div
              key={`section-${activeSectionIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border border-blue-100/80 bg-white/90 backdrop-blur shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <Waves className="h-4 w-4" />
                    <span>Wave {activeSectionIndex + 1}</span>
                  </div>
                  <CardTitle className="text-xl text-slate-900">{sections[activeSectionIndex]?.heading}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-sm text-slate-600 leading-relaxed">
                  <p className="whitespace-pre-line">{sections[activeSectionIndex]?.content}</p>
                  {sections[activeSectionIndex]?.bullets?.length ? (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 shadow-inner">
                      <p className="text-sm font-semibold text-blue-600 mb-2">Key moves</p>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                        {sections[activeSectionIndex].bullets.map((bullet, idx) => (
                          <li key={idx}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {sections[activeSectionIndex]?.keyTakeaway ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3 shadow-inner">
                      <Shell className="h-4 w-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">Treasure tip</p>
                        <p className="text-sm text-amber-700/90">{sections[activeSectionIndex]?.keyTakeaway}</p>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => setActiveSectionIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={activeSectionIndex === 0}
                >
                  Previous wave
                </Button>
                <Button
                  onClick={handleAdvanceSection}
                  className="rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-white shadow-lg hover:brightness-105 focus:ring-2 focus:ring-sky-200 transition-all"
                >
                  {activeSectionIndex >= sections.length - 1 ? (
                    <>
                      Begin quiz
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next wave
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : null}

          {viewMode === "sections" && !sections?.length ? (
            <motion.div
              key="single-body"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border border-blue-100/80 bg-white/90 backdrop-blur shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-900">Lesson overview</CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    Read through the lesson, then head into the quiz.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  {activeLesson.body
                    .split(/\n{2,}/)
                    .map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                </CardContent>
              </Card>
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setViewMode("pre-quiz")}
                  className="rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-white shadow-lg hover:brightness-105 focus:ring-2 focus:ring-sky-200 transition-all"
                >
                  Dive into quiz
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : null}

          {viewMode === "pre-quiz" ? (
            <motion.div
              key="pre-quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border border-blue-100 bg-white/95 backdrop-blur shadow-xl">
                <CardContent className="space-y-6 py-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-500 shadow-lg border-4 border-white flex items-center justify-center text-white">
                      <Star className="h-9 w-9" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-slate-900">Ready to dive into the quiz?</h3>
                      <p className="text-sm text-slate-600">
                        Plunge beneath the waves, lock in what you learned, and reel in fresh XP.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="outline"
                      className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setViewMode("sections")}
                    >
                      Review tide
                    </Button>
                    <Button
                      onClick={handleStartQuiz}
                      disabled={completeMutation.isPending}
                      className="rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-white shadow-lg hover:brightness-105 focus:ring-2 focus:ring-sky-200 transition-all"
                    >
                      Dive into quiz
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          {viewMode === "quiz" ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border border-blue-100 bg-white/95 backdrop-blur shadow-xl">
                <CardHeader>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <Trophy className="h-4 w-4" />
                    <span>Quick quiz</span>
                  </div>
                  <CardTitle className="text-xl text-slate-900">Lock in your streak</CardTitle>
                  <CardDescription>
                    Answer all questions correctly to keep unlocking new lessons.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {quizQuestions.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      This lesson doesn&apos;t have quiz questions yet. Your progress will still be counted.
                    </div>
                  ) : (
                    quizQuestions.map((question, index) => {
                      const selected = selectedOptions[index];
                      return (
                        <div key={index} className="rounded-xl border border-blue-100/80 p-4 space-y-3 bg-blue-50/40 shadow-inner">
                          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                            <span>Question {index + 1}</span>
                          </div>
                          <p className="text-sm text-slate-700">{question.question}</p>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => {
                              const feedback = quizAnswerFeedback?.[index];
                              const isSelected = selected === optionIndex;
                              const isCorrectSelection =
                                feedback && feedback.selected === optionIndex && feedback.status === "correct";
                              const isIncorrectSelection =
                                feedback && feedback.selected === optionIndex && feedback.status === "incorrect";
                              const showCorrectAnswer =
                                feedback && feedback.status === "incorrect" && optionIndex === feedback.correct;

                              return (
                                <motion.button
                                  key={`${option}-${quizSubmissionWave}`}
                                  type="button"
                                  className={cn(
                                    "w-full text-left px-4 py-2 rounded-xl border transition-all text-sm relative overflow-hidden",
                                    isCorrectSelection
                                      ? "border-emerald-400 bg-emerald-100/80 text-emerald-900 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                                      : isIncorrectSelection
                                        ? "border-rose-300 bg-rose-50/80 text-rose-900 shadow-[0_0_18px_rgba(244,63,94,0.25)]"
                                        : showCorrectAnswer
                                          ? "border-emerald-300 bg-emerald-50/80 text-emerald-900"
                                          : isSelected
                                            ? "border-blue-500 bg-blue-100/80 text-blue-900 shadow-sm"
                                            : "border-blue-100 hover:border-blue-300 hover:bg-white"
                                  )}
                                  onClick={() => {
                                    setSelectedOptions((prev) => ({
                                      ...prev,
                                      [index]: optionIndex
                                    }));
                                    if (quizAnswerFeedback[index]) {
                                      setQuizAnswerFeedback((prev) => {
                                        const next = { ...prev };
                                        delete next[index];
                                        return next;
                                      });
                                    }
                                  }}
                                  animate={
                                    isIncorrectSelection
                                      ? { x: [0, -6, 6, -3, 3, 0] }
                                      : isCorrectSelection
                                        ? { scale: [1, 1.08, 1] }
                                        : { x: 0, scale: 1 }
                                  }
                                  transition={{ duration: 0.6, ease: "easeInOut" }}
                                >
                                  {option}
                                  {isCorrectSelection ? (
                                    <motion.span
                                      className="pointer-events-none absolute -top-2 -right-2 rounded-full bg-emerald-500 text-white px-2 py-[2px] text-[10px] uppercase tracking-wide shadow-md"
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: 0.1 }}
                                    >
                                      Bubble pop!
                                    </motion.span>
                                  ) : null}
                                  {showCorrectAnswer ? (
                                    <motion.span
                                      className="pointer-events-none absolute -top-2 -right-2 rounded-full bg-emerald-400 text-white px-2 py-[2px] text-[10px] uppercase tracking-wide shadow-md"
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: 0.1 }}
                                    >
                                      Correct tide
                                    </motion.span>
                                  ) : null}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setViewMode("sections")}
                      disabled={completeMutation.isPending}
                    >
                      Review tide
                    </Button>
                    <Button
                      onClick={handleQuizSubmit}
                      disabled={completeMutation.isPending || quizQuestions.length === 0}
                      className="rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-white shadow-lg hover:brightness-105 focus:ring-2 focus:ring-sky-200 transition-all"
                    >
                      {completeMutation.isPending ? "Sending..." : "Send answers"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          {viewMode === "result" && quizResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border border-blue-100 bg-white/95 backdrop-blur shadow-xl">
                <CardContent className="space-y-6 py-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <motion.div
                      className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-500 shadow-lg border-4 border-white flex items-center justify-center text-white"
                      animate={{ rotate: quizResult.passed ? [0, 6, -6, 0] : 0, scale: quizResult.passed ? [1, 1.08, 1] : 1 }}
                      transition={{ duration: 0.8 }}
                    >
                      <Trophy className="h-9 w-9" />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold text-slate-900">
                        {quizResult.passed ? "You discovered treasure!" : "Keep charting this course!"}
                      </h3>
                      <p className="text-sm text-slate-600">
                        You scored {quizResult.correctCount} / {quizResult.total} ({quizResult.percent}%).
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-800 flex items-center gap-3 shadow-inner">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="font-semibold">
                        {quizResult.passed
                          ? "Lesson complete! The next lesson just unlocked."
                          : "Lesson recorded. Review notes and try again to unlock the next level."}
                      </p>
                    </div>
                  </div>
                  {quizQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {quizQuestions.map((question, index) => {
                        const selected = selectedOptions[index];
                        const isCorrect = selected === question.answer;
                        const attempted = selected !== undefined;
                        return (
                          <motion.div
                            key={index}
                            className={cn(
                              "rounded-xl border p-4 text-sm shadow-inner",
                              isCorrect
                                ? "border-emerald-300/80 bg-emerald-50/60 text-emerald-900"
                                : "border-rose-300/70 bg-rose-50/60 text-rose-900"
                            )}
                            animate={
                              isCorrect
                                ? { scale: [1, 1.04, 1] }
                                : { x: [-3, 3, -3, 0] }
                            }
                            transition={{ duration: isCorrect ? 1.6 : 0.4, ease: "easeInOut" }}
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <Star className="h-4 w-4" />
                              <span>Q{index + 1}. {question.question}</span>
                            </div>
                            <div className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">
                                Your answer:{" "}
                                {attempted ? question.options[selected] ?? "N/A" : "Not answered"}
                              </span>
                              {!isCorrect ? (
                                <span>
                                  Correct answer: <strong>{question.options[question.answer]}</strong>
                                </span>
                              ) : null}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="outline"
                      className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setViewMode("sections")}
                    >
                      Review island
                    </Button>
                    <Button
                      onClick={handleContinue}
                      className="rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-white shadow-lg hover:brightness-105 focus:ring-2 focus:ring-sky-200 transition-all"
                    >
                      Sail onward
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #b5e3ff, #8ec7ff, #64aafc)" }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_60%)]"
        animate={{ opacity: [0.8, 0.6, 0.8] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[url('/images/wave-pattern.svg')] opacity-10 mix-blend-overlay"
        animate={{ backgroundPositionY: ["0%", "20%", "0%"] }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
      />
      {ambientBubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className="pointer-events-none absolute rounded-full bg-white/25 blur-xl"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.left}%`,
            bottom: `${-10 - bubble.id * 2}%`
          }}
          animate={{ y: ["0%", "-40%", "0%"], opacity: [0.35, 0.65, 0.35] }}
          transition={{ repeat: Infinity, duration: bubble.duration, delay: bubble.delay, ease: "easeInOut" }}
        />
      ))}
      <div className="relative z-10 app-container py-12 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 shadow-sm border border-white/70 backdrop-blur">
              <Ship className="h-4 w-4 text-sky-600" />
              <span className="text-sm font-semibold text-blue-700">Ocean Quest</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Gamified Lessons</h1>
            <p className="text-slate-600">
              Navigate from island to island, mastering the tides of finance as you travel across the sea.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/50 bg-white/70 backdrop-blur px-6 py-5 flex flex-col gap-4 shadow-[0_18px_40px_rgba(21,94,203,0.2)]">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-lg">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700">Voyage progress</p>
                <p className="text-xs text-slate-500">Complete each island challenge to reveal the next destination.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Droplet className="h-5 w-5 text-sky-600" />
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-sky-100">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(37,99,235,0.45)]"
                  animate={{
                    width: `${lessons.length ? (Array.from(completedLessons).length / Math.max(lessons.length, 1)) * 100 : 0}%`
                  }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              </div>
              <span className="text-sm font-semibold text-blue-700">
                {lessons.length ? Math.round((Array.from(completedLessons).length / Math.max(lessons.length, 1)) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[380px,minmax(0,1fr)]">
          <div className="relative">
            <div className="sticky top-24 space-y-6">
              <Card className="border-none bg-white/70 backdrop-blur shadow-lg">
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <Sparkles className="h-4 w-4" />
                    <span>Lesson path</span>
                  </div>
                  <CardTitle className="text-lg text-slate-900">Stay on the streak</CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    Tap a circle to dive into the lesson. Locked lessons glow grey until you earn them.
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="relative flex flex-col items-center gap-12 py-6">
                <div className="absolute top-16 bottom-16 w-[6px] rounded-full bg-gradient-to-b from-blue-200 via-sky-200 to-blue-400">
                  <div className="absolute inset-x-[-10px] top-0 h-6 bg-gradient-to-b from-transparent via-blue-200/50 to-transparent blur-md" />
                </div>

                {isLoading ? (
                  <div className="text-sm text-slate-500">Charting the ocean map...</div>
                ) : (
                  lessons.map((lesson, index) => {
                    const layout = islandPattern[index] ?? islandPattern[0];
                    const Icon = islandIcons[index % islandIcons.length];
                    const isUnlocked = unlockedLessons.has(lesson.id);
                    const isCompleted = completedLessons.has(lesson.id);
                    const progressValue = lessonProgress[lesson.id] ?? (isCompleted ? 100 : 0);
                    const marker = formatProgressMarker(progressValue, isCompleted, isUnlocked);
                    const isActive = activeLesson?.id === lesson.id;
                    const nextLesson = lessons[index + 1];
                    const nextLayout = islandPattern[index + 1] ?? islandPattern[0];
                    const routeUnlocked = nextLesson ? unlockedLessons.has(nextLesson.id) : false;
                    const connectorId = `sea-route-${index}`;
                    const startX = layout?.x ?? 50;
                    const endX = nextLayout?.x ?? 50;
                    const midX = (startX + endX) / 2;

                    return (
                      <motion.div
                        key={lesson.id}
                        className={cn(
                          "relative flex w-full max-w-[240px] flex-col gap-4 px-2",
                          layout?.key === "left"
                            ? "self-start items-start text-left"
                            : layout?.key === "right"
                              ? "self-end items-end text-right"
                              : "self-center items-center text-center"
                        )}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <motion.button
                          type="button"
                          disabled={!isUnlocked}
                          onClick={() => handleLessonSelect(index)}
                          whileHover={
                            isUnlocked
                              ? {
                                  y: [-2, 4, -2],
                                  transition: { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
                                }
                              : undefined
                          }
                          whileTap={isUnlocked ? { scale: 0.96 } : undefined}
                          className={cn(
                            "relative flex h-36 w-36 items-center justify-center rounded-[36px] border border-white/50 bg-gradient-to-br shadow-[0_20px_40px_rgba(26,109,225,0.25)] focus:outline-none focus:ring-4 focus:ring-sky-200",
                            isUnlocked
                              ? "from-[#f6eac2] via-[#f7dba7] to-[#f4c987]"
                              : "from-slate-200 via-slate-300 to-slate-200 cursor-not-allowed"
                          )}
                        >
                          <motion.div
                            className="absolute inset-2 rounded-[32px] bg-gradient-to-br from-sky-100/40 via-sky-50 to-white/80"
                            animate={
                              isActive
                                ? { boxShadow: ["0 0 0 rgba(59,130,246,0.0)", "0 0 40px rgba(51,151,255,0.35)", "0 0 0 rgba(59,130,246,0.0)"] }
                                : undefined
                            }
                            transition={isActive ? { repeat: Infinity, duration: 4 } : undefined}
                          />

                          <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 rounded-[30px] bg-gradient-to-br from-[#ffe8c6] via-[#ffd9a3] to-[#ffcb87] p-4 shadow-inner">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-lg">
                              {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 line-clamp-2">{lesson.title}</span>
                            <div className="flex w-full flex-col gap-1">
                              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                                <Droplet className="h-3 w-3" />
                                <span>{marker}</span>
                              </div>
                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-sky-100">
                                <motion.div
                                  className={cn(
                                    "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r",
                                    routeUnlocked || isCompleted
                                      ? "from-sky-400 via-blue-500 to-indigo-500"
                                      : "from-slate-300 via-slate-400 to-slate-500"
                                  )}
                                  style={{ width: `${Math.min(progressValue, 100)}%` }}
                                  animate={{ width: `${Math.min(progressValue, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {!isUnlocked ? (
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center text-white/90"
                              initial={{ scale: 0.85 }}
                              animate={{ scale: [0.9, 1, 0.9] }}
                              transition={{ repeat: Infinity, duration: 2.6 }}
                            >
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/25 backdrop-blur shadow-lg">
                                <Lock className="h-6 w-6" />
                              </div>
                            </motion.div>
                          ) : null}

                          {isCompleted ? (
                            <motion.div
                              className="absolute -top-4 -right-3 rounded-full bg-white text-blue-600 p-1.5 shadow-lg"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 18 }}
                            >
                              <BadgeCheck className="h-6 w-6" />
                            </motion.div>
                          ) : null}
                        </motion.button>

                        <AnimatePresence>
                          {justUnlockedId === lesson.id ? (
                            <motion.div
                              key="unlocked"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -12 }}
                              className="rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg"
                            >
                              Island unlocked!
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        {index < lessons.length - 1 ? (
                          <motion.svg
                            key={`route-${lesson.id}`}
                            viewBox="0 0 100 80"
                            preserveAspectRatio="none"
                            className="pointer-events-none h-24 w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                          >
                            <defs>
                              <linearGradient id={`${connectorId}-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity={routeUnlocked ? 0.9 : 0.4} />
                                <stop offset="50%" stopColor="#2563eb" stopOpacity={routeUnlocked ? 0.9 : 0.4} />
                                <stop offset="100%" stopColor="#4338ca" stopOpacity={routeUnlocked ? 0.9 : 0.4} />
                              </linearGradient>
                            </defs>
                            <motion.path
                              d={`M ${startX} 10 C ${midX} 40 ${midX} 40 ${endX} 70`}
                              fill="transparent"
                              stroke={`url(#${connectorId}-gradient)`}
                              strokeWidth={routeUnlocked ? 3 : 2}
                              strokeDasharray="6 8"
                              strokeLinecap="round"
                              initial={{ strokeDashoffset: 120 }}
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: 2.2, ease: "easeInOut", repeat: routeUnlocked ? Infinity : 0, repeatDelay: 1.4 }}
                              className={routeUnlocked ? "drop-shadow-[0_0_4px_rgba(59,130,246,0.65)]" : ""}
                            />
                          </motion.svg>
                        ) : null}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div>{renderSectionView()}</div>
        </div>

        <AnimatePresence>
          {celebrationMessage ? (
            <motion.div
              key="celebration-banner"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="rounded-2xl bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-white shadow-xl px-6 py-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/30 flex items-center justify-center">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Level unlocked</p>
                  <p className="text-sm">{celebrationMessage}</p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GamifiedLessons;


