
import { CalendarIcon, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface NewsItemProps {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  imageUrl: string;
  url: string;
  category: string;
  impact: 'positive' | 'negative' | 'neutral';
}

const NewsCard = ({
  title,
  summary,
  source,
  publishedAt,
  imageUrl,
  url,
  category,
  impact
}: NewsItemProps) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <article className="group relative h-full overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
        <div className="flex flex-col md:flex-row">
          {/* Image section */}
          <div className="relative md:w-1/3">
            <div className="aspect-video md:aspect-square w-full overflow-hidden">
              <img
                src={imageUrl}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            
            <div className="absolute top-2 left-2">
              <Badge 
                className={cn(
                  "rounded-md text-xs font-medium backdrop-blur-sm",
                  impact === 'positive' && "bg-finance-success/90 text-white",
                  impact === 'negative' && "bg-finance-danger/90 text-white",
                  impact === 'neutral' && "bg-white/90 text-foreground"
                )}
              >
                {category}
              </Badge>
            </div>
          </div>
          
          {/* Content section */}
          <div className="flex flex-1 flex-col p-4">
            <div className="flex-1">
              <h3 className="font-medium text-lg mb-2 line-clamp-2">
                {title}
              </h3>
              
              <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
                {summary}
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">{source}</span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {formatDistanceToNow(publishedAt, { addSuffix: true })}
                </span>
              </div>
              
              <ExternalLink className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </article>
    </a>
  );
};

export default NewsCard;
