import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Type, ImageIcon, Square, Minus, Gift, Package, Eye, Code,
  Plus, Trash2, ChevronUp, ChevronDown, Copy, X,
  AlignLeft, AlignCenter, AlignRight, Palette, Layout, Undo2,
  Mail, Smartphone, Monitor, MousePointerClick, Layers, Settings2, Wand2, LayoutTemplate
} from "lucide-react";

interface EmailBlock { id: string; type: string; content: any; }
interface VisualEmailEditorProps { initialHtml?: string; onChange: (html: string) => void; variables?: string[]; }

const emailTemplates = [
  { id: "welcome", name: "Welcome", description: "Greet new users", gradient: "from-emerald-400 to-cyan-500",
    blocks: [
      { type: "header", content: { text: "Welcome to 9RX! 🎉", bgColor: "#10b981", textColor: "#ffffff" } },
      { type: "text", content: { text: "Hi {{first_name}},\n\nThank you for joining 9RX!", align: "left" } },
      { type: "button", content: { text: "Start Shopping", url: "https://9rx.com/pharmacy", bgColor: "#10b981" } },
    ]},
  { id: "abandoned", name: "Cart Recovery", description: "Win back customers", gradient: "from-orange-400 to-pink-500",
    blocks: [
      { type: "header", content: { text: "You left something behind! 🛒", bgColor: "#f97316", textColor: "#ffffff" } },
      { type: "text", content: { text: "Hi {{first_name}},\n\nYour cart is waiting!" } },
      { type: "coupon", content: { code: "COMEBACK10", discount: "10% OFF", description: "Complete your order" } },
      { type: "button", content: { text: "Complete Order", url: "https://9rx.com/cart", bgColor: "#f97316" } },
    ]},
  { id: "order", name: "Order Confirmed", description: "Confirmation email", gradient: "from-green-400 to-emerald-500",
    blocks: [
      { type: "header", content: { text: "Order Confirmed! ✅", bgColor: "#22c55e", textColor: "#ffffff" } },
      { type: "text", content: { text: "Hi {{first_name}},\n\nYour order #{{order_number}} is confirmed!" } },
      { type: "button", content: { text: "Track Order", url: "https://9rx.com/orders", bgColor: "#22c55e" } },
    ]},
  { id: "promo", name: "Promotion", description: "Special offers", gradient: "from-purple-400 to-pink-500",
    blocks: [
      { type: "header", content: { text: "Special Offer! ⭐", bgColor: "#8b5cf6", textColor: "#ffffff" } },
      { type: "coupon", content: { code: "SAVE20", discount: "20% OFF", description: "Limited time!" } },
      { type: "button", content: { text: "Shop Now", url: "https://9rx.com/pharmacy", bgColor: "#8b5cf6" } },
    ]},
];

const blockTypes = [
  { type: "header", name: "Header", icon: Type, color: "bg-blue-500" },
  { type: "text", name: "Text", icon: Type, color: "bg-gray-500" },
  { type: "button", name: "Button", icon: MousePointerClick, color: "bg-green-500" },
  { type: "image", name: "Image", icon: ImageIcon, color: "bg-purple-500" },
  { type: "divider", name: "Divider", icon: Minus, color: "bg-gray-400" },
  { type: "spacer", name: "Spacer", icon: Square, color: "bg-gray-300" },
  { type: "product", name: "Product", icon: Package, color: "bg-orange-500" },
  { type: "coupon", name: "Coupon", icon: Gift, color: "bg-yellow-500" },
];

const blockDefaults: Record<string, any> = {
  header: { text: "Your Heading Here", bgColor: "#10b981", textColor: "#ffffff", fontSize: "28", padding: "30" },
  text: { text: "Enter your text here...", color: "#374151", fontSize: "16", align: "left" },
  button: { text: "Click Here", url: "#", bgColor: "#10b981", textColor: "#ffffff", align: "center", radius: "8", size: "medium" },
  image: { url: "", alt: "Image", width: "100", align: "center" },
  divider: { color: "#e5e7eb", thickness: "1", style: "solid" },
  spacer: { height: "30" },
  product: { name: "Product Name", price: "$99.99", imageUrl: "", buttonText: "View Product", buttonUrl: "#" },
  coupon: { code: "SAVE10", discount: "10% OFF", description: "Use at checkout", bgColor: "#fef3c7", borderColor: "#f59e0b" },
};

