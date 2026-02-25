import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, FileText, Eye, Star, StarOff } from "lucide-react";
import { format } from "date-fns";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  author_name: string | null;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

const initialFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image: "",
  category: "",
  tags: "",
  author_name: "",
  is_published: false,
  is_featured: false,
};

export default function Blogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title), // Always generate slug from title, even when editing
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tagsArray = formData.tags
        ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : null;

      // Check if slug already exists for a different blog
      const { data: existingBlog, error: checkError } = await supabase
        .from("blogs")
        .select("id, title")
        .eq("slug", formData.slug)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 means no rows found, which is fine
        throw checkError;
      }

      // If a blog with this slug exists and it's not the one we're editing
      if (existingBlog && (!editingBlog || existingBlog.id !== editingBlog.id)) {
        setErrorMessage(
          `A blog with this title already exists: "${existingBlog.title}". Please use a different title to make it unique.`
        );
        setErrorDialogOpen(true);
        return;
      }

      const payload = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || null,
        content: formData.content,
        featured_image: formData.featured_image || null,
        category: formData.category || null,
        tags: tagsArray,
        author_name: formData.author_name || null,
        is_published: formData.is_published,
        is_featured: formData.is_featured,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };

      if (editingBlog) {
        const { error } = await supabase
          .from("blogs")
          .update(payload)
          .eq("id", editingBlog.id);
        if (error) throw error;
        toast({ title: "Success", description: "Blog updated successfully" });
      } else {
        const { error } = await supabase.from("blogs").insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Blog created successfully" });
      }

      setDialogOpen(false);
      setEditingBlog(null);
      setFormData(initialFormState);
      fetchBlogs();
    } catch (error: any) {
      let userFriendlyMessage = error.message;
      
      // Handle specific database errors with user-friendly messages
      if (error.code === "23505" || error.message?.includes("duplicate key")) {
        if (error.message?.includes("blogs_slug_key")) {
          userFriendlyMessage = "A blog with this title already exists. Please use a different title or modify the URL slug to make it unique.";
        } else {
          userFriendlyMessage = "This blog entry already exists. Please use a different title.";
        }
      } else if (error.code === "23502" || error.message?.includes("null value")) {
        userFriendlyMessage = "Please fill in all required fields (Title and Content are required).";
      } else if (error.code === "23503" || error.message?.includes("foreign key")) {
        userFriendlyMessage = "Invalid reference. Please check your input and try again.";
      } else if (error.message?.includes("JWT") || error.message?.includes("auth")) {
        userFriendlyMessage = "Authentication error. Please log in again.";
      }
      
      setErrorMessage(userFriendlyMessage);
      setErrorDialogOpen(true);
    }
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || "",
      content: blog.content,
      featured_image: blog.featured_image || "",
      category: blog.category || "",
      tags: blog.tags?.join(", ") || "",
      author_name: blog.author_name || "",
      is_published: blog.is_published,
      is_featured: blog.is_featured,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!blogToDelete) return;
    try {
      const { error } = await supabase.from("blogs").delete().eq("id", blogToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "Blog deleted successfully" });
      fetchBlogs();
    } catch (error: any) {
      let userFriendlyMessage = error.message;
      
      if (error.message?.includes("JWT") || error.message?.includes("auth")) {
        userFriendlyMessage = "Authentication error. Please log in again.";
      } else if (error.message?.includes("permission")) {
        userFriendlyMessage = "You don't have permission to delete this blog.";
      } else if (error.message?.includes("foreign key") || error.message?.includes("referenced")) {
        userFriendlyMessage = "Cannot delete this blog because it is referenced by other records.";
      }
      
      setErrorMessage(userFriendlyMessage);
      setErrorDialogOpen(true);
    } finally {
      setDeleteDialogOpen(false);
      setBlogToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setBlogToDelete(id);
    setDeleteDialogOpen(true);
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("blogs")
        .update({
          is_published: !currentStatus,
          published_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
      fetchBlogs();
    } catch (error: any) {
      let userFriendlyMessage = error.message;
      
      if (error.message?.includes("JWT") || error.message?.includes("auth")) {
        userFriendlyMessage = "Authentication error. Please log in again.";
      } else if (error.message?.includes("permission")) {
        userFriendlyMessage = "You don't have permission to update this blog.";
      }
      
      setErrorMessage(userFriendlyMessage);
      setErrorDialogOpen(true);
    }
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("blogs")
        .update({ is_featured: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      fetchBlogs();
    } catch (error: any) {
      let userFriendlyMessage = error.message;
      
      if (error.message?.includes("JWT") || error.message?.includes("auth")) {
        userFriendlyMessage = "Authentication error. Please log in again.";
      } else if (error.message?.includes("permission")) {
        userFriendlyMessage = "You don't have permission to update this blog.";
      }
      
      setErrorMessage(userFriendlyMessage);
      setErrorDialogOpen(true);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Blog Management</h1>
            <p className="text-muted-foreground">Create and manage blog posts and articles</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingBlog(null); setFormData(initialFormState); }}>
                <Plus className="mr-2 h-4 w-4" /> New Blog Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBlog ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="How to Choose the Right Pharmacy Supplies"
                      required
                    />
                  </div>
                  {/* URL Slug - Hidden but auto-generated from title */}
                  <input type="hidden" name="slug" value={formData.slug} />
                  
                  <div className="col-span-2">
                    <Label htmlFor="excerpt">Excerpt (Short Description)</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="A brief summary of the blog post..."
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Write your blog content here... (Supports basic HTML)"
                      rows={10}
                      required
                    />
                  </div>
                  {/* Featured Image URL - Hidden as not used on public page */}
                  <input type="hidden" name="featured_image" value={formData.featured_image} />
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Industry News"
                    />
                  </div>
                  <div>
                    <Label htmlFor="author_name">Author Name</Label>
                    <Input
                      id="author_name"
                      value={formData.author_name}
                      onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="pharmacy, supplies, tips, guide"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                    />
                    <Label htmlFor="is_published">Publish Now</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label htmlFor="is_featured">Featured Post</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingBlog ? "Update" : "Create"} Post</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{blogs.length}</div>
              <p className="text-muted-foreground">Total Posts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {blogs.filter((b) => b.is_published).length}
              </div>
              <p className="text-muted-foreground">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {blogs.filter((b) => !b.is_published).length}
              </div>
              <p className="text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> All Blog Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : blogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No blog posts found. Create your first post!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogs.map((blog) => (
                    <TableRow key={blog.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {blog.featured_image && (
                            <img
                              src={blog.featured_image}
                              alt={blog.title}
                              className="h-10 w-14 object-cover rounded"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          )}
                          <div>
                            <p className="font-medium">{blog.title}</p>
                            <p className="text-sm text-muted-foreground">/{blog.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {blog.category ? (
                          <Badge variant="outline">{blog.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{blog.author_name || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePublished(blog.id, blog.is_published)}
                        >
                          <Badge variant={blog.is_published ? "default" : "secondary"}>
                            {blog.is_published ? "Published" : "Draft"}
                          </Badge>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFeatured(blog.id, blog.is_featured)}
                        >
                          {blog.is_featured ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <StarOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(blog)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(blog.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Delete Blog Post"
          description="Are you sure you want to delete this blog post? This action cannot be undone."
        />

        {/* Error Dialog */}
        <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Error</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-700">{errorMessage}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setErrorDialogOpen(false)}>
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
