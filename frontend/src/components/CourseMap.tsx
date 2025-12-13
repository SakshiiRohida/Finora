
import { useState } from 'react';
import { Check, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SharkIcon } from './ui/shark-icon';

interface CourseMapProps {
  courseName: string;
  totalLessons: number;
  completedLessons: number;
}

const CourseMap = ({ courseName, totalLessons, completedLessons }: CourseMapProps) => {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  
  // Generate lesson nodes
  const nodes = Array.from({ length: totalLessons }, (_, i) => {
    const isCompleted = i < completedLessons;
    const isActive = i === completedLessons;
    const isLocked = i > completedLessons;
    
    return { index: i, isCompleted, isActive, isLocked };
  });
  
  // Calculate progress percentage
  const progressPercentage = (completedLessons / totalLessons) * 100;
  
  return (
    <div className="relative rounded-xl border p-6 bg-white shadow-md overflow-hidden">
      <div 
        className="absolute bottom-0 left-0 h-2 bg-finance transition-all duration-500 ease-in-out"
        style={{ width: `${progressPercentage}%` }}
      />
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{courseName} Progress Map</h3>
        <div className="text-sm text-muted-foreground">
          {completedLessons}/{totalLessons} lessons completed
        </div>
      </div>
      
      <div className="relative mt-8">
        {/* Path/Road */}
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 -translate-y-1/2 rounded-full z-0" />
        
        {/* Map Nodes */}
        <div className="flex justify-between relative z-10">
          {nodes.map((node) => (
            <div 
              key={node.index}
              className="relative"
              onMouseEnter={() => setHoveredNode(node.index)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                node.isCompleted && "bg-finance-success",
                node.isActive && "bg-finance animate-pulse ring-4 ring-finance/20",
                node.isLocked && "bg-gray-200",
                (hoveredNode === node.index) && "scale-110"
              )}>
                {node.isCompleted && <Check className="h-5 w-5 text-white" />}
                {node.isActive && <SharkIcon className="h-5 w-5" />}
                {node.isLocked && <Lock className="h-4 w-4 text-gray-400" />}
              </div>
              
              {/* Label below node */}
              <div className={cn(
                "absolute top-12 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap",
                node.isLocked ? "text-gray-400" : "text-finance-dark"
              )}>
                Lesson {node.index + 1}
              </div>
              
              {/* Direction indicator */}
              {node.index < nodes.length - 1 && (
                <div className="absolute top-1/2 -right-8 -translate-y-1/2 text-gray-400">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseMap;
