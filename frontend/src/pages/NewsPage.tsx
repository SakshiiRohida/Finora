import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Newspaper } from "lucide-react";
import NewsCard, { NewsItemProps } from "@/components/NewsCard";
import { newsApi } from "@/lib/api";

const fallbackImage = "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e";

const toCategory = (source?: string | null) => {
  if (!source) return "Finance";
  if (source.toLowerCase().includes("bank")) return "Banking";
  if (source.toLowerCase().includes("market") || source.toLowerCase().includes("exchange")) return "Markets";
  if (source.toLowerCase().includes("crypto")) return "Cryptocurrency";
  return "Economy";
};

const NewsPage = () => {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: () => newsApi.list(15)
  });

  const newsItems: NewsItemProps[] = useMemo(() => {
    return (data?.news ?? []).map((item, index) => ({
      id: `${index}-${item.title}`,
      title: item.title,
      summary: item.description ?? "Tap to read the full story.",
      source: item.source ?? "Finance Bytes",
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
      imageUrl: item.imageUrl || fallbackImage,
      url: item.url ?? "#",
      category: toCategory(item.source),
      impact: "neutral" as const
    }));
  }, [data?.news]);

  const filteredNews = newsItems.filter((item) => {
    const query = search.toLowerCase();
    if (!query) return true;
    return (
      item.title.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.source.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  const categories = useMemo(() => {
    const unique = new Set<string>(["All"]);
    filteredNews.forEach((item) => unique.add(item.category));
    return Array.from(unique);
  }, [filteredNews]);

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Newspaper className="h-7 w-7 text-finance" />
          Finance Bytes
        </h1>
        <p className="text-muted-foreground">
          Daily economics, market moves, and money tips in quick, snackable cards.
        </p>
      </div>

      <Card className="bg-finance-light/20 border-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div>
              <CardTitle className="text-white">Trending Story</CardTitle>
              <CardDescription className="text-white/80">
                {filteredNews[0]?.title ?? "Fresh updates arrive once you complete your first lesson."}
              </CardDescription>
            </div>
            {filteredNews[0]?.url && (
              <a href={filteredNews[0].url} target="_blank" rel="noreferrer" className="text-white underline text-sm">
                Read full article
              </a>
            )}
          </div>
          <div className="relative h-56 md:h-full">
            <img
              src={filteredNews[0]?.imageUrl ?? fallbackImage}
              alt="featured"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search finance news..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Tabs defaultValue="All">
        <TabsList className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => {
          const newsForCategory =
            category === "All"
              ? filteredNews
              : filteredNews.filter((item) => item.category === category);
          return (
            <TabsContent key={category} value={category} className="space-y-6">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading latest headlines...</div>
              ) : newsForCategory.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No news right now. Check back later!
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  {newsForCategory.map((news) => (
                    <NewsCard key={news.id} {...news} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default NewsPage;


