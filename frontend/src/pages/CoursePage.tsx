import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgePercent,
  BookOpen,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Lightbulb,
  ListChecks,
  Trophy
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { lessonApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LessonSection } from "@/lib/localAppState";
import { Progress } from "@/components/ui/progress";

type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
};

const CoursePage = () => {
  const { courseId } = useParams();
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const quizCardRef = useRef<HTMLDivElement>(null);

  const lessonQuery = useQuery({
    queryKey: ["lesson", courseId],
    queryFn: () => {
      if (!courseId) {
        throw new Error("Missing lesson identifier");
      }
      return lessonApi.get(courseId);
    },
    enabled: Boolean(courseId)
  });

  const completeMutation = useMutation({
    mutationFn: (score: { score: number; maxScore: number }) =>
      lessonApi.complete(lessonQuery.data?.lesson.id ?? 0, score),
    onSuccess: (result) => {
      toast({
        title: result.passed ? "Lesson completed!" : "Lesson recorded",
        description: `Knowledge Index updated to ${result.scorePercent.toFixed(0)}%.`
      });
      setQuizSubmitted(true);
    },
    onError: (error: any) => {
      toast({
        title: "Unable to save progress",
        description: error?.message ?? "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const lesson = lessonQuery.data?.lesson;
  const sections: LessonSection[] = useMemo(() => lesson?.sections ?? [], [lesson?.sections]);
  const quizQuestions: QuizQuestion[] = useMemo(() => lesson?.quiz?.questions ?? [], [lesson?.quiz?.questions]);
  const hasSections = sections.length > 0;
  const currentSection = hasSections ? sections[Math.min(activeSection, sections.length - 1)] : null;
  const sectionProgress = hasSections ? ((activeSection + 1) / sections.length) * 100 : 100;

  useEffect(() => {
    setSelectedOptions({});
    setFeedback({});
    setQuizSubmitted(false);
    setActiveSection(0);
    setQuizUnlocked(!sections.length);
  }, [lesson?.id, sections.length]);

  const scoreSummary = useMemo(() => {
    if (!quizSubmitted) return null;
    const correctCount = quizQuestions.reduce((sum, question, index) => {
      return sum + (selectedOptions[index] === question.answer ? 1 : 0);
    }, 0);
    const percent = quizQuestions.length ? Math.round((correctCount / quizQuestions.length) * 100) : 0;
    return { correctCount, percent };
  }, [quizQuestions, quizSubmitted, selectedOptions]);

  if (lessonQuery.isLoading) {
    return (
      <div className="app-container py-16 text-center text-muted-foreground">
        Loading lesson…
      </div>
    );
  }

  if (lessonQuery.isError || !lesson) {
    return (
      <div className="text-center py-12 space-y-4">
        <h1 className="text-2xl font-bold">Course Not Found</h1>
        <p className="text-muted-foreground">
          The course you’re looking for doesn’t exist or has been removed.
        </p>
        <Button asChild>
          <Link to="/learn">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to courses
          </Link>
        </Button>
      </div>
    );
  }
  
  const handleSubmit = () => {
    if (!quizUnlocked) {
      toast({
        title: "Lesson in progress",
        description: "Work through the lesson notes before starting the quiz.",
        variant: "destructive"
      });
      return;
    }
    if (!quizQuestions.length) {
      toast({
        title: "Quiz unavailable",
        description: "This lesson does not have a quiz yet.",
        variant: "destructive"
      });
      return;
    }
    const unanswered = quizQuestions.some((_, index) => selectedOptions[index] === undefined);
    if (unanswered) {
      toast({
        title: "Incomplete quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive"
      });
      return;
    }
    const feedbackMessages: Record<number, string> = {};
    const correctAnswers = quizQuestions.reduce((sum, question, index) => {
      return sum + (selectedOptions[index] === question.answer ? 1 : 0);
    }, 0);
    quizQuestions.forEach((question, index) => {
      const selected = selectedOptions[index];
      if (selected === question.answer) {
        feedbackMessages[index] = "✅ Correct!";
      } else {
        feedbackMessages[index] = `❌ Incorrect. Correct answer: ${question.options[question.answer]}`;
      }
    });
    setFeedback(feedbackMessages);
    completeMutation.mutate({
      score: correctAnswers,
      maxScore: quizQuestions.length
    });
  };

  const handleNextSection = () => {
    if (!hasSections) return;
    if (activeSection >= sections.length - 1) {
      if (!quizUnlocked) {
        setQuizUnlocked(true);
        toast({
          title: "Quiz unlocked",
          description: "Finny is ready with your quiz. Good luck!"
        });
      }
      requestAnimationFrame(() => {
        quizCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    setActiveSection((prev) => Math.min(prev + 1, sections.length - 1));
  };

  const handlePrevSection = () => {
    if (!hasSections) return;
    setActiveSection((prev) => Math.max(prev - 1, 0));
  };
  
  return (
    <div className="app-container py-10 space-y-6">
      <Link
        to="/learn"
        className="inline-flex items-center gap-2 text-sm text-finance hover:text-finance-dark font-medium transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to courses
          </Link>

      <Card className="overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2">
            <img src={lesson.image} alt={lesson.title} className="h-full w-full object-cover" />
        </div>
          <div className="md:w-1/2">
            <CardHeader className="space-y-4">
              <div className="space-y-2">
                <Badge variant="secondary">{lesson.category}</Badge>
                <CardTitle className="text-3xl">{lesson.title}</CardTitle>
                <CardDescription>{lesson.description}</CardDescription>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-finance" />
                  <span>{lesson.xp} XP</span>
              </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-finance" />
                  <span className="capitalize">{lesson.difficulty}</span>
            </div>
              </div>
            </CardHeader>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lesson journey</CardTitle>
          <CardDescription>
            Move through each section at your own pace. Finny unlocks the quiz when you finish the notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {hasSections ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>
                    Section {activeSection + 1} of {sections.length}
                  </span>
                  <span>{Math.round(sectionProgress)}% complete</span>
                </div>
                <Progress value={sectionProgress} className="h-2" />
              </div>

              <div className="rounded-2xl border border-finance-light/40 bg-finance-light/10 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-finance" />
                  <h3 className="text-lg font-semibold">{currentSection?.heading}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {currentSection?.content}
                </p>
                {currentSection?.bullets && currentSection.bullets.length > 0 && (
                  <div className="rounded-xl bg-white border border-finance-light/40 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-finance">
                      <ListChecks className="h-4 w-4" />
                      <span className="text-sm font-semibold">Key moves</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                      {currentSection.bullets.map((bullet, index) => (
                        <li key={index}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentSection?.keyTakeaway && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 text-sm">
                    <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-700">Finny’s takeaway</p>
                      <p className="text-amber-700/90">{currentSection.keyTakeaway}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevSection}
                  disabled={activeSection === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={handleNextSection}>
                  {activeSection >= sections.length - 1 ? (
                    <>
                      {quizUnlocked ? (
                        <>
                          Go to quiz
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Unlock quiz
                          <Check className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      Next section
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
              {lesson.body
                .split(/\n{2,}/)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
          
      <div className="relative" ref={quizCardRef}>
        <Card className={cn(!quizUnlocked && "opacity-60 pointer-events-none")}>
          <CardHeader>
            <CardTitle>Quick quiz</CardTitle>
            <CardDescription>
              Answer all questions to complete the lesson. Passing score: {lesson.quiz?.passingPercent ?? 70}%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
          {quizQuestions.length === 0 ? (
            <div className="text-sm text-muted-foreground">Quiz coming soon. Check back later!</div>
          ) : (
            quizQuestions.map((question, index) => {
              const selected = selectedOptions[index];
              return (
                <Card key={index} className="border-finance-light/40">
                  <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2">
                      <BadgePercent className="h-4 w-4 text-finance" />
                      <h3 className="font-semibold">Question {index + 1}</h3>
                  </div>
                    <p className="text-sm">{question.question}</p>
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => {
                        const isSelected = selected === optionIndex;
                        const isCorrect = quizSubmitted && optionIndex === question.answer;
                        const isIncorrect = quizSubmitted && isSelected && optionIndex !== question.answer;
                        return (
                          <button
                            key={option}
                            type="button"
                            className={cn(
                              "w-full text-left px-4 py-2 border rounded-lg transition-colors text-sm",
                              isSelected
                                ? "border-finance bg-finance/10"
                                : "border-finance-light/40 hover:border-finance-light",
                              isCorrect && "border-finance-success text-finance-success bg-finance-success/10",
                              isIncorrect && "border-finance-danger text-finance-danger bg-finance-danger/10"
                            )}
                            onClick={() => {
                              if (quizSubmitted) return;
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [index]: optionIndex
                              }));
                            }}
                          >
                            {option}
                          </button>
                        );
                      })}
                </div>
                    {quizSubmitted && feedback[index] ? (
                      <p className="text-sm font-medium text-muted-foreground">{feedback[index]}</p>
                    ) : null}
            </CardContent>
          </Card>
              );
            })
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link to="/learn">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to lessons
              </Link>
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={completeMutation.isLoading || !quizQuestions.length || quizSubmitted || !quizUnlocked}
            >
              {quizSubmitted ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Quiz submitted
                </>
              ) : (
                <>
                  Submit quiz
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
                </Button>
          </div>
        </CardContent>
      </Card>
        {!quizUnlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm rounded-3xl border border-dashed border-finance-light/60 text-center px-6">
            <div className="flex items-center gap-2 text-finance">
              <BookOpen className="h-5 w-5" />
              <span className="font-semibold text-sm uppercase tracking-wide">Keep swimming</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Read through each lesson section with Finny to unlock this quiz.
            </p>
          </div>
        )}
      </div>

      {scoreSummary && (
        <Card className="bg-finance-light/10 border-finance-light/40">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-finance" />
                Great job!
              </h3>
              <p className="text-sm text-muted-foreground">
                You answered {scoreSummary.correctCount} of {quizQuestions.length} correctly ({scoreSummary.percent}%).
              </p>
            </div>
            <Separator orientation="vertical" className="h-12 hidden md:block" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-finance" />
                <span>XP earned: {lesson.xp}</span>
              </div>
            </div>
          </CardContent>
        </Card>
          )}
    </div>
  );
};

export default CoursePage;
