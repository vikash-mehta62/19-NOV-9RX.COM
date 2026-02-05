import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Eye, Calendar, Sparkles } from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

interface FestivalTheme {
  id: string;
  name: string;
  slug: string;
  description: string;
  start_date: string;
  end_date: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  icon: string;
  banner_image_url: string;
  banner_text: string;
  effects: string[];
  is_active: boolean;
  auto_activate: boolean;
  priority: number;
}

const defaultTheme: Partial<FestivalTheme> = {
  name: "",
  slug: "",
  description: "",
  start_date: "",
  end_date: "",
  primary_color: "#000000",
  secondary_color: "#ffffff",
  accent_color: "#ff0000",
  background_color: "#f5f5f5",
  text_color: "#000000",
  icon: "🎉",
  banner_text: "",
  effects: [],
  is_active: false,
  auto_activate: true,
  priority: 5,
};

const effectOptions = [
  { value: "snowflakes", label: "❄️ Snowflakes" },
  { value: "fireworks", label: "🎆 Fireworks" },
  { value: "confetti", label: "🎊 Confetti" },
  { value: "hearts", label: "❤️ Hearts" },
  { value: "leaves", label: "🍂 Falling Leaves" },
  { value: "stars", label: "⭐ Stars" },
  { value: "pumpkins", label: "🎃 Pumpkins" },
  { value: "eggs", label: "🥚 Easter Eggs" },
  { value: "flags", label: "🇺🇸 Flags" },
];

