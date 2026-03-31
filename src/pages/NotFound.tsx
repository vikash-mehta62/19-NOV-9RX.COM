import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
        <p className="text-[80px] font-semibold uppercase tracking-[0.35em] text-slate-500">
          404
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
          The page you requested does not exist or the URL is incorrect.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button asChild variant="outline">
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
