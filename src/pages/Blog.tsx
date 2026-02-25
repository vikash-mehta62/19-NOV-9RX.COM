import { Navbar } from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";
import { BookOpen, Calendar, Clock, ArrowRight, Search, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
  is_featured: boolean;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [blogPosts, setBlogPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(["All Posts"]);
  const [activeCategory, setActiveCategory] = useState("All Posts");

  useEffect(() => {
    document.title = "Blog - 9RX | Pharmacy Industry Insights & Tips";
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;

      setBlogPosts(data || []);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data?.map((blog) => blog.category).filter(Boolean))
      ) as string[];
      setCategories(["All Posts", ...uniqueCategories]);
    } catch (error) {
      console.error("Error fetching blogs:", error);
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

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory =
      activeCategory === "All Posts" || post.category === activeCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Separate featured and regular posts, then sort
  const featuredPosts = filteredPosts.filter((post) => post.is_featured);
  const regularPosts = filteredPosts.filter((post) => !post.is_featured);

  return (
    <>
      <div className="min-h-screen bg-white">
        <Navbar forceScrolledStyle={true} />
        
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px]" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm text-blue-300 px-5 py-2.5 rounded-full font-semibold text-sm mb-6 border border-blue-500/30">
                <BookOpen className="w-4 h-4" />
                9RX Blog
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Insights & Resources for
                <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Pharmacy Professionals
                </span>
              </h1>
              <p className="text-lg text-slate-300 mb-8">
                Expert tips, industry news, and guides to help your pharmacy thrive.
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-8 bg-white border-b border-slate-100 sticky top-0 z-30">
          <div className="container mx-auto px-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                    activeCategory === category
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-16 bg-gradient-to-b from-white to-blue-50/30">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-500 mt-4">Loading blogs...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No articles found</h3>
                <p className="text-slate-500">Try adjusting your search or category filter.</p>
              </div>
            ) : (
              <>
                {/* Featured Posts Section */}
                {featuredPosts.length > 0 && (
                  <div className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-8 w-1 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                      <h2 className="text-2xl font-bold text-slate-900">Featured Articles</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {featuredPosts.map((post) => (
                        <article key={post.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-yellow-200 group relative">
                          {/* Featured Badge */}
                          <div className="absolute top-4 right-4 z-10">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                              <span className="text-base">⭐</span>
                              FEATURED
                            </div>
                          </div>
                          
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-3">
                              {post.category && (
                                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                                  {post.category}
                                </span>
                              )}
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {post.title}
                            </h2>

                            {post.excerpt && (
                              <p className="text-slate-700 mb-4 line-clamp-3">
                                {post.excerpt}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                              {post.published_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(post.published_at), "MMM dd, yyyy")}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {calculateReadTime(post.content)}
                              </span>
                            </div>

                            {post.author_name && (
                              <div className="flex items-center gap-2 text-sm text-slate-700 mb-4">
                                <User className="w-4 h-4" />
                                <span>{post.author_name}</span>
                              </div>
                            )}

                            <Link
                              to={`/blog/${post.slug}`}
                              className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:gap-3 transition-all"
                            >
                              Read More
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Posts Section */}
                {regularPosts.length > 0 && (
                  <div>
                    {featuredPosts.length > 0 && (
                      <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-1 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full"></div>
                        <h2 className="text-2xl font-bold text-slate-900">All Articles</h2>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {regularPosts.map((post) => (
                        <article key={post.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-3">
                              {post.category && (
                                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                                  {post.category}
                                </span>
                              )}
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {post.title}
                            </h2>

                            {post.excerpt && (
                              <p className="text-slate-600 mb-4 line-clamp-3">
                                {post.excerpt}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                              {post.published_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(post.published_at), "MMM dd, yyyy")}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {calculateReadTime(post.content)}
                              </span>
                            </div>

                            {post.author_name && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                                <User className="w-4 h-4" />
                                <span>{post.author_name}</span>
                              </div>
                            )}

                            <Link
                              to={`/blog/${post.slug}`}
                              className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:gap-3 transition-all"
                            >
                              Read More
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Subscribe to Our Newsletter
            </h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              Get the latest articles, industry news, and exclusive offers delivered to your inbox.
            </p>
            <Link
              to="/newsletter"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Subscribe Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Blog;