export default function FestivalThemes() {
  const [themes, setThemes] = useState<FestivalTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Partial<FestivalTheme> | null>(null);
  const [previewTheme, setPreviewTheme] = useState<FestivalTheme | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from("festival_themes")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      setThemes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingTheme?.name || !editingTheme?.start_date || !editingTheme?.end_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const slug = editingTheme.slug || editingTheme.name.toLowerCase().replace(/\s+/g, "-");
      const themeData = { ...editingTheme, slug };

      if (editingTheme.id) {
        const { error } = await supabase
          .from("festival_themes")
          .update(themeData)
          .eq("id", editingTheme.id);
        if (error) throw error;
        toast({ title: "Success", description: "Theme updated successfully" });
      } else {
        const { error } = await supabase
          .from("festival_themes")
          .insert([themeData]);
        if (error) throw error;
        toast({ title: "Success", description: "Theme created successfully" });
      }

      setDialogOpen(false);
      setEditingTheme(null);
      fetchThemes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!themeToDelete) return;

    try {
      const { error } = await supabase
        .from("festival_themes")
        .delete()
        .eq("id", themeToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "Theme deleted successfully" });
      fetchThemes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setThemeToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setThemeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const toggleActive = async (theme: FestivalTheme) => {
    try {
      const { error } = await supabase
        .from("festival_themes")
        .update({ is_active: !theme.is_active })
        .eq("id", theme.id);
      if (error) throw error;
      fetchThemes();
      toast({
        title: "Success",
        description: `Theme ${!theme.is_active ? "activated" : "deactivated"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isCurrentlyActive = (theme: FestivalTheme) => {
    const today = new Date();
    return isWithinInterval(today, {
      start: parseISO(theme.start_date),
      end: parseISO(theme.end_date),
    });
  };

  const getStatusBadge = (theme: FestivalTheme) => {
    if (theme.is_active) {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    if (isCurrentlyActive(theme) && theme.auto_activate) {
      return <Badge className="bg-yellow-500">Auto-Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-500" />
              Festival Themes
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage seasonal themes and promotional banners for USA holidays
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTheme(defaultTheme)}>
                <Plus className="h-4 w-4 mr-2" /> Add Theme
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTheme?.id ? "Edit Theme" : "Create New Theme"}
                </DialogTitle>
              </DialogHeader>
              <ThemeForm
                theme={editingTheme}
                onChange={setEditingTheme}
                onSave={handleSave}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Theme Preview */}
        {themes.filter(t => t.is_active).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Currently Active Theme</CardTitle>
            </CardHeader>
            <CardContent>
              {themes.filter(t => t.is_active).map(theme => (
                <ThemePreviewCard key={theme.id} theme={theme} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Themes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Themes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading themes...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Theme</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Colors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {themes.map((theme) => (
                    <TableRow key={theme.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{theme.icon}</span>
                          <div>
                            <div className="font-medium">{theme.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {theme.slug}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(theme.start_date), "MMM d")} -{" "}
                          {format(parseISO(theme.end_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: theme.primary_color }}
                            title="Primary"
                          />
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: theme.secondary_color }}
                            title="Secondary"
                          />
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: theme.accent_color }}
                            title="Accent"
                          />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(theme)}</TableCell>
                      <TableCell>{theme.priority}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewTheme(theme)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTheme(theme);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(theme.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          <Switch
                            checked={theme.is_active}
                            onCheckedChange={() => toggleActive(theme)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={!!previewTheme} onOpenChange={() => setPreviewTheme(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Theme Preview: {previewTheme?.name}</DialogTitle>
            </DialogHeader>
            {previewTheme && <ThemePreviewCard theme={previewTheme} fullPreview />}
          </DialogContent>
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Delete Festival Theme"
          description="Are you sure you want to delete this theme? This action cannot be undone."
        />
      </div>
    </DashboardLayout>
  );
}


// Theme Form Component
function ThemeForm({
  theme,
  onChange,
  onSave,
}: {
  theme: Partial<FestivalTheme> | null;
  onChange: (theme: Partial<FestivalTheme> | null) => void;
  onSave: () => void;
}) {
  if (!theme) return null;

  const updateField = (field: string, value: any) => {
    onChange({ ...theme, [field]: value });
  };

  const toggleEffect = (effect: string) => {
    const effects = theme.effects || [];
    if (effects.includes(effect)) {
      updateField("effects", effects.filter((e) => e !== effect));
    } else {
      updateField("effects", [...effects, effect]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Theme Name *</Label>
          <Input
            value={theme.name || ""}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="e.g., Christmas"
          />
        </div>
        <div className="space-y-2">
          <Label>Icon/Emoji</Label>
          <Input
            value={theme.icon || ""}
            onChange={(e) => updateField("icon", e.target.value)}
            placeholder="🎄"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={theme.description || ""}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Theme description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={theme.start_date || ""}
            onChange={(e) => updateField("start_date", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            type="date"
            value={theme.end_date || ""}
            onChange={(e) => updateField("end_date", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Colors</Label>
        <div className="grid grid-cols-5 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Primary</Label>
            <Input
              type="color"
              value={theme.primary_color || "#000000"}
              onChange={(e) => updateField("primary_color", e.target.value)}
              className="h-10 p-1"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Secondary</Label>
            <Input
              type="color"
              value={theme.secondary_color || "#ffffff"}
              onChange={(e) => updateField("secondary_color", e.target.value)}
              className="h-10 p-1"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Accent</Label>
            <Input
              type="color"
              value={theme.accent_color || "#ff0000"}
              onChange={(e) => updateField("accent_color", e.target.value)}
              className="h-10 p-1"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Background</Label>
            <Input
              type="color"
              value={theme.background_color || "#f5f5f5"}
              onChange={(e) => updateField("background_color", e.target.value)}
              className="h-10 p-1"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Text</Label>
            <Input
              type="color"
              value={theme.text_color || "#000000"}
              onChange={(e) => updateField("text_color", e.target.value)}
              className="h-10 p-1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Banner Text</Label>
        <Input
          value={theme.banner_text || ""}
          onChange={(e) => updateField("banner_text", e.target.value)}
          placeholder="e.g., 🎄 Merry Christmas! Special Holiday Deals Inside! 🎁"
        />
      </div>

      <div className="space-y-2">
        <Label>Banner Image URL</Label>
        <Input
          value={theme.banner_image_url || ""}
          onChange={(e) => updateField("banner_image_url", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>Visual Effects</Label>
        <div className="flex flex-wrap gap-2">
          {effectOptions.map((effect) => (
            <Button
              key={effect.value}
              type="button"
              variant={theme.effects?.includes(effect.value) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleEffect(effect.value)}
            >
              {effect.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority (1-10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={theme.priority || 5}
            onChange={(e) => updateField("priority", parseInt(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-4 pt-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={theme.auto_activate || false}
              onCheckedChange={(checked) => updateField("auto_activate", checked)}
            />
            <Label>Auto-activate on dates</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => onChange(null)}>
          Cancel
        </Button>
        <Button onClick={onSave}>Save Theme</Button>
      </div>
    </div>
  );
}

// Theme Preview Card Component
function ThemePreviewCard({
  theme,
  fullPreview = false,
}: {
  theme: FestivalTheme;
  fullPreview?: boolean;
}) {
  return (
    <div
      className={`rounded-lg overflow-hidden ${fullPreview ? "min-h-[300px]" : ""}`}
      style={{ backgroundColor: theme.background_color }}
    >
      {/* Banner */}
      <div
        className="p-4 text-center"
        style={{
          background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
          color: theme.text_color === "#000000" ? "#ffffff" : theme.text_color,
        }}
      >
        <div className="text-3xl mb-2">{theme.icon}</div>
        <h3 className="text-xl font-bold">{theme.name}</h3>
        {theme.banner_text && (
          <p className="mt-2 text-sm opacity-90">{theme.banner_text}</p>
        )}
      </div>

      {fullPreview && (
        <div className="p-4" style={{ color: theme.text_color }}>
          <p className="mb-4">{theme.description}</p>

          {/* Sample Product Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg p-3 border"
                style={{ borderColor: theme.accent_color }}
              >
                <div
                  className="h-20 rounded mb-2"
                  style={{ backgroundColor: theme.secondary_color }}
                />
                <div className="text-sm font-medium">Sample Product {i}</div>
                <div
                  className="text-lg font-bold"
                  style={{ color: theme.accent_color }}
                >
                  $99.99
                </div>
              </div>
            ))}
          </div>

          {/* Effects Preview */}
          {theme.effects && theme.effects.length > 0 && (
            <div className="mt-4 p-2 rounded bg-black/10">
              <span className="text-sm">Active Effects: </span>
              {theme.effects.map((effect) => (
                <Badge key={effect} variant="secondary" className="mr-1">
                  {effect}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
