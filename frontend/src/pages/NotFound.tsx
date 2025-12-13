
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SharkIcon } from "@/components/ui/shark-icon";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="mb-6 inline-block text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-finance/10 border border-finance/30 flex items-center justify-center animate-float">
            <SharkIcon className="h-12 w-12 text-finance" />
          </div>
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Finny has your back</p>
        </div>
        <h1 className="text-4xl font-bold mb-3">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          Oops! It looks like the page you're looking for has swum away. Let's navigate back to safer waters.
        </p>
        <Button asChild size="lg">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
