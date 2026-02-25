import { Navbar } from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";
import { BookOpen, Calendar, Clock, User, ArrowLeft, Tag } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  tags: string[] | null;
  author_name: string | null;
  is_published: boolean;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setNotFound(true);
        }
        throw error;
      }

      setBlog(data);
      document.title = `${data.title} - 9RX Blog`;

      // Increment view count
      await supabase
        .from("blogs")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", data.id);
    } catch (error) {
      console.error("Error fetching blog:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-white">
          <Navbar forceScrolledStyle={true} />
          <div className="container mx-auto px-4 py-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-500 mt-4">Loading blog post...</p>
            </div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  if (notFound || !blog) {
    return (
      <>
        <div className="min-h-screen bg-white">
          <Navbar forceScrolledStyle={true} />
          <div className="container mx-auto px-4 py-32">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-slate-900 mb-4">Blog Post Not Found</h1>
              <p className="text-slate-600 mb-8">
                The blog post you're looking for doesn't exist or has been removed.
              </p>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
            </div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white">
        <Navbar forceScrolledStyle={true} />

        {/* Back Button */}
        <div className="container mx-auto px-4 pt-24 pb-4">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>

        {/* Blog Header */}
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            {blog.category && (
              <span className="inline-block bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full mb-4">
                {blog.category}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              {blog.title}
            </h1>

            {blog.excerpt && (
              <p className="text-xl text-slate-600 mb-6">{blog.excerpt}</p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-slate-600 border-t border-b border-slate-200 py-4">
              {blog.author_name && (
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="font-medium">{blog.author_name}</span>
                </div>
              )}
              {blog.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{format(new Date(blog.published_at), "MMMM dd, yyyy")}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{calculateReadTime(blog.content)}</span>
              </div>
            </div>
          </div>

          {/* Blog Content */}
          <div className="prose prose-lg max-w-none">
            <div
              className="text-slate-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200">
              <div className="flex items-center gap-3 flex-wrap">
                <Tag className="w-5 h-5 text-slate-500" />
                {blog.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog CTA */}
          <div className="mt-12 pt-8 border-t border-slate-200 text-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Articles
            </Link>
          </div>
        </article>

        <Footer />
      </div>
    </>
  );
};

export default BlogDetail;