function generateHtml(blocks: EmailBlock[], globalStyle: any): string {
  const bodyContent = blocks.map(block => {
    const { type, content } = block;
    switch (type) {
      case "header": return `<div style="background:${content.bgColor || "#10b981"};padding:${content.padding || 30}px;text-align:center;"><h1 style="color:${content.textColor || "#ffffff"};margin:0;font-size:${content.fontSize || 28}px;font-weight:bold;">${content.text || ""}</h1></div>`;
      case "text": return `<div style="padding:20px 30px;"><p style="color:${content.color || "#374151"};font-size:${content.fontSize || 16}px;text-align:${content.align || "left"};margin:0;line-height:1.7;white-space:pre-wrap;">${(content.text || "").replace(/\n/g, "<br>")}</p></div>`;
      case "button": const bp = content.size === "large" ? "16px 36px" : content.size === "small" ? "10px 20px" : "14px 28px"; return `<div style="text-align:${content.align || "center"};padding:20px 30px;"><a href="${content.url || "#"}" style="background:${content.bgColor || "#10b981"};color:${content.textColor || "#ffffff"};padding:${bp};text-decoration:none;border-radius:${content.radius || 8}px;font-weight:600;display:inline-block;">${content.text || ""}</a></div>`;
      case "image": return content.url ? `<div style="text-align:${content.align || "center"};padding:20px 30px;"><img src="${content.url}" alt="${content.alt || ""}" style="max-width:${content.width || 100}%;height:auto;border-radius:8px;" /></div>` : "";
      case "divider": return `<div style="padding:15px 30px;"><hr style="border:none;border-top:${content.thickness || 1}px ${content.style || "solid"} ${content.color || "#e5e7eb"};margin:0;" /></div>`;
      case "spacer": return `<div style="height:${content.height || 30}px;"></div>`;
      case "product": return `<div style="background:#f8fafc;border-radius:16px;padding:24px;margin:20px 30px;text-align:center;">${content.imageUrl ? `<img src="${content.imageUrl}" alt="${content.name}" style="max-width:160px;height:auto;border-radius:12px;margin-bottom:16px;" />` : ""}<h3 style="margin:0 0 8px;color:#1f2937;font-size:18px;font-weight:600;">${content.name || ""}</h3><p style="color:#10b981;font-size:24px;font-weight:bold;margin:8px 0 16px;">${content.price || ""}</p><a href="${content.buttonUrl || "#"}" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:10px;display:inline-block;font-weight:600;">${content.buttonText || ""}</a></div>`;
      case "coupon": return `<div style="background:linear-gradient(135deg,${content.bgColor || "#fef3c7"},#fff7ed);border:3px dashed ${content.borderColor || "#f59e0b"};border-radius:16px;padding:24px;margin:20px 30px;text-align:center;"><p style="color:#92400e;font-size:28px;font-weight:bold;margin:0 0 12px;">${content.discount || ""}</p><div style="background:white;padding:14px 28px;border-radius:10px;font-family:monospace;font-size:24px;margin:12px auto;display:inline-block;border:2px solid ${content.borderColor || "#f59e0b"};letter-spacing:3px;font-weight:bold;">${content.code || ""}</div><p style="color:#78350f;margin:12px 0 0;font-size:14px;">${content.description || ""}</p></div>`;
      default: return "";
    }
  }).filter(Boolean).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:${globalStyle.bgColor || "#f1f5f9"};"><div style="background:${globalStyle.contentBg || "#ffffff"};border-radius:${globalStyle.borderRadius || 12}px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">${bodyContent}</div><div style="text-align:center;padding:25px;color:#9ca3af;font-size:12px;"><p style="margin:0;">© ${new Date().getFullYear()} 9RX. All rights reserved.</p></div></body></html>`;
}

