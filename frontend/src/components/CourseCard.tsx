
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CourseProps {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  duration: string;
  lessons: number;
  progress: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isNew?: boolean;
}

const CourseCard = ({
  id,
  title,
  description,
  image,
  category,
  duration,
  lessons,
  progress,
  difficulty,
  isNew
}: CourseProps) => {
  return (
    <Link to={`/learn/${id}`} className="block">
      <div className="course-card h-full">
        {/* Card content */}
        <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 ease-in-out hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "bg-white/90 backdrop-blur-sm text-xs font-medium", 
                difficulty === 'beginner' && "text-finance-success",
                difficulty === 'intermediate' && "text-finance-accent",
                difficulty === 'advanced' && "text-finance-warning"
              )}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Badge>
            {isNew && (
              <Badge className="bg-finance-accent/90 backdrop-blur-sm text-white text-xs font-medium">
                New
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs font-normal">
              {category}
            </Badge>
          </div>
          
          <h3 className="font-medium text-lg mb-1">{title}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
            {description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span>{lessons} lessons</span>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
