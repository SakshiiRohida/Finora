
import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Heart, Star, Trophy, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import CourseProgress from '@/components/CourseProgress';
import LessonCard from '@/components/LessonCard';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  explanation: string;
  options: QuizOption[];
}

const GamifiedCoursePage = () => {
  const [currentModule, setCurrentModule] = useState(0);
  const [lives, setLives] = useState(5);
  const [xp, setXp] = useState(0);
  const [streakDays, setStreakDays] = useState(3);
  const [inQuiz, setInQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  // Sample course data
  const courseModules = [
    {
      id: "module-1",
      title: "Introduction to Investing",
      lessons: [
        {
          id: "lesson-1-1",
          title: "What is Investing?",
          description: "Learn the fundamental concepts of investing and why it's important for your financial future.",
          duration: "5 min",
          xpReward: 50,
          status: "completed" as const
        },
        {
          id: "lesson-1-2",
          title: "Types of Investment Accounts",
          description: "Explore different account types including 401(k), IRA, and taxable brokerage accounts.",
          duration: "8 min",
          xpReward: 75,
          status: "active" as const
        },
        {
          id: "lesson-1-3",
          title: "Risk and Return",
          description: "Understand the relationship between risk and potential returns in different investments.",
          duration: "10 min",
          xpReward: 100,
          status: "locked" as const
        }
      ]
    },
    {
      id: "module-2",
      title: "Stock Market Basics",
      lessons: [
        {
          id: "lesson-2-1",
          title: "How Stocks Work",
          description: "Learn what stocks represent and how the stock market functions.",
          duration: "7 min",
          xpReward: 75,
          status: "locked" as const
        },
        {
          id: "lesson-2-2",
          title: "Reading Stock Charts",
          description: "Understand how to interpret stock price charts and common patterns.",
          duration: "12 min",
          xpReward: 125,
          status: "locked" as const
        },
        {
          id: "lesson-2-3",
          title: "Stock Valuation Methods",
          description: "Learn basic methods for determining if a stock is fairly valued.",
          duration: "15 min",
          xpReward: 150,
          status: "locked" as const
        }
      ]
    }
  ];
  
  // Sample quiz questions
  const quizQuestions: QuizQuestion[] = [
    {
      id: "q1",
      question: "What is the main difference between stocks and bonds?",
      explanation: "Stocks represent ownership in a company, while bonds represent loans to a company or government that pay interest.",
      options: [
        { id: "q1-a", text: "Stocks are always less risky than bonds", isCorrect: false },
        { id: "q1-b", text: "Stocks represent ownership, bonds represent debt", isCorrect: true },
        { id: "q1-c", text: "Bonds can be traded, stocks cannot", isCorrect: false },
        { id: "q1-d", text: "Stocks never pay dividends, bonds always do", isCorrect: false }
      ]
    },
    {
      id: "q2",
      question: "Which of these accounts typically offers tax-free growth and withdrawals in retirement?",
      explanation: "Roth IRAs are funded with after-tax dollars and offer tax-free growth and qualified withdrawals in retirement.",
      options: [
        { id: "q2-a", text: "Traditional 401(k)", isCorrect: false },
        { id: "q2-b", text: "Traditional IRA", isCorrect: false },
        { id: "q2-c", text: "Roth IRA", isCorrect: true },
        { id: "q2-d", text: "Taxable brokerage account", isCorrect: false }
      ]
    },
    {
      id: "q3",
      question: "What is typically true about the relationship between risk and potential return?",
      explanation: "In finance, there is generally a positive correlation between risk and potential return. Higher risk investments offer the potential for higher returns to compensate investors for taking on additional risk.",
      options: [
        { id: "q3-a", text: "Higher risk investments typically offer higher potential returns", isCorrect: true },
        { id: "q3-b", text: "The safest investments usually provide the highest returns", isCorrect: false },
        { id: "q3-c", text: "Risk and return are unrelated concepts", isCorrect: false },
        { id: "q3-d", text: "All investments have the same risk-return profile", isCorrect: false }
      ]
    }
  ];
  
  // Start quiz
  const startQuiz = () => {
    setInQuiz(true);
    setCurrentQuestion(0);
    setSelectedOption(null);
    setAnswerSubmitted(false);
  };
  
  // Handle option selection in quiz
  const handleOptionSelect = (optionId: string) => {
    if (!answerSubmitted) {
      setSelectedOption(optionId);
    }
  };
  
  // Submit answer
  const submitAnswer = () => {
    if (!selectedOption) return;
    
    const currentQ = quizQuestions[currentQuestion];
    const selectedOpt = currentQ.options.find(opt => opt.id === selectedOption);
    
    setAnswerSubmitted(true);
    
    if (selectedOpt?.isCorrect) {
      // Correct answer
      setXp(xp + 25);
      toast({
        title: "Correct!",
        description: currentQ.explanation,
      });
    } else {
      // Incorrect answer
      setLives(prev => Math.max(0, prev - 1));
      toast({
        title: "Incorrect",
        description: currentQ.explanation,
        variant: "destructive"
      });
    }
  };
  
  // Move to next question
  const nextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
      setAnswerSubmitted(false);
    } else {
      // Quiz completed
      completeLesson();
      setInQuiz(false);
    }
  };
  
  // Complete lesson
  const completeLesson = () => {
    const currentLesson = courseModules[currentModule].lessons.find(lesson => lesson.status === "active");
    
    if (currentLesson) {
      // Mark current lesson as completed
      setCompletedLessons([...completedLessons, currentLesson.id]);
      
      // Add XP
      setXp(xp + currentLesson.xpReward);
      
      // Update next lesson status
      const nextLessonIndex = courseModules[currentModule].lessons.findIndex(lesson => lesson.id === currentLesson.id) + 1;
      
      if (nextLessonIndex < courseModules[currentModule].lessons.length) {
        // Unlock next lesson in current module
        const updatedModules = [...courseModules];
        updatedModules[currentModule].lessons[nextLessonIndex].status = "active";
        // Not actually updating state since this is just a prototype
      }
      
      toast({
        title: "Lesson Completed!",
        description: `You earned ${currentLesson.xpReward} XP.`,
      });
    }
  };
  
  // Calculate course progress
  const calculateProgress = () => {
    const totalLessons = courseModules.reduce((acc, module) => acc + module.lessons.length, 0);
    return Math.round((completedLessons.length / totalLessons) * 100);
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mb-2"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Courses
          </Button>
          <h1 className="text-3xl font-bold">Introduction to Investing</h1>
          <p className="text-muted-foreground">Learn the basics of investing in a fun, interactive way</p>
        </div>
        
        <Button variant="outline" className="text-sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Continue on Mobile
        </Button>
      </div>
      
      {/* Progress tracking */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="col-span-2">
          <CardContent className="p-6">
            <CourseProgress 
              progress={calculateProgress()} 
              streakDays={streakDays}
              lives={lives}
              xp={xp}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Daily Goals</h3>
              <span className="text-sm text-muted-foreground">1/3 complete</span>
            </div>
            
            <div className="mt-4 space-y-4">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-finance-light/20 flex items-center justify-center mr-3">
                  <Check className="h-4 w-4 text-finance-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium">Complete a lesson</p>
                  <p className="text-xs text-muted-foreground">+10 XP</p>
                </div>
              </div>
              
              <div className="flex items-center opacity-50">
                <div className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center mr-3">
                  <Trophy className="h-4 w-4 text-muted-foreground/70" />
                </div>
                <div>
                  <p className="text-sm font-medium">Earn 100 XP today</p>
                  <p className="text-xs text-muted-foreground">+25 XP</p>
                </div>
              </div>
              
              <div className="flex items-center opacity-50">
                <div className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center mr-3">
                  <Star className="h-4 w-4 text-muted-foreground/70" />
                </div>
                <div>
                  <p className="text-sm font-medium">Complete a quiz</p>
                  <p className="text-xs text-muted-foreground">+50 XP</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {!inQuiz ? (
        <>
          {/* Module selection */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {courseModules.map((module, idx) => (
              <Button
                key={module.id}
                variant={currentModule === idx ? "default" : "outline"}
                className={cn(
                  "justify-start h-auto py-3 px-4",
                  currentModule === idx && "bg-finance text-white",
                  idx > 0 && idx > currentModule && "opacity-60"
                )}
                onClick={() => setCurrentModule(idx)}
                disabled={idx > 0 && idx > currentModule}
              >
                <div className="flex items-center w-full">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center mr-3",
                    currentModule === idx 
                      ? "bg-white text-finance" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {idx + 1}
                  </div>
                  <span className="text-left">{module.title}</span>
                </div>
              </Button>
            ))}
          </div>
          
          {/* Lessons */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">{courseModules[currentModule].title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courseModules[currentModule].lessons.map((lesson, idx) => (
                <div key={lesson.id}>
                  <LessonCard 
                    {...lesson}
                    index={idx + 1}
                  />
                  
                  {lesson.status === "active" && (
                    <div className="mt-4 flex justify-end">
                      <Button onClick={startQuiz}>
                        Start Lesson
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Quiz mode */
        <Card className="border-2 border-finance animate-fade-in">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-medium">Question {currentQuestion + 1} of {quizQuestions.length}</h2>
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Heart 
                      key={i} 
                      className={cn(
                        "h-5 w-5 ml-1", 
                        i < lives ? "text-finance-danger" : "text-muted stroke-muted-foreground/30"
                      )} 
                      fill={i < lives ? "currentColor" : "none"}
                    />
                  ))}
                </div>
              </div>
              <Progress value={((currentQuestion + 1) / quizQuestions.length) * 100} className="h-2" />
            </div>
            
            <div className="space-y-6">
              <h3 className="text-xl font-medium">{quizQuestions[currentQuestion].question}</h3>
              
              <div className="space-y-3">
                {quizQuestions[currentQuestion].options.map(option => (
                  <div 
                    key={option.id}
                    className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-all",
                      selectedOption === option.id && !answerSubmitted && "border-finance ring-1 ring-finance",
                      answerSubmitted && option.isCorrect && "border-finance-success bg-finance-success/10",
                      answerSubmitted && selectedOption === option.id && !option.isCorrect && "border-finance-danger bg-finance-danger/10"
                    )}
                    onClick={() => handleOptionSelect(option.id)}
                  >
                    <div className="flex items-center">
                      <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center mr-3 border",
                        selectedOption === option.id && !answerSubmitted && "border-finance bg-finance text-white",
                        answerSubmitted && option.isCorrect && "border-finance-success bg-finance-success text-white",
                        answerSubmitted && selectedOption === option.id && !option.isCorrect && "border-finance-danger bg-finance-danger text-white",
                        !(selectedOption === option.id || (answerSubmitted && option.isCorrect)) && "border-muted-foreground/30"
                      )}>
                        {(answerSubmitted && option.isCorrect) && <Check className="h-3 w-3" />}
                        {!(answerSubmitted && option.isCorrect) && option.id.split('-')[1].toUpperCase()}
                      </div>
                      <span>{option.text}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setInQuiz(false)}>
                  Exit Quiz
                </Button>
                
                {!answerSubmitted ? (
                  <Button 
                    onClick={submitAnswer}
                    disabled={!selectedOption}
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button onClick={nextQuestion}>
                    {currentQuestion < quizQuestions.length - 1 ? "Next Question" : "Complete Lesson"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GamifiedCoursePage;