export function VisualEmailEditor({ initialHtml, onChange, variables = [] }: VisualEmailEditorProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "code">("edit");
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [globalStyle, setGlobalStyle] = useState({ bgColor: "#f1f5f9", contentBg: "#ffffff", borderRadius: "12" });
  
  // Check if we have existing HTML content (editing mode)
  const hasInitialHtml = !!(initialHtml && initialHtml.trim() !== "");
  const [showTemplates, setShowTemplates] = useState(!hasInitialHtml);
  const [editingExistingHtml, setEditingExistingHtml] = useState(hasInitialHtml);

  useEffect(() => {
    if (blocks.length > 0) {
      onChange(generateHtml(blocks, globalStyle));
      setEditingExistingHtml(false);
    }
  }, [blocks, globalStyle]);

  const addBlock = (type: string) => {
    const newBlock: EmailBlock = { id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type, content: { ...blockDefaults[type] } };
    setBlocks([...blocks, newBlock]);
    setSelectedBlock(newBlock.id);
    setShowTemplates(false);
    setEditingExistingHtml(false);
  };

  const updateBlock = (id: string, content: any) => setBlocks(blocks.map(b => b.id === id ? { ...b, content: { ...b.content, ...content } } : b));
  const deleteBlock = (id: string) => { setBlocks(blocks.filter(b => b.id !== id)); if (selectedBlock === id) setSelectedBlock(null); };
  
  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const newBlock = { ...block, id: `block-${Date.now()}`, content: { ...block.content } };
    const index = blocks.findIndex(b => b.id === id);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    const index = blocks.findIndex(b => b.id === id);
    if (direction === "up" && index > 0) { const newBlocks = [...blocks]; [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]]; setBlocks(newBlocks); }
    else if (direction === "down" && index < blocks.length - 1) { const newBlocks = [...blocks]; [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]]; setBlocks(newBlocks); }
  };

  const loadTemplate = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) return;
    const newBlocks = template.blocks.map((block, index) => ({ id: `block-${Date.now()}-${index}`, type: block.type, content: { ...blockDefaults[block.type], ...block.content } }));
    setBlocks(newBlocks);
    setShowTemplates(false);
    setEditingExistingHtml(false);
  };

  const resetEditor = () => { setBlocks([]); setShowTemplates(true); setEditingExistingHtml(false); setSelectedBlock(null); };
  const selectedBlockData = blocks.find(b => b.id === selectedBlock);
  const currentHtml = blocks.length > 0 ? generateHtml(blocks, globalStyle) : (editingExistingHtml && initialHtml ? initialHtml : generateHtml(blocks, globalStyle));

  // Template Selection Screen - only for new templates (not editing existing)
  if (showTemplates && blocks.length === 0 && !editingExistingHtml) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white mb-4"><Wand2 className="w-8 h-8" /></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Email</h2>
          <p className="text-gray-500">Choose a template to get started or build from scratch</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {emailTemplates.map(template => (
            <button type="button" key={template.id} onClick={() => loadTemplate(template.id)} className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-emerald-400 transition-all hover:shadow-lg">
              <div className={`h-24 bg-gradient-to-br ${template.gradient} flex items-center justify-center`}><Mail className="w-10 h-10 text-white/80" /></div>
              <div className="p-3 bg-white"><h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3><p className="text-xs text-gray-500">{template.description}</p></div>
            </button>
          ))}
        </div>
        <div className="text-center">
          <div className="inline-flex items-center gap-4 text-gray-400 text-sm mb-4"><span className="h-px w-16 bg-gray-200" />or<span className="h-px w-16 bg-gray-200" /></div>
          <div><Button type="button" variant="outline" size="lg" onClick={() => setShowTemplates(false)} className="gap-2"><Plus className="w-5 h-5" />Start from Scratch</Button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      {/* Top Toolbar */}
      <div className="border-b bg-gray-50/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip><TooltipTrigger asChild><Button type="button" variant={viewMode === "edit" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("edit")} className="gap-1.5 h-8"><Layout className="w-4 h-4" /><span className="hidden sm:inline">Edit</span></Button></TooltipTrigger><TooltipContent>Edit Mode</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button type="button" variant={viewMode === "preview" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("preview")} className="gap-1.5 h-8"><Eye className="w-4 h-4" /><span className="hidden sm:inline">Preview</span></Button></TooltipTrigger><TooltipContent>Preview Mode</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button type="button" variant={viewMode === "code" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("code")} className="gap-1.5 h-8"><Code className="w-4 h-4" /><span className="hidden sm:inline">Code</span></Button></TooltipTrigger><TooltipContent>View HTML Code</TooltipContent></Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "preview" && (
            <div className="flex items-center bg-white rounded-lg border p-0.5">
              <Button type="button" variant={deviceView === "desktop" ? "secondary" : "ghost"} size="sm" onClick={() => setDeviceView("desktop")} className="h-7 px-2"><Monitor className="w-4 h-4" /></Button>
              <Button type="button" variant={deviceView === "mobile" ? "secondary" : "ghost"} size="sm" onClick={() => setDeviceView("mobile")} className="h-7 px-2"><Smartphone className="w-4 h-4" /></Button>
            </div>
          )}
          {variables.length > 0 && viewMode === "edit" && (
            <Select onValueChange={(v) => navigator.clipboard.writeText(`{{${v}}}`)}><SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="📋 Variables" /></SelectTrigger><SelectContent>{variables.map(v => (<SelectItem key={v} value={v} className="text-xs">{`{{${v}}}`}</SelectItem>))}</SelectContent></Select>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={resetEditor} className="h-8 text-gray-500 hover:text-red-500"><Undo2 className="w-4 h-4 mr-1" />Reset</Button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === "code" ? (
        <div className="p-4 bg-gray-900"><pre className="text-green-400 text-sm font-mono overflow-auto max-h-[500px] p-4">{currentHtml}</pre></div>
      ) : viewMode === "preview" ? (
        <div className="bg-gray-100 p-6 min-h-[500px] flex items-start justify-center">
          <div className={`transition-all duration-300 ${deviceView === "mobile" ? "w-[375px]" : "w-[600px]"}`} style={{ transform: deviceView === "mobile" ? "scale(0.9)" : "scale(1)" }}>
            {deviceView === "mobile" && <div className="bg-gray-800 rounded-t-3xl p-2 flex justify-center"><div className="w-20 h-1 bg-gray-600 rounded-full" /></div>}
            <iframe srcDoc={currentHtml} className={`w-full bg-white shadow-2xl ${deviceView === "mobile" ? "h-[600px] rounded-b-3xl" : "h-[500px] rounded-xl"}`} title="Email Preview" />
          </div>
        </div>
      ) : (
        <div className="flex min-h-[500px]">
          {/* Left Panel - Blocks */}
          <div className="w-64 border-r bg-gray-50/50 flex flex-col">
            <div className="p-3 border-b bg-white"><h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2"><Layers className="w-4 h-4" />Content Blocks</h3></div>
            <ScrollArea className="flex-1 p-3">
              <div className="grid grid-cols-2 gap-2">
                {blockTypes.map(block => (
                  <button key={block.type} onClick={() => addBlock(block.type)} className="group p-3 rounded-xl border-2 border-gray-100 bg-white hover:border-emerald-300 hover:shadow-md transition-all text-center">
                    <div className={`w-10 h-10 mx-auto rounded-lg ${block.color} text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}><block.icon className="w-5 h-5" /></div>
                    <span className="text-xs font-medium text-gray-700">{block.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 p-3 rounded-xl bg-white border">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1"><Settings2 className="w-3 h-3" /> Email Style</h4>
                <div className="space-y-3">
                  <div><Label className="text-xs text-gray-500">Background</Label><div className="flex gap-1 mt-1"><input type="color" value={globalStyle.bgColor} onChange={(e) => setGlobalStyle({ ...globalStyle, bgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" /><Input value={globalStyle.bgColor} onChange={(e) => setGlobalStyle({ ...globalStyle, bgColor: e.target.value })} className="flex-1 h-8 text-xs font-mono" /></div></div>
                  <div><Label className="text-xs text-gray-500">Content BG</Label><div className="flex gap-1 mt-1"><input type="color" value={globalStyle.contentBg} onChange={(e) => setGlobalStyle({ ...globalStyle, contentBg: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" /><Input value={globalStyle.contentBg} onChange={(e) => setGlobalStyle({ ...globalStyle, contentBg: e.target.value })} className="flex-1 h-8 text-xs font-mono" /></div></div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: globalStyle.bgColor }}>
            <div className="max-w-[500px] mx-auto shadow-xl overflow-hidden transition-all" style={{ backgroundColor: globalStyle.contentBg, borderRadius: `${globalStyle.borderRadius}px` }}>
              {blocks.length === 0 ? (
                editingExistingHtml ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 flex items-center justify-center mb-4"><Code className="w-8 h-8 text-blue-500" /></div>
                    <p className="text-gray-700 font-medium mb-2">Existing HTML Template</p>
                    <p className="text-gray-500 text-sm mb-4">This template was created with HTML code. View it in Code or Preview mode, or start fresh.</p>
                    <div className="flex gap-2 justify-center">
                      <Button type="button" variant="outline" size="sm" onClick={() => setViewMode("preview")} className="gap-1"><Eye className="w-4 h-4" />Preview</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setViewMode("code")} className="gap-1"><Code className="w-4 h-4" />View Code</Button>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-gray-400 text-xs mb-2">Or rebuild with visual editor:</p>
                      <Button type="button" variant="link" onClick={() => { setEditingExistingHtml(false); setShowTemplates(true); }} className="text-emerald-600 text-sm"><LayoutTemplate className="w-4 h-4 mr-1" />Start New Design</Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4"><Plus className="w-8 h-8 text-gray-400" /></div>
                    <p className="text-gray-500 font-medium">Click a block to add content</p>
                    <p className="text-gray-400 text-sm mt-1">Or choose a template to get started</p>
                    <Button type="button" variant="link" onClick={() => setShowTemplates(true)} className="mt-2 text-emerald-600"><LayoutTemplate className="w-4 h-4 mr-1" />Browse Templates</Button>
                  </div>
                )
              ) : (
                blocks.map((block) => (
                  <div key={block.id} className={`relative group transition-all cursor-pointer ${selectedBlock === block.id ? "ring-2 ring-emerald-500 ring-inset" : "hover:ring-2 hover:ring-gray-300 hover:ring-inset"}`} onClick={() => setSelectedBlock(block.id)}>
                    <div className={`absolute -right-14 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-all ${selectedBlock === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild><Button type="button" variant="secondary" size="icon" className="h-8 w-8 shadow-lg" onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "up"); }}><ChevronUp className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="right">Move Up</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button type="button" variant="secondary" size="icon" className="h-8 w-8 shadow-lg" onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "down"); }}><ChevronDown className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="right">Move Down</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button type="button" variant="secondary" size="icon" className="h-8 w-8 shadow-lg" onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}><Copy className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="right">Duplicate</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button type="button" variant="destructive" size="icon" className="h-8 w-8 shadow-lg" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}><Trash2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="right">Delete</TooltipContent></Tooltip>
                      </TooltipProvider>
                    </div>
                    <BlockPreview block={block} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Editor */}
          <div className="w-72 border-l bg-white flex flex-col">
            {selectedBlockData ? (
              <>
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2"><Palette className="w-4 h-4" />Edit {blockTypes.find(b => b.type === selectedBlockData.type)?.name}</h3>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedBlock(null)}><X className="w-4 h-4" /></Button>
                </div>
                <ScrollArea className="flex-1 p-4"><BlockEditor block={selectedBlockData} onUpdate={(content) => updateBlock(selectedBlockData.id, content)} variables={variables} /></ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div>
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 flex items-center justify-center mb-3"><MousePointerClick className="w-6 h-6 text-gray-400" /></div>
                  <p className="text-gray-500 text-sm font-medium">Click a block to edit</p>
                  <p className="text-gray-400 text-xs mt-1">Select any element in the canvas</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BlockPreview({ block }: { block: EmailBlock }) {
  const { type, content } = block;
  switch (type) {
    case "header": return <div style={{ background: content.bgColor || "#10b981", padding: `${content.padding || 30}px`, textAlign: "center" }}><h1 style={{ color: content.textColor || "#ffffff", margin: 0, fontSize: `${content.fontSize || 28}px`, fontWeight: "bold" }}>{content.text || "Header"}</h1></div>;
    case "text": return <div style={{ padding: "20px 30px" }}><p style={{ color: content.color || "#374151", fontSize: `${content.fontSize || 16}px`, textAlign: (content.align || "left") as any, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{content.text || "Text content"}</p></div>;
    case "button": const btnPadding = content.size === "large" ? "16px 36px" : content.size === "small" ? "10px 20px" : "14px 28px"; return <div style={{ textAlign: (content.align || "center") as any, padding: "20px 30px" }}><span style={{ background: content.bgColor || "#10b981", color: content.textColor || "#ffffff", padding: btnPadding, borderRadius: `${content.radius || 8}px`, fontWeight: "600", display: "inline-block", fontSize: content.size === "large" ? "18px" : "16px" }}>{content.text || "Button"}</span></div>;
    case "image": return <div style={{ textAlign: (content.align || "center") as any, padding: "20px 30px" }}>{content.url ? <img src={content.url} alt={content.alt || "Image"} style={{ maxWidth: `${content.width || 100}%`, height: "auto", borderRadius: "8px" }} /> : <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-10 rounded-xl text-center border-2 border-dashed border-gray-300"><ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" /><p className="text-gray-500 text-sm">Add image URL</p></div>}</div>;
    case "divider": return <div style={{ padding: "15px 30px" }}><hr style={{ border: "none", borderTop: `${content.thickness || 1}px ${content.style || "solid"} ${content.color || "#e5e7eb"}`, margin: 0 }} /></div>;
    case "spacer": return <div style={{ height: `${content.height || 30}px` }} className="bg-gradient-to-r from-transparent via-gray-100 to-transparent opacity-50 flex items-center justify-center"><span className="text-[10px] text-gray-400 bg-white px-2 rounded">{content.height}px</span></div>;
    case "product": return <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "24px", margin: "20px 30px", textAlign: "center" }}>{content.imageUrl ? <img src={content.imageUrl} alt={content.name} style={{ maxWidth: "160px", height: "auto", borderRadius: "12px", marginBottom: "16px" }} /> : <div className="bg-gradient-to-br from-gray-200 to-gray-300 w-32 h-32 mx-auto rounded-xl flex items-center justify-center mb-4"><Package className="w-10 h-10 text-gray-400" /></div>}<h3 style={{ margin: "0 0 8px 0", color: "#1f2937", fontSize: "18px", fontWeight: "600" }}>{content.name || "Product"}</h3><p style={{ color: "#10b981", fontSize: "24px", fontWeight: "bold", margin: "8px 0 16px" }}>{content.price || "$0.00"}</p><span style={{ background: "#10b981", color: "white", padding: "12px 24px", borderRadius: "10px", display: "inline-block", fontWeight: "600" }}>{content.buttonText || "View"}</span></div>;
    case "coupon": return <div style={{ background: `linear-gradient(135deg, ${content.bgColor || "#fef3c7"}, #fff7ed)`, border: `3px dashed ${content.borderColor || "#f59e0b"}`, borderRadius: "16px", padding: "24px", margin: "20px 30px", textAlign: "center" }}><p style={{ color: "#92400e", fontSize: "28px", fontWeight: "bold", margin: "0 0 12px" }}>{content.discount || "10% OFF"}</p><div style={{ background: "white", padding: "14px 28px", borderRadius: "10px", fontFamily: "monospace", fontSize: "24px", margin: "12px auto", display: "inline-block", border: `2px solid ${content.borderColor || "#f59e0b"}`, letterSpacing: "3px", fontWeight: "bold" }}>{content.code || "CODE"}</div><p style={{ color: "#78350f", margin: "12px 0 0", fontSize: "14px" }}>{content.description || ""}</p></div>;
    default: return <div className="p-4 text-gray-400">Unknown block</div>;
  }
}

function BlockEditor({ block, onUpdate, variables }: { block: EmailBlock; onUpdate: (content: any) => void; variables: string[] }) {
  const { type, content } = block;

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div><Label className="text-xs text-gray-500">{label}</Label><div className="flex gap-2 mt-1.5"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 rounded-lg cursor-pointer border border-gray-200" /><Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 h-9 text-xs font-mono" /></div></div>
  );

  const AlignPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div><Label className="text-xs text-gray-500">Alignment</Label><div className="flex gap-1 mt-1.5">{[{ v: "left", i: AlignLeft }, { v: "center", i: AlignCenter }, { v: "right", i: AlignRight }].map(({ v, i: Icon }) => (<Button key={v} type="button" variant={value === v ? "default" : "outline"} size="sm" className="flex-1 h-9" onClick={() => onChange(v)}><Icon className="w-4 h-4" /></Button>))}</div></div>
  );

  const SliderField = ({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) => (
    <div><div className="flex justify-between items-center mb-1.5"><Label className="text-xs text-gray-500">{label}</Label><span className="text-xs font-mono text-gray-400">{value}px</span></div><Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} className="mt-1" /></div>
  );

  switch (type) {
    case "header": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Heading Text</Label><Input value={content.text} onChange={(e) => onUpdate({ text: e.target.value })} className="mt-1.5 h-10" placeholder="Enter heading..." /></div>
        <div className="grid grid-cols-2 gap-3"><ColorPicker label="Background" value={content.bgColor || "#10b981"} onChange={(v) => onUpdate({ bgColor: v })} /><ColorPicker label="Text Color" value={content.textColor || "#ffffff"} onChange={(v) => onUpdate({ textColor: v })} /></div>
        <SliderField label="Font Size" value={parseInt(content.fontSize || "28")} onChange={(v) => onUpdate({ fontSize: v.toString() })} min={18} max={48} />
        <SliderField label="Padding" value={parseInt(content.padding || "30")} onChange={(v) => onUpdate({ padding: v.toString() })} min={10} max={60} />
      </div>
    );
    case "text": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Text Content</Label><Textarea value={content.text} onChange={(e) => onUpdate({ text: e.target.value })} rows={5} className="mt-1.5 text-sm" placeholder="Enter your text..." />{variables.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{variables.map(v => (<Badge key={v} variant="secondary" className="cursor-pointer text-xs hover:bg-emerald-100 hover:text-emerald-700 transition-colors" onClick={() => onUpdate({ text: content.text + `{{${v}}}` })}>{`{{${v}}}`}</Badge>))}</div>}</div>
        <ColorPicker label="Text Color" value={content.color || "#374151"} onChange={(v) => onUpdate({ color: v })} />
        <AlignPicker value={content.align || "left"} onChange={(v) => onUpdate({ align: v })} />
        <SliderField label="Font Size" value={parseInt(content.fontSize || "16")} onChange={(v) => onUpdate({ fontSize: v.toString() })} min={12} max={24} />
      </div>
    );
    case "button": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Button Text</Label><Input value={content.text} onChange={(e) => onUpdate({ text: e.target.value })} className="mt-1.5 h-10" /></div>
        <div><Label className="text-xs text-gray-500">Link URL</Label><Input value={content.url} onChange={(e) => onUpdate({ url: e.target.value })} className="mt-1.5 h-10" placeholder="https://..." /></div>
        <div className="grid grid-cols-2 gap-3"><ColorPicker label="Background" value={content.bgColor || "#10b981"} onChange={(v) => onUpdate({ bgColor: v })} /><ColorPicker label="Text Color" value={content.textColor || "#ffffff"} onChange={(v) => onUpdate({ textColor: v })} /></div>
        <AlignPicker value={content.align || "center"} onChange={(v) => onUpdate({ align: v })} />
        <div><Label className="text-xs text-gray-500">Size</Label><Select value={content.size || "medium"} onValueChange={(v) => onUpdate({ size: v })}><SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="small">Small</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="large">Large</SelectItem></SelectContent></Select></div>
        <SliderField label="Border Radius" value={parseInt(content.radius || "8")} onChange={(v) => onUpdate({ radius: v.toString() })} min={0} max={30} />
      </div>
    );
    case "image": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Image URL</Label><Input value={content.url} onChange={(e) => onUpdate({ url: e.target.value })} className="mt-1.5 h-10" placeholder="https://..." /></div>
        <div><Label className="text-xs text-gray-500">Alt Text</Label><Input value={content.alt} onChange={(e) => onUpdate({ alt: e.target.value })} className="mt-1.5 h-10" placeholder="Image description" /></div>
        <AlignPicker value={content.align || "center"} onChange={(v) => onUpdate({ align: v })} />
        <SliderField label="Width" value={parseInt(content.width || "100")} onChange={(v) => onUpdate({ width: v.toString() })} min={20} max={100} />
      </div>
    );
    case "divider": return (
      <div className="space-y-5">
        <ColorPicker label="Color" value={content.color || "#e5e7eb"} onChange={(v) => onUpdate({ color: v })} />
        <div><Label className="text-xs text-gray-500">Style</Label><Select value={content.style || "solid"} onValueChange={(v) => onUpdate({ style: v })}><SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem><SelectItem value="dotted">Dotted</SelectItem></SelectContent></Select></div>
        <SliderField label="Thickness" value={parseInt(content.thickness || "1")} onChange={(v) => onUpdate({ thickness: v.toString() })} min={1} max={5} />
      </div>
    );
    case "spacer": return <SliderField label="Height" value={parseInt(content.height || "30")} onChange={(v) => onUpdate({ height: v.toString() })} min={10} max={100} />;
    case "product": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Product Name</Label><Input value={content.name} onChange={(e) => onUpdate({ name: e.target.value })} className="mt-1.5 h-10" /></div>
        <div><Label className="text-xs text-gray-500">Price</Label><Input value={content.price} onChange={(e) => onUpdate({ price: e.target.value })} className="mt-1.5 h-10" placeholder="$99.99" /></div>
        <div><Label className="text-xs text-gray-500">Image URL</Label><Input value={content.imageUrl} onChange={(e) => onUpdate({ imageUrl: e.target.value })} className="mt-1.5 h-10" placeholder="https://..." /></div>
        <div><Label className="text-xs text-gray-500">Button Text</Label><Input value={content.buttonText} onChange={(e) => onUpdate({ buttonText: e.target.value })} className="mt-1.5 h-10" /></div>
        <div><Label className="text-xs text-gray-500">Button URL</Label><Input value={content.buttonUrl} onChange={(e) => onUpdate({ buttonUrl: e.target.value })} className="mt-1.5 h-10" placeholder="https://..." /></div>
      </div>
    );
    case "coupon": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Discount Text</Label><Input value={content.discount} onChange={(e) => onUpdate({ discount: e.target.value })} className="mt-1.5 h-10" placeholder="10% OFF" /></div>
        <div><Label className="text-xs text-gray-500">Coupon Code</Label><Input value={content.code} onChange={(e) => onUpdate({ code: e.target.value })} className="mt-1.5 h-10 font-mono tracking-wider" /></div>
        <div><Label className="text-xs text-gray-500">Description</Label><Input value={content.description} onChange={(e) => onUpdate({ description: e.target.value })} className="mt-1.5 h-10" /></div>
        <div className="grid grid-cols-2 gap-3"><ColorPicker label="Background" value={content.bgColor || "#fef3c7"} onChange={(v) => onUpdate({ bgColor: v })} /><ColorPicker label="Border" value={content.borderColor || "#f59e0b"} onChange={(v) => onUpdate({ borderColor: v })} /></div>
      </div>
    );
    default: return <p className="text-gray-400 text-sm">No options</p>;
  }
}

export default VisualEmailEditor;
