import { Navbar } from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";
import { BookOpen, Calendar, Clock, ArrowRight, Search, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "Blog - 9RX | Pharmacy Industry Insights & Tips";
  }, []);

  const categories = [
    "All Posts",
    "Industry News",
    "Product Updates",
    "Tips & Guides",
    "Compliance",
    "Business Growth"
  ];

  const [activeCategory, setActiveCategory] = useState("All Posts");

  const blogPosts = [
    {
      id: 1,
      title: "Top 10 Pharmacy Packaging Trends for 2025",
      excerpt: "Discover the latest trends in pharmacy packaging that are shaping the industry. From sustainable materials to smart packaging solutions.",
      category: "Industry News",
      date: "December 20, 2024",
      readTime: "5 min read",
      image: "/blog/packaging-trends.jpg",
      slug: "pharmacy-packaging-trends-2025"
    },
    {
      id: 2,
      title: "How to Choose the Right RX Vials for Your Pharmacy",
      excerpt: "A comprehensive guide to selecting the perfect prescription vials based on medication type, patient needs, and compliance requirements.",
      category: "Tips & Guides",
      date: "December 15, 2024",
      readTime: "7 min read",
      image: "/blog/rx-vials-guide.jpg",
      slug: "choosing-right-rx-vials"
    },
    {
      id: 3,
      title: "FDA Compliance: What Every Pharmacy Needs to Know",
      excerpt: "Stay compliant with the latest FDA regulations for pharmacy packaging and labeling. Essential information for independent pharmacies.",
      category: "Compliance",
      date: "December 10, 2024",
      readTime: "8 min read",
      image: "/blog/fda-compliance.jpg",
      slug: "fda-compliance-pharmacy-guide"
    },
    {
      id: 4,
      title: "Custom Branding: Elevate Your Pharmacy's Image",
      excerpt: "Learn how custom-branded packaging can help differentiate your pharmacy and build customer loyalty in a competitive market.",
      category: "Business Growth",
      date: "December 5, 2024",
      readTime: "6 min read",
      image: "/blog/custom-branding.jpg",
      slug: "custom-branding-pharmacy"
    },
    {
      id: 5,
      title: "New Product Launch: Child-Resistant Vial Caps",
      excerpt: "Introducing our new line of child-resistant vial caps that meet all safety standards while being easy for adults to open.",
      category: "Product Updates",
      date: "November 28, 2024",
      readTime: "3 min read",
      image: "/blog/child-resistant-caps.jpg",
      slug: "child-resistant-vial-caps-launch"
    },
    {
      id: 6,
      title: "Reducing Costs: Smart Inventory Management Tips",
      excerpt: "Practical strategies for managing your pharmacy supply inventory efficiently and reducing waste while maintaining stock levels.",
      category: "Tips & Guides",
      date: "November 20, 2024",
      readTime: "6 min read",
      image: "/blog/inventory-management.jpg",
      slug: "pharmacy-inventory-management-tips"
    },
  ];

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = activeCategory === "All Posts" || post.category === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div className="min-h-screen bg-white">
        <Navbar />
        
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
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No articles found</h3>
                <p className="text-slate-500">Try adjusting your search or category filter.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post) => (
                  <article key={post.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                    {/* Image Placeholder */}
                    <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-100 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-blue-300" />
                      </div>
                      <div className="absolute top-4 left-4">
                        <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {post.readTime}
                        </span>
                      </div>
                      
                      <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      
                      <p className="text-slate-600 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      
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
