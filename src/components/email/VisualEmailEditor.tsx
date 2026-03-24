import { useState, useEffect, useRef, useCallback } from "react";
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
  AlignLeft, AlignCenter, AlignRight, Palette, Layout, Undo2, Redo2,
  Mail, Smartphone, Monitor, MousePointerClick, Layers, Settings2, Wand2, LayoutTemplate, Sparkles, GripVertical,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Columns, Download, Upload, Bold, Italic, Link, Save, FlaskConical, Zap, ShoppingCart, Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { evaluateEmailHtmlReadiness, type EmailReadinessIssue } from "@/lib/emailReadiness";

// Utility to move items in array
const moveItem = <T,>(array: T[], fromIndex: number, toIndex: number): T[] => {
  const newArray = [...array];
  const [removed] = newArray.splice(fromIndex, 1);
  newArray.splice(toIndex, 0, removed);
  return newArray;
};

interface EmailBlock { id: string; type: string; content: any; }

interface EmailColumn {
  id: string;
  width: number; // Percentage (e.g., 100, 50, 33)
  block: EmailBlock;
}

interface EmailRow {
  id: string;
  columns: EmailColumn[];
  locked?: boolean; // For footer
}

interface VisualEmailEditorProps { 
  initialHtml?: string; 
  onChange?: (html: string) => void; 
  variables?: string[];
  templates?: Array<{ id: string; name: string; subject: string; html_content: string; }>;
  onVariantCreate?: (variant: { name: string; html: string }) => void;
  onSave?: (html: string) => void;
  templateName?: string;
}

// History state for undo/redo
interface HistoryState {
  rows: EmailRow[];
  globalStyle: { bgColor: string; contentBg: string; borderRadius: string };
}

// Saved block template interface
interface SavedBlockTemplate {
  id: string;
  name: string;
  type: string;
  content: any;
  createdAt: string;
}

const blockDefaults: Record<string, any> = {
  header: { text: "Your Heading Here", bgColor: "#10b981", textColor: "#ffffff", fontSize: "28", padding: "30" },
  text: { text: "Enter your text here...", color: "#374151", fontSize: "16", align: "left" },
  button: { text: "Click Here", url: "#", bgColor: "#10b981", textColor: "#ffffff", align: "center", radius: "8", size: "medium" },
  image: { url: "", alt: "Image", width: "100", align: "center" },
  divider: { color: "#e5e7eb", thickness: "1", style: "solid" },
  spacer: { height: "30" },
  product: { name: "Product Name", price: "$99.99", imageUrl: "", buttonText: "View Product", buttonUrl: "#", mode: "static" },
  cart_items: { 
    buttonText: "Complete Your Order", 
    buttonUrl: "https://9rx.com/pharmacy/order/create",
    showImages: true,
    showPrices: true,
    showQuantity: true,
  },
  coupon: { code: "SAVE10", discount: "10% OFF", description: "Use at checkout", bgColor: "#fef3c7", borderColor: "#f59e0b" },
  footer: { 
    companyName: "9RX LLC", 
    address: "936 Broad River Ln, Charlotte, NC 28211", 
    phone: "+1 (800) 940-9619", 
    email: "info@9rx.com", 
    website: "www.9rx.com",
    bgColor: "#1f2937", 
    textColor: "#9ca3af",
    linkColor: "#10b981",
    showUnsubscribe: true,
    showSocial: true,
    socialLinks: {
      facebook: "",
      twitter: "",
      linkedin: "",
      instagram: ""
    }
  },
};

const emailTemplates = [
  { id: "welcome", name: "Welcome", description: "Greet new users", gradient: "from-blue-400 to-purple-500",
    blocks: [
      { type: "header", content: { text: "Welcome to 9RX! 🎉", bgColor: "#10b981", textColor: "#ffffff" } },
      { type: "text", content: { text: "Hi {{first_name}},\n\nThank you for joining 9RX!", align: "left" } },
      { type: "button", content: { text: "Start Shopping", url: "https://9rx.com/pharmacy", bgColor: "#10b981" } },
      { type: "footer", content: { ...blockDefaults.footer } },
    ]},
  { id: "abandoned", name: "Cart Recovery", description: "Win back customers", gradient: "from-orange-400 to-pink-500",
    blocks: [
      { type: "header", content: { text: "You left something behind! 🛒", bgColor: "#f97316", textColor: "#ffffff" } },
      { type: "text", content: { text: "Hi {{first_name}},\n\nYour cart is waiting!" } },
      { type: "coupon", content: { code: "COMEBACK10", discount: "10% OFF", description: "Complete your order" } },
      { type: "button", content: { text: "Complete Order", url: "https://9rx.com/cart", bgColor: "#f97316" } },
      { type: "footer", content: { ...blockDefaults.footer } },
    ]},
  { id: "order", name: "Order Confirmed", description: "Confirmation email", gradient: "from-green-400 to-blue-500",
    blocks: [
      { type: "header", content: { text: "Order Confirmed! ✅", bgColor: "#22c55e", textColor: "#ffffff" } },
      { type: "text", content: { text: "Hi {{first_name}},\n\nYour order #{{order_number}} is confirmed!" } },
      { type: "button", content: { text: "Track Order", url: "https://9rx.com/orders", bgColor: "#22c55e" } },
      { type: "footer", content: { ...blockDefaults.footer } },
    ]},
  { id: "promo", name: "Promotion", description: "Special offers", gradient: "from-purple-400 to-pink-500",
    blocks: [
      { type: "header", content: { text: "Special Offer! ⭐", bgColor: "#8b5cf6", textColor: "#ffffff" } },
      { type: "coupon", content: { code: "SAVE20", discount: "20% OFF", description: "Limited time!" } },
      { type: "button", content: { text: "Shop Now", url: "https://9rx.com/pharmacy", bgColor: "#8b5cf6" } },
      { type: "footer", content: { ...blockDefaults.footer } },
    ]},
];

const blockTypes = [
  { type: "header", name: "Header", icon: Type, color: "bg-blue-500", category: "Structure", description: "Hero title or intro band" },
  { type: "text", name: "Text", icon: Type, color: "bg-gray-500", category: "Content", description: "Paragraphs, notes, and copy" },
  { type: "button", name: "Button", icon: MousePointerClick, color: "bg-green-500", category: "Content", description: "Primary CTA button" },
  { type: "image", name: "Image", icon: ImageIcon, color: "bg-purple-500", category: "Media", description: "Banner, logo, or product image" },
  { type: "divider", name: "Divider", icon: Minus, color: "bg-gray-400", category: "Structure", description: "Visual separator line" },
  { type: "spacer", name: "Spacer", icon: Square, color: "bg-gray-300", category: "Structure", description: "Add breathing room" },
  { type: "product", name: "Product", icon: Package, color: "bg-orange-500", category: "Commerce", description: "Featured product card" },
  { type: "cart_items", name: "Cart Items", icon: ShoppingCart, color: "bg-amber-500", category: "Commerce", description: "Dynamic abandoned cart block" },
  { type: "coupon", name: "Coupon", icon: Gift, color: "bg-yellow-500", category: "Commerce", description: "Discount code spotlight" },
  { type: "footer", name: "Footer", icon: Mail, color: "bg-indigo-500", category: "Structure", description: "Brand and compliance footer" },
];

const blockCategories = [
  { name: "Structure", description: "Layout and framing blocks" },
  { name: "Content", description: "Core message and CTA blocks" },
  { name: "Media", description: "Visual storytelling blocks" },
  { name: "Commerce", description: "Merchandising and conversion blocks" },
];

function generateHtml(rows: EmailRow[], globalStyle: any): string {
  const bodyContent = rows.map(row => {
    // Start a table for the row
    const rowContent = `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;" class="email-row">
      <tr>
        ${row.columns.map(col => {
          const { type, content } = col.block;
          let blockHtml = "";
          
          switch (type) {
            case "header": blockHtml = `<div style="background:${content.bgColor || "#10b981"};padding:${content.padding || 30}px;text-align:center;"><h1 style="color:${content.textColor || "#ffffff"};margin:0;font-size:${content.fontSize || 28}px;font-weight:bold;">${content.text || ""}</h1></div>`; break;
            case "empty": blockHtml = ""; break;
            case "text": blockHtml = `<div style="padding:20px 30px;"><p style="color:${content.color || "#374151"};font-size:${content.fontSize || 16}px;text-align:${content.align || "left"};margin:0;line-height:1.7;white-space:pre-wrap;">${(content.text || "").replace(/\n/g, "<br>")}</p></div>`; break;
            case "button": const bp = content.size === "large" ? "16px 36px" : content.size === "small" ? "10px 20px" : "14px 28px"; blockHtml = `<div style="text-align:${content.align || "center"};padding:20px 30px;"><a href="${content.url || "#"}" style="background:${content.bgColor || "#10b981"};color:${content.textColor || "#ffffff"};padding:${bp};text-decoration:none;border-radius:${content.radius || 8}px;font-weight:600;display:inline-block;" class="email-button">${content.text || ""}</a></div>`; break;
            case "image": blockHtml = content.url ? `<div style="text-align:${content.align || "center"};padding:20px 30px;"><img src="${content.url}" alt="${content.alt || ""}" style="max-width:${content.width || 100}%;height:auto;border-radius:8px;" class="email-image" /></div>` : ""; break;
            case "divider": blockHtml = `<div style="padding:15px 30px;"><hr style="border:none;border-top:${content.thickness || 1}px ${content.style || "solid"} ${content.color || "#e5e7eb"};margin:0;" /></div>`; break;
            case "spacer": blockHtml = `<div style="height:${content.height || 30}px;"></div>`; break;
            case "product": blockHtml = `<div style="background:#f8fafc;border-radius:16px;padding:24px;margin:20px 30px;text-align:center;" class="email-product">${content.imageUrl ? `<img src="${content.imageUrl}" alt="${content.name}" style="max-width:160px;height:auto;border-radius:12px;margin-bottom:16px;" />` : ""}<h3 style="margin:0 0 8px;color:#1f2937;font-size:18px;font-weight:600;">${content.name || ""}</h3><p style="color:#10b981;font-size:24px;font-weight:bold;margin:8px 0 16px;">${content.price || ""}</p><a href="${content.buttonUrl || "#"}" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:10px;display:inline-block;font-weight:600;">${content.buttonText || ""}</a></div>`; break;
            case "cart_items": blockHtml = `
              <div style="padding:20px 30px;">
                <div style="background:#f8fafc;border-radius:16px;padding:24px;margin-bottom:20px;">
                  <h3 style="margin:0 0 16px;color:#1f2937;font-size:18px;font-weight:600;text-align:center;">🛒 Your Cart Items</h3>
                  <!-- Cart items will be dynamically inserted here -->
                  {{cart_items}}
                  <div style="border-top:2px solid #e5e7eb;margin-top:16px;padding-top:16px;text-align:right;">
                    <p style="margin:0;color:#1f2937;font-size:18px;font-weight:bold;">Total: ${{cart_total}}</p>
                  </div>
                </div>
                <div style="text-align:center;">
                  <a href="${content.buttonUrl || "https://9rx.com/pharmacy/order/create"}" style="background:#10b981;color:white;padding:16px 36px;text-decoration:none;border-radius:10px;display:inline-block;font-weight:600;font-size:16px;" class="email-button">${content.buttonText || "Complete Your Order"}</a>
                </div>
              </div>`; break;
            case "coupon": blockHtml = `<div style="background:linear-gradient(135deg,${content.bgColor || "#fef3c7"},#fff7ed);border:3px dashed ${content.borderColor || "#f59e0b"};border-radius:16px;padding:24px;margin:20px 30px;text-align:center;" class="email-coupon"><p style="color:#92400e;font-size:28px;font-weight:bold;margin:0 0 12px;">${content.discount || ""}</p><div style="background:white;padding:14px 28px;border-radius:10px;font-family:monospace;font-size:24px;margin:12px auto;display:inline-block;border:2px solid ${content.borderColor || "#f59e0b"};letter-spacing:3px;font-weight:bold;">${content.code || ""}</div><p style="color:#78350f;margin:12px 0 0;font-size:14px;">${content.description || ""}</p></div>`; break;
            case "footer": blockHtml = `<div style="background:${content.bgColor || "#1f2937"};padding:40px 30px 30px;text-align:center;color:${content.textColor || "#9ca3af"};font-size:14px;line-height:1.6;">
              <div style="margin-bottom:20px;">
                <h3 style="color:${content.linkColor || "#10b981"};font-size:18px;font-weight:bold;margin:0 0 10px;">${content.companyName || "9RX LLC"}</h3>
                <p style="margin:0 0 8px;">${content.address || "936 Broad River Ln, Charlotte, NC 28211"}</p>
                <p style="margin:0 0 8px;">Phone: <a href="tel:${content.phone || "+18009696295"}" style="color:${content.linkColor || "#10b981"};text-decoration:none;">${content.phone || "+1 (800) 940-9619"}</a></p>
                <p style="margin:0 0 8px;">Email: <a href="mailto:${content.email || "info@9rx.com"}" style="color:${content.linkColor || "#10b981"};text-decoration:none;">${content.email || "info@9rx.com"}</a></p>
                <p style="margin:0;">Website: <a href="https://${content.website || "www.9rx.com"}" style="color:${content.linkColor || "#10b981"};text-decoration:none;">${content.website || "www.9rx.com"}</a></p>
              </div>
              ${content.showSocial ? `<div style="margin:20px 0;">
                ${content.socialLinks?.facebook ? `<a href="${content.socialLinks.facebook}" style="color:${content.linkColor || "#10b981"};text-decoration:none;margin:0 10px;">Facebook</a>` : ""}
                ${content.socialLinks?.twitter ? `<a href="${content.socialLinks.twitter}" style="color:${content.linkColor || "#10b981"};text-decoration:none;margin:0 10px;">Twitter</a>` : ""}
                ${content.socialLinks?.linkedin ? `<a href="${content.socialLinks.linkedin}" style="color:${content.linkColor || "#10b981"};text-decoration:none;margin:0 10px;">LinkedIn</a>` : ""}
                ${content.socialLinks?.instagram ? `<a href="${content.socialLinks.instagram}" style="color:${content.linkColor || "#10b981"};text-decoration:none;margin:0 10px;">Instagram</a>` : ""}
              </div>` : ""}
              <div style="border-top:1px solid #374151;padding-top:20px;margin-top:20px;font-size:12px;">
                <p style="margin:0 0 8px;">© ${new Date().getFullYear()} ${content.companyName || "9RX LLC"}. All rights reserved.</p>
                ${content.showUnsubscribe ? `<p style="margin:0;"><a href="{{unsubscribe_url}}" style="color:${content.textColor || "#9ca3af"};text-decoration:underline;">Unsubscribe</a> | <a href="https://9rx.com/privacy-policy" style="color:${content.textColor || "#9ca3af"};text-decoration:underline;">Privacy Policy</a></p>` : ""}
              </div>
            </div>`; break;
            default: blockHtml = "";
          }

          return `
            <td width="${col.width}%" valign="top" style="width: ${col.width}%;" class="email-column">
              ${blockHtml}
            </td>
          `;
        }).join("")}
      </tr>
    </table>
    `;
    return rowContent;
  }).join("\n");
  
  // Responsive CSS for mobile devices
  const responsiveStyles = `
    <style type="text/css">
      @media only screen and (max-width: 480px) {
        .email-row td.email-column {
          display: block !important;
          width: 100% !important;
        }
        .email-button {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
          box-sizing: border-box !important;
        }
        .email-image {
          max-width: 100% !important;
          height: auto !important;
        }
        .email-product, .email-coupon {
          margin: 10px 15px !important;
        }
      }
    </style>
  `;
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">${responsiveStyles}</head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:${globalStyle.bgColor || "#f1f5f9"};"><div style="background:${globalStyle.contentBg || "#ffffff"};border-radius:${globalStyle.borderRadius || 12}px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">${bodyContent}</div></body></html>`;
}

export function VisualEmailEditor({ initialHtml, onChange, variables = [], templates = [], onVariantCreate, onSave, templateName }: VisualEmailEditorProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "code">("edit");
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [globalStyle, setGlobalStyle] = useState({ bgColor: "#f1f5f9", contentBg: "#ffffff", borderRadius: "12" });
  const [htmlEditMode, setHtmlEditMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  
  // Saved block templates
  const [savedBlockTemplates, setSavedBlockTemplates] = useState<SavedBlockTemplate[]>([]);
  const [showSaveBlockDialog, setShowSaveBlockDialog] = useState(false);
  const [blockTemplateNameInput, setBlockTemplateNameInput] = useState("");
  
  // A/B Testing
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [variantName, setVariantName] = useState("");
  
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Drag and drop states
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingNewBlock, setIsDraggingNewBlock] = useState(false);
  const [blockSearch, setBlockSearch] = useState("");

  const normalizedBlockSearch = blockSearch.trim().toLowerCase();
  const filteredBlockTypes = blockTypes.filter((block) => {
    if (!normalizedBlockSearch) return true;
    return [block.name, block.type, block.category, block.description]
      .join(" ")
      .toLowerCase()
      .includes(normalizedBlockSearch);
  });
  const filteredSavedBlockTemplates = savedBlockTemplates.filter((template) => {
    if (!normalizedBlockSearch) return true;
    return [template.name, template.type].join(" ").toLowerCase().includes(normalizedBlockSearch);
  });

  const insertSavedBlockTemplate = useCallback((template: SavedBlockTemplate) => {
    const newBlock: EmailBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      content: { ...template.content }
    };
    const newRow: EmailRow = {
      id: `row-${Date.now()}`,
      columns: [{ id: `col-${Date.now()}`, width: 100, block: newBlock }]
    };
    const footerIndex = rows.findIndex(r => r.columns.some(c => c.block.type === 'footer'));
    const insertIndex = footerIndex !== -1 ? footerIndex : rows.length;
    const newRows = [...rows];
    newRows.splice(insertIndex, 0, newRow);
    setRows(newRows);
    setSelectedBlock(newBlock.id);
    toast({ title: "Added!", description: `Block "${template.name}" added` });
  }, [rows, toast]);

  // Load saved block templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('emailBlockTemplates');
    if (saved) {
      try {
        setSavedBlockTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved block templates:', e);
      }
    }
  }, []);

  // Save history state
  const saveToHistory = useCallback((newRows: EmailRow[], newGlobalStyle: typeof globalStyle) => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }
    
    const newState: HistoryState = {
      rows: JSON.parse(JSON.stringify(newRows)),
      globalStyle: { ...newGlobalStyle }
    };
    
    // Remove any future states if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      const prevState = history[historyIndex - 1];
      setRows(JSON.parse(JSON.stringify(prevState.rows)));
      setGlobalStyle({ ...prevState.globalStyle });
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      const nextState = history[historyIndex + 1];
      setRows(JSON.parse(JSON.stringify(nextState.rows)));
      setGlobalStyle({ ...nextState.globalStyle });
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Export HTML function
  const exportHtml = useCallback(() => {
    const html = rows.length > 0 ? generateHtml(rows, globalStyle) : htmlContent;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-template-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "HTML file downloaded successfully" });
  }, [rows, globalStyle, htmlContent, toast]);

  // Save block as template
  const saveBlockAsTemplate = useCallback((block: EmailBlock) => {
    if (!blockTemplateNameInput.trim()) {
      toast({ title: "Error", description: "Please enter a template name", variant: "destructive" });
      return;
    }
    
    const newTemplate: SavedBlockTemplate = {
      id: `template-${Date.now()}`,
      name: blockTemplateNameInput.trim(),
      type: block.type,
      content: { ...block.content },
      createdAt: new Date().toISOString()
    };
    
    const updated = [...savedBlockTemplates, newTemplate];
    setSavedBlockTemplates(updated);
    localStorage.setItem('emailBlockTemplates', JSON.stringify(updated));
    setShowSaveBlockDialog(false);
    setBlockTemplateNameInput("");
    toast({ title: "Saved!", description: `Block template "${newTemplate.name}" saved` });
  }, [blockTemplateNameInput, savedBlockTemplates, toast]);

  // Delete saved block template
  const deleteBlockTemplate = useCallback((templateId: string) => {
    const updated = savedBlockTemplates.filter(t => t.id !== templateId);
    setSavedBlockTemplates(updated);
    localStorage.setItem('emailBlockTemplates', JSON.stringify(updated));
    toast({ title: "Deleted", description: "Block template removed" });
  }, [savedBlockTemplates, toast]);

  // Create A/B variant
  const createVariant = useCallback(() => {
    if (!variantName.trim()) {
      toast({ title: "Error", description: "Please enter a variant name", variant: "destructive" });
      return;
    }
    
    const html = rows.length > 0 ? generateHtml(rows, globalStyle) : htmlContent;
    onVariantCreate?.({ name: variantName.trim(), html });
    setShowVariantDialog(false);
    setVariantName("");
    toast({ title: "Variant Created!", description: `A/B variant "${variantName}" created` });
  }, [variantName, rows, globalStyle, htmlContent, onVariantCreate, toast]);

  // Upload image to Supabase
  const uploadImageToSupabase = useCallback(async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Validate file
      if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return null;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
        return null;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `email-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      // Use product-images bucket which already exists
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      
      if (error) {
        console.error('Upload error:', error);
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        return null;
      }
      
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      toast({ title: "Uploaded!", description: "Image uploaded successfully" });
      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: "Upload Failed", description: "Failed to upload image", variant: "destructive" });
      return null;
    } finally {
      setUploadingImage(false);
    }
  }, [toast]);

  // Auto-optimize for mobile - adjusts all blocks for better mobile viewing
  const optimizeForMobile = useCallback(() => {
    if (rows.length === 0) {
      toast({ title: "No content", description: "Add some blocks first to optimize", variant: "destructive" });
      return;
    }

    const optimizedRows = rows.map(row => {
      // Convert multi-column rows to single column for mobile
      if (row.columns.length > 1) {
        // Split into separate rows
        return row.columns.map((col, idx) => ({
          id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          locked: row.locked,
          columns: [{
            ...col,
            width: 100, // Full width on mobile
            block: {
              ...col.block,
              content: optimizeBlockContent(col.block.type, col.block.content)
            }
          }]
        }));
      }
      
      // Single column - just optimize content
      return [{
        ...row,
        columns: row.columns.map(col => ({
          ...col,
          width: 100,
          block: {
            ...col.block,
            content: optimizeBlockContent(col.block.type, col.block.content)
          }
        }))
      }];
    }).flat();

    setRows(optimizedRows);
    toast({ 
      title: "✨ Optimized for Mobile!", 
      description: "Font sizes increased, columns stacked, buttons enlarged" 
    });
  }, [rows, toast]);

  // Helper function to optimize individual block content for mobile
  const optimizeBlockContent = (type: string, content: any) => {
    switch (type) {
      case 'header':
        return {
          ...content,
          fontSize: Math.max(parseInt(content.fontSize || '28'), 24).toString(), // Min 24px
          padding: Math.max(parseInt(content.padding || '30'), 20).toString(), // Min 20px padding
        };
      case 'text':
        return {
          ...content,
          fontSize: Math.max(parseInt(content.fontSize || '16'), 16).toString(), // Min 16px for readability
          align: 'left', // Left align for mobile readability
        };
      case 'button':
        return {
          ...content,
          size: 'large', // Larger buttons for touch
          align: 'center',
          radius: Math.max(parseInt(content.radius || '8'), 8).toString(),
        };
      case 'image':
        return {
          ...content,
          width: '100', // Full width images
          align: 'center',
        };
      case 'product':
        return {
          ...content,
          // Product cards stay centered
        };
      case 'coupon':
        return {
          ...content,
          // Coupons stay as is
        };
      case 'spacer':
        return {
          ...content,
          height: Math.min(parseInt(content.height || '30'), 40).toString(), // Reduce spacer height
        };
      default:
        return content;
    }
  };

  // Helper function for array reordering
  function moveItem<T>(arr: T[], from: number, to: number) {
    const copy = [...arr];
    const item = copy.splice(from, 1)[0];
    copy.splice(to, 0, item);
    return copy;
  }

  // Add premium slider CSS styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .slider-premium [data-radix-slider-thumb] {
        transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                    box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                    background-color 0.15s ease;
        cursor: grab;
        background: linear-gradient(135deg, #10b981, #059669);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }
      
      .slider-premium [data-radix-slider-thumb]:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      }
      
      .slider-premium [data-radix-slider-thumb]:active {
        transform: scale(1.15);
        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.25),
        0 4px 16px rgba(16, 185, 129, 0.5);
        cursor: grabbing;
        background: linear-gradient(135deg, #059669, #047857);
      }
      
      .slider-premium [data-radix-slider-track] {
        transition: background-color 0.15s ease;
        background: linear-gradient(90deg, #e5e7eb, #d1d5db);
      }
      
      .slider-premium:hover [data-radix-slider-track] {
        background: linear-gradient(90deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
      }
      
      .slider-premium [data-radix-slider-range] {
        background: linear-gradient(90deg, #10b981, #059669);
        transition: background 0.15s ease;
      }
      
      .slider-premium:hover [data-radix-slider-range] {
        background: linear-gradient(90deg, #059669, #047857);
      }
      
      .slider-active [data-radix-slider-range] {
        background: linear-gradient(90deg, #059669, #047857);
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
      }
      
      .block-preview-smooth {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        animation: fadeInUp 0.28s ease-out;
      }
      
      .block-preview-smooth h1,
      .block-preview-smooth h2,
      .block-preview-smooth h3,
      .block-preview-smooth p,
      .block-preview-smooth span,
      .block-preview-smooth div {
        transition: font-size 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                    padding 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                    width 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                    border-radius 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                    background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                    color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .editor-float-in {
        animation: fadeInUp 0.24s ease-out;
      }

      .editor-pulse-ring {
        animation: pulseRing 1.8s ease-in-out infinite;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pulseRing {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.18);
        }
        50% {
          box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
        }
      }
      
      /* Premium focus states */
      .slider-premium [data-radix-slider-thumb]:focus-visible {
        outline: none;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3),
                    0 4px 12px rgba(16, 185, 129, 0.4);
      }
      
      /* Mobile touch improvements */
      @media (hover: none) and (pointer: coarse) {
        .slider-premium [data-radix-slider-thumb] {
          width: 24px;
          height: 24px;
        }
        
        .slider-premium [data-radix-slider-thumb]:active {
          transform: scale(1.2);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Check if we have existing HTML content (editing mode)
  const hasInitialHtml = !!(initialHtml && initialHtml.trim() !== "");
  const [showTemplates, setShowTemplates] = useState(!hasInitialHtml);
  const [editingExistingHtml, setEditingExistingHtml] = useState(hasInitialHtml);

  // Initialize HTML content
  useEffect(() => {
    if (hasInitialHtml && !htmlContent) {
      setHtmlContent(initialHtml || '');
    }
  }, [initialHtml, hasInitialHtml, htmlContent]);

  // Combine hardcoded templates with database templates
  const allTemplates = [
    ...emailTemplates,
    ...templates.map(template => ({
      id: `db_${template.id}`,
      name: template.name,
      description: "Saved template",
      gradient: "from-blue-400 to-purple-500",
      blocks: [], // Will be loaded from html_content
      html_content: template.html_content,
      subject: template.subject
    }))
  ];

  useEffect(() => {
    if (rows.length > 0) {
      const generatedHtml = generateHtml(rows, globalStyle);
      // console.log('Generated HTML from rows:', generatedHtml.substring(0, 200) + '...'); // Debug log
      onChange?.(generatedHtml);
      setEditingExistingHtml(false);
      
      // Save to history (debounced effect)
      saveToHistory(rows, globalStyle);
    } else if (htmlEditMode && htmlContent) {
      // console.log('Using HTML edit mode content:', htmlContent.substring(0, 200) + '...'); // Debug log
      onChange?.(htmlContent);
    }
  }, [rows, globalStyle, htmlEditMode, htmlContent]);

  const addBlock = (type: string, index?: number) => {
    const newBlock: EmailBlock = { id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type, content: { ...blockDefaults[type] } };
    
    // Create a new row with 1 column
    const newRow: EmailRow = {
      id: `row-${Date.now()}`,
      columns: [
        {
          id: `col-${Date.now()}`,
          width: 100,
          block: newBlock
        }
      ]
    };
    
    // Check if there is a footer block to insert before
    const footerIndex = rows.findIndex(r => r.columns.some(c => c.block.type === 'footer'));
    
    let insertIndex = index;
    
    // If no index provided or invalid, default logic
    if (insertIndex === undefined || insertIndex === null) {
       insertIndex = footerIndex !== -1 ? footerIndex : rows.length;
    }

    // Ensure we don't insert after footer
    if (footerIndex !== -1 && insertIndex > footerIndex) {
       insertIndex = footerIndex;
    }

    const newRows = [...rows];
    newRows.splice(insertIndex, 0, newRow);
    setRows(newRows);
    
    setSelectedBlock(newBlock.id);
    setShowTemplates(false);
    setEditingExistingHtml(false);
  };

  const updateBlock = (id: string, content: any) => {
    const updatedRows = rows.map(row => ({
      ...row,
      columns: row.columns.map(col => {
        if (col.block.id === id) {
          return { ...col, block: { ...col.block, content: { ...col.block.content, ...content } } };
        }
        return col;
      })
    }));
    setRows(updatedRows);
    
    // Force immediate HTML generation for image updates
    if (content.url !== undefined) {
      const newHtml = generateHtml(updatedRows, globalStyle);
      onChange?.(newHtml);
    }
  };

  
  const duplicateBlock = (id: string) => {
    // Find the row containing the block
    const rowIndex = rows.findIndex(row => row.columns.some(col => col.block.id === id));
    if (rowIndex === -1) return;
    
    const originalRow = rows[rowIndex];
    // Duplicate the row structure with new IDs
    const newRow: EmailRow = {
      id: `row-${Date.now()}`,
      columns: originalRow.columns.map(col => ({
        id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        width: col.width,
        block: {
          ...col.block,
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          content: { ...col.block.content }
        }
      }))
    };
    
    const newRows = [...rows];
    newRows.splice(rowIndex + 1, 0, newRow);
    setRows(newRows);
  };

  const replaceBlock = (id: string, type: string) => {
    const newRows = rows.map(row => ({
      ...row,
      columns: row.columns.map(col => {
        if (col.block.id === id) {
          return {
            ...col,
            block: {
              ...col.block,
              type,
              content: { ...blockDefaults[type] }
            }
          };
        }
        return col;
      })
    }));
    setRows(newRows);
  };

  const splitColumn = (id: string) => {
    const rowIndex = rows.findIndex(row => row.columns.some(col => col.block.id === id));
    if (rowIndex === -1) return;

    const newRows = [...rows];
    const row = newRows[rowIndex];
    
    // Limit to 4 columns to prevent layout issues
    if (row.columns.length >= 4) return;

    const colIndex = row.columns.findIndex(col => col.block.id === id);
    const originalCol = row.columns[colIndex];
    
    const newCol: EmailColumn = {
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      width: originalCol.width,
      block: {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'empty',
        content: {}
      }
    };
    
    // Insert after current column
    row.columns.splice(colIndex + 1, 0, newCol);
    
    // Redistribute widths
    const count = row.columns.length;
    const width = Math.floor(100 / count);
    row.columns.forEach(c => c.width = width);
    
    setRows(newRows);
  };


  const moveRow = (id: string, direction: "up" | "down") => {
    const rowIndex = rows.findIndex(row => row.columns.some(col => col.block.id === id));
    if (rowIndex === -1) return;
    
    if (direction === "up" && rowIndex > 0) { 
       const newRows = [...rows]; 
       [newRows[rowIndex - 1], newRows[rowIndex]] = [newRows[rowIndex], newRows[rowIndex - 1]]; 
       setRows(newRows); 
    } else if (direction === "down" && rowIndex < rows.length - 1) { 
       // Don't move below footer if next is footer
       if (rows[rowIndex + 1].locked) return;
       
       const newRows = [...rows]; 
       [newRows[rowIndex], newRows[rowIndex + 1]] = [newRows[rowIndex + 1], newRows[rowIndex]]; 
       setRows(newRows); 
    }
  };

  const moveColumnLeft = (rowIndex: number, colIndex: number) => {
    if (colIndex <= 0) return;
    const newRows = [...rows];
    const row = newRows[rowIndex];
    [row.columns[colIndex - 1], row.columns[colIndex]] = [row.columns[colIndex], row.columns[colIndex - 1]];
    setRows(newRows);
  };

  const moveColumnRight = (rowIndex: number, colIndex: number) => {
    const row = rows[rowIndex];
    if (colIndex >= row.columns.length - 1) return;
    const newRows = [...rows];
    const r = newRows[rowIndex];
    [r.columns[colIndex], r.columns[colIndex + 1]] = [r.columns[colIndex + 1], r.columns[colIndex]];
    setRows(newRows);
  };

  const moveColumnToPrevRow = (rowIndex: number, colIndex: number) => {
    if (rowIndex <= 0) return;
    const newRows = [...rows];
    const currentRow = newRows[rowIndex];
    const targetRow = newRows[rowIndex - 1];
    
    const [col] = currentRow.columns.splice(colIndex, 1);
    targetRow.columns.push(col);
    
    // Adjust widths
    targetRow.columns.forEach(c => c.width = Math.floor(100 / targetRow.columns.length));
    
    if (currentRow.columns.length === 0) {
      newRows.splice(rowIndex, 1);
    } else {
       currentRow.columns.forEach(c => c.width = Math.floor(100 / currentRow.columns.length));
    }
    setRows(newRows);
  };

  const moveColumnToNextRow = (rowIndex: number, colIndex: number) => {
    if (rowIndex >= rows.length - 1) return;
    if (rows[rowIndex + 1].locked) return;
    
    const newRows = [...rows];
    const currentRow = newRows[rowIndex];
    const targetRow = newRows[rowIndex + 1];
    
    const [col] = currentRow.columns.splice(colIndex, 1);
    targetRow.columns.push(col);
    
    targetRow.columns.forEach(c => c.width = Math.floor(100 / targetRow.columns.length));
    
    if (currentRow.columns.length === 0) {
      newRows.splice(rowIndex, 1);
    } else {
       currentRow.columns.forEach(c => c.width = Math.floor(100 / currentRow.columns.length));
    }
    setRows(newRows);
  };

  const setColumnWidth = (rowIndex: number, colIndex: number, width: number) => {
    const newRows = [...rows];
    newRows[rowIndex].columns[colIndex].width = width;
    setRows(newRows);
  };

  const loadTemplate = (templateId: string) => {
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    // Handle database templates (they have html_content instead of blocks)
    if (templateId.startsWith('db_')) {
      const dbTemplate = template as any; 
      setHtmlContent(dbTemplate.html_content || '');
      onChange?.(dbTemplate.html_content || '');
      setEditingExistingHtml(true);
      setShowTemplates(false);
      setHtmlEditMode(false);
      return;
    }
    
    // Handle hardcoded templates (they have blocks)
    // Convert old blocks structure to rows
    const hardcodedTemplate = template as any; 
    const newRows: EmailRow[] = hardcodedTemplate.blocks.map((block: any, index: number) => ({
      id: `row-${Date.now()}-${index}`,
      locked: block.type === 'footer',
      columns: [
        {
          id: `col-${Date.now()}-${index}`,
          width: 100,
          block: {
            id: `block-${Date.now()}-${index}`, 
            type: block.type, 
            content: { ...blockDefaults[block.type], ...block.content } 
          }
        }
      ]
    }));
    
    setRows(newRows);
    setShowTemplates(false);
    setEditingExistingHtml(false);
    setHtmlEditMode(false);
  };

  const resetEditor = () => { setRows([]); setShowTemplates(true); setEditingExistingHtml(false); setSelectedBlock(null); };

  const deleteBlock = (id: string) => {
    const newRows = rows.map(row => ({
      ...row,
      columns: row.columns.filter(col => col.block.id !== id)
    })).filter(row => row.columns.length > 0); // Remove empty rows
    
    setRows(newRows);
    if (selectedBlock === id) setSelectedBlock(null);
  };

  const convertToBlocks = () => {
    // Enhanced HTML to blocks conversion with multi-column support
    const htmlToConvert = editingExistingHtml ? (initialHtml || htmlContent || '') : (htmlContent || initialHtml || '');
    
    console.log('🔄 Converting HTML to blocks...');
    
    const newRows: EmailRow[] = [];
    
    if (htmlToConvert.trim()) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlToConvert, 'text/html');
      
      let blockIndex = 0;
      let customFooterData: any = {};
      const baseTimestamp = Date.now();
      
      // Helper to generate unique IDs
      const getUniqueId = () => {
        const id = `${baseTimestamp}-${blockIndex}-${Math.random().toString(36).substr(2, 5)}`;
        blockIndex++;
        return id;
      };

      // 1. Find and remove footer to prevent duplication
      const allDivs = Array.from(doc.querySelectorAll('div'));
      let footerElement: Element | null = null;
      
      for (const el of allDivs) {
        const style = el.getAttribute('style') || '';
        const text = el.textContent || '';
        
        const hasFooterBgColor = style.includes('background:#1f2937') || 
                                  style.includes('background: #1f2937') ||
                                  style.includes('background-color:#1f2937');
        
        const hasFooterContent = text.includes('9RX LLC') || 
                                  text.includes('Phone:') || 
                                  text.toLowerCase().includes('all rights reserved');
        
        const hasMainContent = text.includes('{{first_name}}') || 
                               text.includes('{{order_number}}') || 
                               text.includes('{{cart_items}}');
        
        if (hasFooterBgColor && hasFooterContent && !hasMainContent) {
          if (!footerElement || el.contains(footerElement)) {
            footerElement = el;
          }
        }
      }
      
      if (footerElement) {
        // Extract footer data
        const h3 = footerElement.querySelector('h3');
        const pTags = footerElement.querySelectorAll('p');
        
        if (h3) customFooterData.companyName = h3.textContent?.trim();
        if (pTags.length > 0) customFooterData.address = pTags[0].textContent?.trim();
        
        pTags.forEach(p => {
          const text = p.textContent || '';
          if (text.includes('Phone:')) customFooterData.phone = text.replace('Phone:', '').trim();
          if (text.includes('Email:')) customFooterData.email = text.replace('Email:', '').trim();
          if (text.includes('Website:')) customFooterData.website = text.replace('Website:', '').trim();
        });
        
        footerElement.remove();
      }

      // Helper functions
      const findBackgroundColor = (el: Element | null): string | null => {
        let current = el;
        let steps = 0;
        while (current && steps < 4) {
          const style = current.getAttribute('style') || '';
          const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);
          if (bgMatch && bgMatch[1] && !bgMatch[1].includes('transparent')) {
            return bgMatch[1].trim();
          }
          current = current.parentElement;
          steps++;
        }
        return null;
      };

      const findTextColor = (el: Element | null): string | null => {
        const style = el?.getAttribute('style') || '';
        const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
        return colorMatch ? colorMatch[1].trim() : null;
      };

      // Parse a single element and return a block
      const parseElementToBlock = (el: Element): EmailBlock | null => {
        const style = el.getAttribute('style') || '';
        const text = el.textContent || '';
        
        // Skip footer-like elements
        if ((style.includes('background:#1f2937') || style.includes('background: #1f2937')) && 
            (text.includes('9RX LLC') || text.includes('Phone:'))) {
          return null;
        }

        // Check for Header - look for div with h1/h2 inside or h1-h6 directly
        const headerEl = el.querySelector('h1, h2, h3, h4, h5, h6');
        if (headerEl || el.tagName.match(/^H[1-6]$/)) {
          const actualHeader = headerEl || el;
          // Get background from parent div (the container)
          const bgColor = findBackgroundColor(el) || '#10b981';
          const textColor = findTextColor(actualHeader) || '#ffffff';
          
          return {
            id: `block-${getUniqueId()}`,
            type: 'header',
            content: {
              ...blockDefaults.header,
              text: actualHeader.textContent?.trim() || 'Header',
              bgColor: bgColor,
              textColor: textColor
            }
          };
        }

        // Check for Button (A tag with background)
        const buttonEl = el.tagName === 'A' ? el : el.querySelector('a.email-button, a[style*="background"]');
        if (buttonEl && (buttonEl.getAttribute('style')?.includes('background') || buttonEl.classList.contains('email-button'))) {
          return {
            id: `block-${getUniqueId()}`,
            type: 'button',
            content: {
              ...blockDefaults.button,
              text: buttonEl.textContent?.trim() || 'Button',
              url: buttonEl.getAttribute('href') || '#',
              bgColor: findBackgroundColor(buttonEl) || '#10b981',
              textColor: findTextColor(buttonEl) || '#ffffff'
            }
          };
        }

        // Check for Image
        const imgEl = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (imgEl && imgEl.getAttribute('src')) {
          return {
            id: `block-${getUniqueId()}`,
            type: 'image',
            content: {
              ...blockDefaults.image,
              url: imgEl.getAttribute('src') || '',
              alt: imgEl.getAttribute('alt') || 'Image',
              width: imgEl.getAttribute('width') || '100'
            }
          };
        }

        // Check for Divider
        if (el.tagName === 'HR' || el.querySelector('hr')) {
          return {
            id: `block-${getUniqueId()}`,
            type: 'divider',
            content: { ...blockDefaults.divider }
          };
        }

        // Check for Coupon
        if ((style.includes('border') && style.includes('dashed')) || 
            (text.includes('% OFF') || text.includes('Code:'))) {
          const discount = text.match(/(\d+%?\s*OFF)/i)?.[1] || 'Special Offer';
          const code = text.match(/Code:\s*([A-Z0-9]+)/i)?.[1] || 'SAVE';
          return {
            id: `block-${getUniqueId()}`,
            type: 'coupon',
            content: {
              ...blockDefaults.coupon,
              discount: discount,
              code: code,
              bgColor: findBackgroundColor(el) || '#fef3c7'
            }
          };
        }

        // Check for Text (P tag or div with text content)
        const pEl = el.tagName === 'P' ? el : el.querySelector('p');
        if (pEl || (el.tagName === 'DIV' && !el.querySelector('table, div, a[style*="background"]'))) {
          const textEl = pEl || el;
          const textContent = textEl.textContent?.trim() || '';
          if (textContent && textContent.length > 0) {
            return {
              id: `block-${getUniqueId()}`,
              type: 'text',
              content: {
                ...blockDefaults.text,
                text: textContent,
                color: findTextColor(textEl) || '#374151'
              }
            };
          }
        }

        return null;
      };

      // Find all tables that look like email rows (have TR > TD structure)
      // First try with class, then fallback to all tables
      let emailRowTables = Array.from(doc.querySelectorAll('table.email-row'));
      
      // If no tables with class found, find all tables that have the email row structure
      if (emailRowTables.length === 0) {
        emailRowTables = Array.from(doc.querySelectorAll('table')).filter(table => {
          // Check if this table has TD cells (it's a content table, not a wrapper)
          const hasCells = table.querySelector('td');
          // Skip tables that are inside other tables (nested)
          const isNested = table.parentElement?.closest('table') !== null;
          return hasCells && !isNested;
        });
      }
      
      console.log('📊 Found email row tables:', emailRowTables.length);
      
      if (emailRowTables.length > 0) {
        // Process each table as a row
        emailRowTables.forEach((table, tableIdx) => {
          const cells = Array.from(table.querySelectorAll(':scope > tbody > tr > td, :scope > tr > td'));
          console.log(`  Table ${tableIdx}: ${cells.length} cells`);
          
          const columns: any[] = [];
          
          cells.forEach((cell, cellIdx) => {
            const widthAttr = cell.getAttribute('width');
            const styleWidth = cell.getAttribute('style')?.match(/width:\s*(\d+)/)?.[1];
            const width = widthAttr ? parseInt(widthAttr) : (styleWidth ? parseInt(styleWidth) : Math.floor(100 / cells.length));
            
            // Find the content div inside the cell
            const contentDiv = cell.querySelector('div') || cell;
            console.log(`    Cell ${cellIdx}: width=${width}, tag=${contentDiv.tagName}, content preview:`, contentDiv.textContent?.substring(0, 50));
            
            const block = parseElementToBlock(contentDiv);
            console.log(`    Cell ${cellIdx} block:`, block ? `${block.type} - ${block.content?.text?.substring(0, 30) || 'no text'}` : 'null');
            
            if (block) {
              const colId = getUniqueId();
              columns.push({
                id: `col-${colId}`,
                width: width,
                block: block
              });
            }
          });
          
          console.log(`  Table ${tableIdx} columns created:`, columns.length);
          
          if (columns.length > 0) {
            const rowId = getUniqueId();
            newRows.push({
              id: `row-${rowId}`,
              columns: columns
            });
          }
        });
      } else {
        // Fallback: Process all elements recursively (for non-standard HTML)
        console.log('⚠️ No tables found, using fallback recursive processing');
        const processNode = (node: Node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          
          if (['SCRIPT', 'STYLE', 'META', 'HEAD', 'TITLE'].includes(el.tagName)) return;
          
          const block = parseElementToBlock(el);
          if (block) {
            const rowId = getUniqueId();
            newRows.push({
              id: `row-${rowId}`,
              columns: [{
                id: `col-${rowId}`,
                width: 100,
                block: block
              }]
            });
            return;
          }
          
          // Recurse for containers
          Array.from(el.children).forEach(child => processNode(child));
        };
        
        Array.from(doc.body.children).forEach(child => processNode(child));
      }
      
      console.log('📦 Blocks created:', newRows.length);
      
      // Always add footer at the end
      const footerUniqueId = getUniqueId();
      newRows.push({
        id: `row-${footerUniqueId}`,
        locked: true,
        columns: [{
          id: `col-${footerUniqueId}`,
          width: 100,
          block: {
            id: `block-${footerUniqueId}`,
            type: 'footer',
            content: { ...blockDefaults.footer, ...customFooterData }
          }
        }]
      });
      
      // Fallback if no blocks created
      if (newRows.length <= 1) {
        const textContent = doc.body.textContent?.trim() || '';
        const fallbackText = textContent.length > 0 
          ? textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '')
          : 'Content conversion incomplete. Please check Code view.';
        
        const fallbackId1 = getUniqueId();
        const fallbackId2 = getUniqueId();
        
        newRows.unshift(
          {
            id: `row-${fallbackId1}`,
            columns: [{
              id: `col-${fallbackId1}`,
              width: 100,
              block: {
                id: `block-${fallbackId1}`,
                type: 'header',
                content: { ...blockDefaults.header, text: 'Edit Your Header' }
              }
            }]
          },
          {
            id: `row-${fallbackId2}`,
            columns: [{
              id: `col-${fallbackId2}`,
              width: 100,
              block: {
                id: `block-${fallbackId2}`,
                type: 'text',
                content: { ...blockDefaults.text, text: fallbackText }
              }
            }]
          }
        );
      }
    }
    
    setRows(newRows);
    setEditingExistingHtml(false);
    setShowTemplates(false);
    setHtmlEditMode(false);
  };

  // Helper functions for HTML parsing
  const getComputedBackgroundColor = (element: Element): string | null => {
    const style = element.getAttribute('style') || '';
    const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);
    return bgMatch ? bgMatch[1].trim() : null;
  };

  const getComputedTextColor = (element: Element): string | null => {
    const style = element.getAttribute('style') || '';
    const colorMatch = style.match(/color:\s*([^;]+)/i);
    return colorMatch ? colorMatch[1].trim() : null;
  };

  const isHeaderElement = (element: Element): boolean => {
    const tagName = element.tagName.toLowerCase();
    const style = element.getAttribute('style') || '';
    const fontSize = style.match(/font-size:\s*(\d+)/i);
    
    return tagName.match(/^h[1-6]$/) !== null || 
           (fontSize && parseInt(fontSize[1]) > 20) ||
           style.includes('font-weight: bold') ||
           style.includes('font-weight:bold');
  };
  
  const selectedBlockData = rows.flatMap(r => r.columns).find(c => c.block.id === selectedBlock)?.block;
  
  // Helper variables for context toolbar
  const selectedRowIndex = selectedBlock ? rows.findIndex(r => r.columns.some(c => c.block.id === selectedBlock)) : -1;
  const selectedColIndex = (selectedRowIndex !== -1 && selectedBlock) ? rows[selectedRowIndex].columns.findIndex(c => c.block.id === selectedBlock) : -1;
  const selectedColumnData = (selectedRowIndex !== -1 && selectedColIndex !== -1) ? rows[selectedRowIndex].columns[selectedColIndex] : null;

  const currentHtml = htmlEditMode ? htmlContent : (rows.length > 0 ? generateHtml(rows, globalStyle) : (editingExistingHtml && initialHtml ? initialHtml : generateHtml(rows, globalStyle)));
  const validationHints: Array<{ level: "warning" | "info"; text: string }> = [];
  const readinessIssues: Array<{ severity: "error" | "warning"; text: string }> = [];
  const htmlReadinessIssues = evaluateEmailHtmlReadiness(currentHtml);

  rows.forEach((row, rowIndex) => {
    row.columns.forEach((col, colIndex) => {
      const blockLabel = `Row ${rowIndex + 1}, block ${colIndex + 1}`;
      const blockContent = col.block.content || {};

      switch (col.block.type) {
        case "header":
          if (!String(blockContent.text || "").trim()) readinessIssues.push({ severity: "error", text: `${blockLabel}: header text is required.` });
          break;
        case "text":
          if (!String(blockContent.text || "").trim()) readinessIssues.push({ severity: "error", text: `${blockLabel}: text content is empty.` });
          break;
        case "button":
          if (!String(blockContent.text || "").trim()) readinessIssues.push({ severity: "error", text: `${blockLabel}: button text is required.` });
          if (!String(blockContent.url || "").trim()) readinessIssues.push({ severity: "error", text: `${blockLabel}: button URL is missing.` });
          break;
        case "image":
          if (!String(blockContent.url || "").trim()) readinessIssues.push({ severity: "error", text: `${blockLabel}: image URL is missing.` });
          if (String(blockContent.url || "").trim() && !/^https?:\/\//i.test(String(blockContent.url))) readinessIssues.push({ severity: "warning", text: `${blockLabel}: image URL should start with http:// or https://.` });
          if (!String(blockContent.alt || "").trim()) readinessIssues.push({ severity: "warning", text: `${blockLabel}: add alt text for better accessibility and email compatibility.` });
          break;
        case "product":
          if (!String(blockContent.name || "").trim()) readinessIssues.push({ severity: "error", text: `${blockLabel}: product name is required.` });
          if (!String(blockContent.buttonUrl || "").trim()) readinessIssues.push({ severity: "warning", text: `${blockLabel}: product CTA URL is missing.` });
          break;
        case "coupon":
          if (!String(blockContent.code || "").trim()) readinessIssues.push({ severity: "error", text: `${blockLabel}: coupon code is required.` });
          break;
        case "footer":
          if (!String(blockContent.companyName || "").trim()) readinessIssues.push({ severity: "warning", text: `${blockLabel}: footer company name is missing.` });
          if (blockContent.showUnsubscribe && !currentHtml.includes("{{unsubscribe_url}}")) readinessIssues.push({ severity: "error", text: `${blockLabel}: unsubscribe link placeholder is missing from the footer.` });
          break;
      }
    });
  });

  const readinessSummary = {
    errors: [...readinessIssues, ...htmlReadinessIssues].filter((issue) => issue.severity === "error"),
    warnings: [...readinessIssues, ...htmlReadinessIssues].filter((issue) => issue.severity === "warning"),
  };
  const isSendReady = readinessSummary.errors.length === 0;

  if (/<(script|form|video|iframe)\b/i.test(currentHtml)) {
    validationHints.push({ level: "warning", text: "Some email clients block script, form, video, or iframe content." });
  }
  if (/http:\/\//i.test(currentHtml)) {
    validationHints.push({ level: "warning", text: "Use HTTPS assets where possible to avoid mixed-content or blocked-image issues." });
  }
  if (rows.some((row) => row.columns.some((col) => col.block.type === "footer")) && !currentHtml.includes("{{unsubscribe_url}}")) {
    validationHints.push({ level: "warning", text: "Marketing emails should include an unsubscribe link in the footer." });
  }
  if (rows.length > 8 || rows.some((row) => row.columns.length > 1)) {
    validationHints.push({ level: "info", text: "Preview on mobile before saving because this layout is long or uses multiple columns." });
  }

  if (!isSendReady) {
    validationHints.unshift({ level: "warning", text: `${readinessSummary.errors.length} blocking issue(s) must be fixed before this template is send-ready.` });
  } else if (readinessSummary.warnings.length > 0) {
    validationHints.unshift({ level: "info", text: `${readinessSummary.warnings.length} recommended improvement(s) found before sending.` });
  }

  const insertVariableIntoSelectedBlock = (variableName: string) => {
    const token = `{{${variableName}}}`;

    if (!selectedBlockData) {
      navigator.clipboard.writeText(token);
      toast({ title: "Variable copied", description: `${token} copied because no editable block is selected.` });
      return;
    }

    switch (selectedBlockData.type) {
      case "text":
      case "header":
      case "button": {
        const key = selectedBlockData.type === "button" ? "text" : "text";
        updateBlock(selectedBlockData.id, { [key]: `${selectedBlockData.content[key] || ""}${token}` });
        toast({ title: "Variable inserted", description: `${token} added to the selected ${selectedBlockData.type} block.` });
        return;
      }
      case "image":
        updateBlock(selectedBlockData.id, { alt: `${selectedBlockData.content.alt || ""}${token}` });
        toast({ title: "Variable inserted", description: `${token} added to the image alt text.` });
        return;
      case "footer":
        updateBlock(selectedBlockData.id, { companyName: `${selectedBlockData.content.companyName || ""}${token}` });
        toast({ title: "Variable inserted", description: `${token} added to the footer company field.` });
        return;
      default:
        navigator.clipboard.writeText(token);
        toast({ title: "Variable copied", description: `${token} copied. Select a text-based block to insert it directly.` });
        return;
    }
  };

  const handlePreviewMode = () => {
    if (readinessSummary.errors.length > 0) {
      toast({
        title: "Preview with caution",
        description: `${readinessSummary.errors.length} blocking issue(s) still need attention. Review the readiness strip before sending.`,
      });
    }
    setViewMode("preview");
  };

  const handleSaveTemplate = () => {
    if (!onSave) return;

    if (readinessSummary.errors.length > 0) {
      toast({
        title: "Template not send-ready",
        description: readinessSummary.errors[0].text,
        variant: "destructive",
      });
      return;
    }

    onSave(currentHtml);
    toast({
      title: "Template saved",
      description: readinessSummary.warnings.length > 0
        ? `Saved with ${readinessSummary.warnings.length} recommendation(s) to review.`
        : "This template passed the send-readiness checks.",
    });
  };




  // Template Selection Screen - only for new templates (not editing existing)
  if (showTemplates && rows.length === 0 && !editingExistingHtml) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white mb-4"><Wand2 className="w-8 h-8" /></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Email</h2>
          <p className="text-gray-500">Choose a template to get started or build from scratch</p>
        </div>
        <div className="space-y-6 mb-8">
          {/* Hardcoded Templates */}
          {emailTemplates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Quick Start Templates
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {emailTemplates.map(template => (
                  <button type="button" key={template.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadTemplate(template.id); }} className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-all hover:shadow-lg">
                    <div className={`h-24 bg-gradient-to-br ${template.gradient} flex items-center justify-center`}>
                      <Mail className="w-10 h-10 text-white/80" />
                    </div>
                    <div className="p-3 bg-white"><h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3><p className="text-xs text-gray-500">{template.description}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Database Templates */}
          {templates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-blue-500" />
                Your Saved Templates
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {templates.map(template => (
                  <button type="button" key={`db_${template.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadTemplate(`db_${template.id}`); }} className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-all hover:shadow-lg">
                    <div className="h-24 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center relative">
                      <Mail className="w-10 h-10 text-white/80" />
                      <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="text-xs text-white font-medium">Saved</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white"><h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3><p className="text-xs text-gray-500">Saved template</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="inline-flex items-center gap-4 text-gray-400 text-sm mb-4"><span className="h-px w-16 bg-gray-200" />or<span className="h-px w-16 bg-gray-200" /></div>
          <div><Button type="button" variant="outline" size="lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTemplates(false); }} className="gap-2"><Plus className="w-5 h-5" />Start from Scratch</Button></div>
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
            <Tooltip><TooltipTrigger asChild><Button type="button" variant={viewMode === "edit" ? "secondary" : "ghost"} size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewMode("edit"); }} className="gap-1.5 h-8"><Layout className="w-4 h-4" /><span className="hidden sm:inline">Edit</span></Button></TooltipTrigger><TooltipContent>Edit Mode</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button type="button" variant={viewMode === "preview" ? "secondary" : "ghost"} size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePreviewMode(); }} className="gap-1.5 h-8"><Eye className="w-4 h-4" /><span className="hidden sm:inline">Preview</span></Button></TooltipTrigger><TooltipContent>Preview Mode</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button type="button" variant={viewMode === "code" ? "secondary" : "ghost"} size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewMode("code"); }} className="gap-1.5 h-8"><Code className="w-4 h-4" /><span className="hidden sm:inline">Code</span></Button></TooltipTrigger><TooltipContent>View HTML Code</TooltipContent></Tooltip>
          </TooltipProvider>
          
          {/* Undo/Redo buttons */}
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); undo(); }} 
                  disabled={historyIndex <= 0}
                  className="h-8 px-2"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); redo(); }} 
                  disabled={historyIndex >= history.length - 1}
                  className="h-8 px-2"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          {variables.length > 0 && viewMode === "edit" && (
            <Select onValueChange={(v) => insertVariableIntoSelectedBlock(v)}>
              <SelectTrigger className="w-[170px] h-8 text-xs">
                <SelectValue placeholder={selectedBlockData ? "Insert Variable" : "Copy Variable"} />
              </SelectTrigger>
              <SelectContent>
                {variables.map(v => (
                  <SelectItem key={`insert-${v}`} value={v} className="text-xs">{`{{${v}}}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {false && variables.length > 0 && viewMode === "edit" && (
            <Select onValueChange={(v) => navigator.clipboard.writeText(`{{${v}}}`)}><SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="📋 Variables" /></SelectTrigger><SelectContent>{variables.map(v => (<SelectItem key={v} value={v} className="text-xs">{`{{${v}}}`}</SelectItem>))}</SelectContent></Select>
          )}
          
          {/* Export button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); exportHtml(); }} 
                  className="h-8 gap-1"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download as HTML file</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {onSave && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveTemplate(); }}
                    className="h-8 gap-1"
                    variant={isSendReady ? "default" : "secondary"}
                  >
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSendReady ? "Save send-ready template" : "Fix blocking readiness issues before saving"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Desktop/Mobile Toggle - Only in Edit mode */}
          {viewMode === "edit" && (
            <div className="flex items-center bg-white rounded-lg border p-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant={deviceView === "desktop" ? "secondary" : "ghost"} 
                      size="sm" 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeviceView("desktop"); }} 
                      className="h-7 px-2"
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Desktop View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant={deviceView === "mobile" ? "secondary" : "ghost"} 
                      size="sm" 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeviceView("mobile"); }} 
                      className="h-7 px-2"
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mobile View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          
          {/* A/B Testing button */}
          {onVariantCreate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVariantDialog(true); }} 
                    className="h-8 gap-1"
                  >
                    <FlaskConical className="w-4 h-4" />
                    <span className="hidden sm:inline">A/B Test</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create A/B test variant</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetEditor(); }} className="h-8 text-gray-500 hover:text-red-500"><Undo2 className="w-4 h-4 mr-1" />Reset</Button>
        </div>
      </div>

      {/* A/B Variant Dialog */}
      {showVariantDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowVariantDialog(false)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-500" />
              Create A/B Test Variant
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Create a copy of this email as a variant for A/B testing. You can then modify each variant independently.
            </p>
            <Input
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              placeholder="Variant name (e.g., 'Version B')"
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowVariantDialog(false)}>Cancel</Button>
              <Button type="button" onClick={createVariant} className="bg-purple-600 hover:bg-purple-700">Create Variant</Button>
            </div>
          </div>
        </div>
      )}

      {/* Context Toolbar - Fixed at Top */}
      {selectedColumnData && selectedRowIndex !== -1 && viewMode === "edit" && (
        <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
          <div className="flex min-w-max flex-wrap items-center gap-2 xl:min-w-0">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-2 shadow-sm">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${blockTypes.find(b => b.type === selectedColumnData.block.type)?.color || "bg-slate-400"} text-white shadow-sm`}>
                {(() => {
                  const Icon = blockTypes.find(b => b.type === selectedColumnData.block.type)?.icon || Square;
                  return <Icon className="h-4 w-4" />;
                })()}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-700">
                  {blockTypes.find(b => b.type === selectedColumnData.block.type)?.name || selectedColumnData.block.type}
                </p>
                <p className="text-[10px] text-slate-400">
                  Row {selectedRowIndex + 1} · {deviceView === "mobile" ? "Full width" : `${selectedColumnData.width}% width`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Move</span>
              <TooltipProvider delayDuration={300}>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100" onClick={() => moveColumnToPrevRow(selectedRowIndex, selectedColIndex)}><ArrowUp className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Move Up</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100" onClick={() => moveColumnToNextRow(selectedRowIndex, selectedColIndex)}><ArrowDown className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Move Down</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100" onClick={() => moveColumnLeft(selectedRowIndex, selectedColIndex)}><ArrowLeft className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Move Left</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100" onClick={() => moveColumnRight(selectedRowIndex, selectedColIndex)}><ArrowRight className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Move Right</TooltipContent></Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Width</span>
              {[25, 33, 50, 100].map(w => (
                <Button
                  key={w}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-8 rounded-xl px-2.5 text-[10px] font-semibold transition-all ${
                    selectedColumnData.width === w
                      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => setColumnWidth(selectedRowIndex, selectedColIndex, w)}
                >
                  {w === 33 ? "1/3" : w === 25 ? "1/4" : w === 50 ? "1/2" : "Full"}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Actions</span>
              <TooltipProvider delayDuration={300}>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="sm" variant="ghost" className="h-8 rounded-xl px-3 gap-1.5 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600" onClick={() => splitColumn(selectedColumnData.block.id)}><Columns className="w-3.5 h-3.5" />Split</Button></TooltipTrigger><TooltipContent>Add Column</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="sm" variant="ghost" className="h-8 rounded-xl px-3 gap-1.5 text-[10px] font-semibold text-slate-600 hover:bg-violet-50 hover:text-violet-600" onClick={() => duplicateBlock(selectedColumnData.block.id)}><Copy className="w-3.5 h-3.5" />Clone</Button></TooltipTrigger><TooltipContent>Clone Row</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="sm" variant="ghost" className="h-8 rounded-xl px-3 gap-1.5 text-[10px] font-semibold text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteBlock(selectedColumnData.block.id)}><Trash2 className="w-3.5 h-3.5" />Delete</Button></TooltipTrigger><TooltipContent>Delete Block</TooltipContent></Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}

      {viewMode === "edit" && (validationHints.length > 0 || readinessIssues.length > 0) && (
        <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
              isSendReady
                ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-red-100 text-red-700 ring-1 ring-red-200"
            }`}>
              {isSendReady ? "Send-ready" : `${readinessSummary.errors.length} blocking issue(s)`}
            </div>
            {readinessSummary.warnings.length > 0 && (
              <div className="rounded-full bg-white px-3 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                {readinessSummary.warnings.length} recommendation(s)
              </div>
            )}
            {validationHints.map((hint, index) => (
              <div
                key={`${hint.level}-${index}`}
                className={`rounded-full px-3 py-1 text-[10px] font-medium ${
                  hint.level === "warning"
                    ? "bg-white text-amber-700 ring-1 ring-amber-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {hint.level === "warning" ? "Warning:" : "Tip:"} {hint.text}
              </div>
            ))}
          </div>
          {[...readinessIssues, ...htmlReadinessIssues].length > 0 && (
            <div className="mt-2 grid gap-1">
              {[...readinessIssues, ...htmlReadinessIssues].slice(0, 4).map((issue, index) => (
                <div
                  key={`${issue.severity}-${index}`}
                  className={`rounded-xl px-3 py-2 text-[11px] ${
                    issue.severity === "error"
                      ? "bg-white text-red-700 ring-1 ring-red-200"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {issue.text}
                </div>
              ))}
              {[...readinessIssues, ...htmlReadinessIssues].length > 4 && (
                <div className="text-[10px] text-slate-500">
                  {[...readinessIssues, ...htmlReadinessIssues].length - 4} more issue(s) remain in the current layout.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {viewMode === "code" ? (
        <div className="p-4 bg-gray-900"><pre className="text-green-400 text-sm font-mono overflow-auto max-h-[500px] p-4">{currentHtml}</pre></div>
      ) : viewMode === "preview" ? (
        <div className="min-h-[520px] overflow-auto bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 p-4 sm:p-6">
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Desktop Preview</p>
                  <p className="text-xs text-slate-500">Primary rendering canvas for larger inbox layouts.</p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                  <Monitor className="h-3.5 w-3.5" />
                  600px canvas
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-3 rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-400">
                    Desktop inbox preview
                  </div>
                </div>
                <div className="bg-white p-3 sm:p-4">
                  <iframe
                    srcDoc={currentHtml}
                    className="h-[540px] w-full rounded-xl border border-slate-200 bg-white"
                    title="Email Preview Desktop"
                    style={{ border: "none" }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Mobile Preview</p>
                  <p className="text-xs text-slate-500">Check spacing, button size, and fold visibility on narrow screens.</p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                  <Smartphone className="h-3.5 w-3.5" />
                  375px viewport
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative overflow-hidden rounded-[2.25rem] border-[10px] border-slate-900 bg-white shadow-2xl" style={{ width: "375px", maxWidth: "100%" }}>
                  <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
                  <iframe
                    srcDoc={currentHtml}
                    className="h-[667px] w-full bg-white"
                    title="Email Preview Mobile"
                    style={{ border: "none" }}
                  />
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Preview both canvases before saving if the email has multiple columns, large images, or long CTA text.
              </div>
            </div>
          </div>
        </div>
      ) : htmlEditMode ? (
        <div className="flex min-h-[500px]">
          <div className="flex-1 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Edit HTML Content</h3>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewMode("preview"); }} className="gap-1"><Eye className="w-4 h-4" />Preview</Button>
                <Button type="button" variant="default" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHtmlEditMode(false); setEditingExistingHtml(false); setShowTemplates(true); }} className="gap-1"><LayoutTemplate className="w-4 h-4" />Back to Templates</Button>
              </div>
            </div>
            <Textarea
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                onChange?.(e.target.value);
              }}
              className="w-full h-[400px] font-mono text-sm"
              placeholder="Enter your HTML content here..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Edit your HTML directly. Changes are saved automatically. Use the Preview button to see how it looks.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[720px] flex-col xl:h-[600px] xl:min-h-0 xl:flex-row">
          {/* Left Panel - Blocks (Scrollable) */}
          <div className="max-h-[320px] w-full border-b bg-slate-50/80 flex flex-col xl:max-h-none xl:w-80 xl:border-b-0 xl:border-r">
            <div className="border-b bg-white/90 p-3 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Block Library
                  </h3>
                  <p className="text-[11px] leading-4 text-slate-500">
                    Search, tap to add, or drag blocks into the canvas.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600">
                  {filteredBlockTypes.length} blocks
                </Badge>
              </div>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                  placeholder="Search blocks or saved snippets"
                  className="h-9 rounded-xl border-slate-200 bg-slate-50 pl-9 text-xs focus:bg-white"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {blockCategories.map((category) => {
                  const count = filteredBlockTypes.filter((block) => block.category === category.name).length;
                  if (count === 0) return null;
                  return (
                    <div key={category.name} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                      {category.name} {count}
                    </div>
                  );
                })}
              </div>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-4">
                {blockCategories.map((category) => {
                  const categoryBlocks = filteredBlockTypes.filter((block) => block.category === category.name);
                  if (categoryBlocks.length === 0) return null;
                  return (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{category.name}</h4>
                          <p className="text-[10px] text-slate-400">{category.description}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{categoryBlocks.length}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                        {categoryBlocks.map((block) => (
                          <button
                            key={block.type}
                            type="button"
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('blockType', block.type);
                              e.dataTransfer.effectAllowed = 'copy';
                              setIsDraggingNewBlock(true);
                            }}
                            onDragEnd={() => {
                              setIsDraggingNewBlock(false);
                              setDragOverIndex(null);
                            }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addBlock(block.type); }}
                            className="group rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${block.color} text-white shadow-sm transition-transform group-hover:scale-105`}>
                                <block.icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-700">{block.name}</span>
                                  <Plus className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-blue-500" />
                                </div>
                                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{block.description}</p>
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <GripVertical className="h-3 w-3" />
                                  Drag or tap to add
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {filteredBlockTypes.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center">
                    <p className="text-xs font-medium text-slate-600">No matching blocks</p>
                    <p className="mt-1 text-[10px] text-slate-400">Try a broader search like “button”, “media”, or “commerce”.</p>
                  </div>
                )}

                {savedBlockTemplates.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          <Save className="h-3 w-3" /> Reusable Blocks
                        </h4>
                        <p className="text-[10px] text-slate-400">Saved snippets for faster assembly.</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{filteredSavedBlockTemplates.length}</span>
                    </div>
                    <div className="space-y-2">
                      {filteredSavedBlockTemplates.length > 0 ? filteredSavedBlockTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:border-blue-200 hover:bg-blue-50/60"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              insertSavedBlockTemplate(template);
                            }}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${blockTypes.find(b => b.type === template.type)?.color || 'bg-gray-400'}`}>
                              {(() => {
                                const Icon = blockTypes.find(b => b.type === template.type)?.icon || Square;
                                return <Icon className="h-3.5 w-3.5 text-white" />;
                              })()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-medium text-slate-700">{template.name}</p>
                              <p className="text-[10px] text-slate-400">{blockTypes.find(b => b.type === template.type)?.name || template.type}</p>
                            </div>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteBlockTemplate(template.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[10px] text-slate-400">
                          No saved snippets match the current search.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div>
                    <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      <Settings2 className="h-3 w-3" /> Canvas Style
                    </h4>
                    <p className="text-[10px] text-slate-400">Adjust the email shell before fine-tuning individual blocks.</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <FieldLabel>Background</FieldLabel>
                      <div className="flex gap-2">
                        <input type="color" value={globalStyle.bgColor} onChange={(e) => setGlobalStyle({ ...globalStyle, bgColor: e.target.value })} className="h-9 w-10 rounded-xl border border-slate-200 bg-white" />
                        <Input value={globalStyle.bgColor} onChange={(e) => setGlobalStyle({ ...globalStyle, bgColor: e.target.value })} className="h-9 rounded-xl border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white" />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Content Surface</FieldLabel>
                      <div className="flex gap-2">
                        <input type="color" value={globalStyle.contentBg} onChange={(e) => setGlobalStyle({ ...globalStyle, contentBg: e.target.value })} className="h-9 w-10 rounded-xl border border-slate-200 bg-white" />
                        <Input value={globalStyle.contentBg} onChange={(e) => setGlobalStyle({ ...globalStyle, contentBg: e.target.value })} className="h-9 rounded-xl border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Center - Canvas (Scrollable) */}
          <div className="order-2 flex min-h-[360px] flex-1 items-start justify-center overflow-y-auto bg-gray-100/50 p-4 sm:p-6 xl:order-none xl:p-8" style={{ backgroundColor: globalStyle.bgColor }}>
            <div className={`relative transition-all duration-300 ${deviceView === "mobile" ? "w-full max-w-[375px]" : "w-full max-w-[500px]"}`}>
              <div 
                className={`bg-white shadow-xl transition-all h-fit min-h-[400px] ${deviceView === "mobile" ? "border-4 border-gray-800 rounded-[2rem]" : ""}`}
                style={{ backgroundColor: globalStyle.contentBg, borderRadius: deviceView === "mobile" ? "2rem" : `${globalStyle.borderRadius}px` }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isDraggingNewBlock) return;

                  const rowElements = document.querySelectorAll('[data-row-index]');
                  let closestIndex = rows.length;
                  let minDistance = Infinity;

                  if (rowElements.length > 0) {
                      rowElements.forEach((el) => {
                        const rect = el.getBoundingClientRect();
                        const centerY = rect.top + rect.height / 2;
                        const distance = Math.abs(e.clientY - centerY);
                        
                        if (distance < minDistance) {
                           minDistance = distance;
                           closestIndex = parseInt(el.getAttribute('data-row-index') || '0');
                        }
                      });
                  } else {
                      closestIndex = 0;
                  }

                  // Prevent dropping below footer
                  const footerIndex = rows.findIndex(r => r.locked);
                  if (footerIndex !== -1 && closestIndex > footerIndex) {
                      closestIndex = footerIndex;
                  }
                  
                  if (closestIndex !== dragOverIndex) {
                    setDragOverIndex(closestIndex);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const type = e.dataTransfer.getData('blockType');
                  if (type) {
                     addBlock(type, dragOverIndex ?? undefined);
                     setDragOverIndex(null);
                     setIsDraggingNewBlock(false);
                  }
                }}
              >
                {rows.length === 0 ? (
                  editingExistingHtml ? (
                    <div className="editor-float-in p-8 text-center">
                      <div className="editor-pulse-ring mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100"><Code className="h-8 w-8 text-blue-500" /></div>
                      <p className="mb-2 text-gray-700 font-medium">Saved Template Loaded</p>
                      <p className="mb-4 text-sm text-gray-500">This template contains HTML content. Choose whether you want a quick preview, direct HTML editing, or block conversion.</p>
                      <div className="mb-4 flex flex-wrap justify-center gap-2">
                        <Button type="button" variant="default" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewMode("preview"); }} className="gap-1"><Eye className="w-4 h-4" />Preview</Button>
                        <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHtmlEditMode(true); setViewMode("edit"); }} className="gap-1"><Code className="w-4 h-4" />Edit HTML</Button>
                        <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); convertToBlocks(); }} className="gap-1"><Wand2 className="w-4 h-4" />Convert to Blocks</Button>
                      </div>
                      <div className="mt-4 border-t pt-4">
                        <p className="mb-2 text-xs text-gray-400">Use block conversion if you want drag-and-drop editing on mobile and desktop.</p>
                        <Button type="button" variant="link" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingExistingHtml(false); setShowTemplates(true); }} className="text-blue-600 text-sm"><LayoutTemplate className="w-4 h-4 mr-1" />Choose Different Template</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="editor-float-in p-10 text-center sm:p-16">
                      <div className="editor-pulse-ring mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100"><Plus className="h-8 w-8 text-gray-400" /></div>
                      <p className="text-gray-600 font-medium">Start with a block or a template</p>
                      <p className="mt-1 text-sm text-gray-400">Tap a block from the library, drag it into the canvas, or load a ready-made template.</p>
                      <div className="mx-auto mt-4 grid max-w-md gap-2 text-left sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 shadow-sm">
                          <span className="font-semibold text-slate-700">1.</span> Choose a starter block
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 shadow-sm">
                          <span className="font-semibold text-slate-700">2.</span> Click the canvas to edit
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 shadow-sm">
                          <span className="font-semibold text-slate-700">3.</span> Preview desktop and mobile
                        </div>
                      </div>
                      <Button type="button" variant="link" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTemplates(true); }} className="mt-3 text-blue-600"><LayoutTemplate className="w-4 h-4 mr-1" />Browse Templates</Button>
                    </div>
                  )
                ) : (
                  <div className="relative">
                    <div className="editor-float-in sticky top-2 z-10 mx-3 mb-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-[11px] text-slate-500 shadow-sm backdrop-blur">
                      Tip: hover a row to reorganize it, click a block to edit it, and use preview before saving multi-column emails.
                    </div>
                    {isDraggingNewBlock && dragOverIndex !== null && (
                      <div
                        className="pointer-events-none absolute left-3 right-3 z-20"
                        style={{ top: `${Math.max(dragOverIndex, 0) * 12}px` }}
                      >
                        <div className="editor-float-in flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/95 px-3 py-2 text-[11px] font-medium text-blue-600 shadow-sm backdrop-blur">
                          <Plus className="h-3.5 w-3.5" />
                          Drop block here
                        </div>
                      </div>
                    )}
                    {rows.map((row, index) => {
                      const isRowSelected = row.columns.some(c => c.block.id === selectedBlock);
                      return (
                      <div key={row.id} className={`relative group/row mb-2 transition-all ${isRowSelected ? 'z-50' : 'z-0'}`} data-row-index={index}>
                        {/* Row Hover Outline */}
                        <div className={`absolute inset-0 pointer-events-none rounded-2xl border transition-all ${
                          isRowSelected
                            ? "border-blue-300 bg-blue-50/30 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]"
                            : "border-transparent group-hover/row:border-dashed group-hover/row:border-slate-300 group-hover/row:bg-slate-50/40"
                        }`} />
                        
                        {/* Row Controls (Left Side) */}
                        {!row.locked && (
                            <div className={`absolute -left-12 top-2 flex flex-col gap-1.5 transition-all z-20 ${
                              isRowSelected ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 group-hover/row:opacity-100 group-hover/row:translate-x-0"
                            }`}>
                               <div className="flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 shadow-sm backdrop-blur">
                                  <GripVertical className="h-3 w-3 text-slate-400" />
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Row {index + 1}</span>
                               </div>
                               <TooltipProvider>
                                  <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-slate-200 bg-white/95 shadow-sm hover:bg-slate-50 text-slate-600" onClick={() => moveRow(row.columns[0].block.id, "up")}><ArrowUp className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="left">Move Row Up</TooltipContent></Tooltip>
                                  <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-slate-200 bg-white/95 shadow-sm hover:bg-slate-50 text-slate-600" onClick={() => moveRow(row.columns[0].block.id, "down")}><ArrowDown className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="left">Move Row Down</TooltipContent></Tooltip>
                               </TooltipProvider>
                            </div>
                        )}

                        <div className={`flex w-full items-start ${deviceView === "mobile" ? "flex-col" : ""}`} style={{ gap: '0' }}>
                            {row.columns.map((col, colIndex) => {
                               const isSelected = selectedBlock === col.block.id;
                               const blockMeta = blockTypes.find(b => b.type === col.block.type);
                               
                               return (
                               <div key={col.id} style={{ width: deviceView === "mobile" ? "100%" : `${col.width}%` }} className={`relative group/col transition-all p-1.5 ${isSelected ? 'z-10' : 'z-0'}`}>
                                  {/* Hover Outline for Column */}
                                  {!row.locked && !isSelected && (
                                     <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover/col:border-blue-300 group-hover/col:bg-blue-50/30 pointer-events-none transition-all" />
                                  )}

                                  <div className={`absolute left-3 right-3 top-3 z-10 flex items-center justify-between transition-all ${
                                    isSelected ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 group-hover/col:opacity-100 group-hover/col:translate-y-0"
                                  }`}>
                                    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur">
                                      <div className={`flex h-5 w-5 items-center justify-center rounded-full ${blockMeta?.color || "bg-slate-400"} text-white`}>
                                        {(() => {
                                          const Icon = blockMeta?.icon || Square;
                                          return <Icon className="h-2.5 w-2.5" />;
                                        })()}
                                      </div>
                                      <span className="text-[10px] font-medium text-slate-600">{blockMeta?.name || col.block.type}</span>
                                      <span className="text-[10px] text-slate-400">{deviceView === "mobile" ? "Full" : `${col.width}%`}</span>
                                    </div>
                                    {!row.locked && (
                                      <div className="rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-400 shadow-sm backdrop-blur">
                                        Tap to edit
                                      </div>
                                    )}
                                  </div>

                                  {/* Block Content */}
                                  <div 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedBlock(col.block.id); }} 
                                    className={`cursor-pointer overflow-hidden rounded-2xl transition-all ${
                                      isSelected
                                        ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100 shadow-[0_12px_30px_rgba(59,130,246,0.18)]"
                                        : "hover:shadow-md"
                                    }`}
                                  >
                                      <BlockPreview block={col.block} onReplace={(type) => replaceBlock(col.block.id, type)} />
                                  </div>
                               </div>
                               );
                            })}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Editor (Scrollable) */}
          <div className="order-3 min-h-[220px] w-full border-t bg-white flex flex-col xl:order-none xl:min-h-0 xl:w-64 xl:border-l xl:border-t-0">
            {selectedBlockData ? (
              <>
                <div className="p-2.5 border-b bg-gradient-to-r from-white to-gray-50 flex items-center justify-between flex-shrink-0">
                  <h3 className="font-semibold text-xs text-gray-600 flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded ${blockTypes.find(b => b.type === selectedBlockData.type)?.color || 'bg-gray-400'} flex items-center justify-center`}>
                      {(() => {
                        const Icon = blockTypes.find(b => b.type === selectedBlockData.type)?.icon || Square;
                        return <Icon className="w-3 h-3 text-white" />;
                      })()}
                    </div>
                    Edit {blockTypes.find(b => b.type === selectedBlockData.type)?.name}
                  </h3>
                  <div className="flex items-center gap-0.5">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50" 
                            onClick={() => setShowSaveBlockDialog(true)}
                          >
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save as Template</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600" onClick={() => setSelectedBlock(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                
                {/* Save Block Template Dialog */}
                {showSaveBlockDialog && (
                  <div className="p-2.5 border-b bg-blue-50/50">
                    <Label className="text-[10px] text-gray-500 mb-1.5 block">Save as reusable template</Label>
                    <Input
                      value={blockTemplateNameInput}
                      onChange={(e) => setBlockTemplateNameInput(e.target.value)}
                      placeholder="Template name..."
                      className="mb-2 h-7 text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Button 
                        type="button" 
                        size="sm" 
                        className="flex-1 h-6 text-[10px] bg-blue-500 hover:bg-blue-600"
                        onClick={() => saveBlockAsTemplate(selectedBlockData)}
                      >
                        Save
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-6 text-[10px]"
                        onClick={() => { setShowSaveBlockDialog(false); setBlockTemplateNameInput(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                <ScrollArea className="flex-1 bg-slate-50/70 p-3">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Inspector
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        Adjust content, layout, and style for the selected block.
                      </p>
                    </div>
                    <BlockEditor 
                      block={selectedBlockData} 
                      onUpdate={(content) => updateBlock(selectedBlockData.id, content)} 
                      variables={variables}
                      onImageUpload={uploadImageToSupabase}
                      uploadingImage={uploadingImage}
                    />
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-gray-50/50 p-4 text-center">
                <div className="editor-float-in max-w-[220px]">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
                    <MousePointerClick className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs font-medium text-gray-600">Select a block to edit</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">The inspector will show content, layout, and styling options here.</p>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-[10px] text-slate-500 shadow-sm">
                    Quick start: add a block, click it in the canvas, then use the toolbar for width and layout controls.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BlockPreview({ block, onReplace }: { block: EmailBlock, onReplace?: (type: string) => void }) {
  const { type, content } = block;
  switch (type) {
    case "empty": return (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-2 flex flex-col items-center justify-center gap-2 min-h-[100px] hover:border-blue-400 transition-colors bg-gray-50/50 group/empty">
            <span className="text-[10px] text-gray-400 font-medium group-hover/empty:text-blue-500">Add Content</span>
            <div className="flex flex-wrap justify-center gap-1.5 w-full px-2">
               {[
                 { id: 'text', label: 'Text', icon: Type },
                 { id: 'image', label: 'Image', icon: ImageIcon },
                 { id: 'button', label: 'Button', icon: MousePointerClick },
                 { id: 'header', label: 'Header', icon: Type },
                 { id: 'product', label: 'Product', icon: Package },
                 { id: 'spacer', label: 'Spacer', icon: Square }
               ].map(t => (
                  <button key={t.id} type="button" onClick={(e) => { e.stopPropagation(); onReplace?.(t.id); }} className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 text-gray-500 hover:text-blue-600 shadow-sm transition-all hover:-translate-y-0.5" title={`Add ${t.label}`}>
                      <t.icon className="w-4 h-4 mb-1" />
                      <span className="text-[8px] font-medium">{t.label}</span>
                  </button>
               ))}
            </div>
        </div>
    );
    case "header": return <div className="block-preview-smooth" style={{ background: content.bgColor || "#10b981", padding: `${content.padding || 30}px`, textAlign: "center" }}><h1 style={{ color: content.textColor || "#ffffff", margin: 0, fontSize: `${content.fontSize || 28}px`, fontWeight: "bold" }}>{content.text || "Header"}</h1></div>;
    case "text": return <div className="block-preview-smooth" style={{ padding: "20px 30px" }}><p style={{ color: content.color || "#374151", fontSize: `${content.fontSize || 16}px`, textAlign: (content.align || "left") as any, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{content.text || "Text content"}</p></div>;
    case "button": const btnPadding = content.size === "large" ? "16px 36px" : content.size === "small" ? "10px 20px" : "14px 28px"; return <div className="block-preview-smooth" style={{ textAlign: (content.align || "center") as any, padding: "20px 30px" }}><span style={{ background: content.bgColor || "#10b981", color: content.textColor || "#ffffff", padding: btnPadding, borderRadius: `${content.radius || 8}px`, fontWeight: "600", display: "inline-block", fontSize: content.size === "large" ? "18px" : "16px" }}>{content.text || "Button"}</span></div>;
    case "image": return <div className="block-preview-smooth" style={{ textAlign: (content.align || "center") as any, padding: "20px 30px" }}>
      {content.url && content.url.trim() ? (
        <img 
          src={content.url} 
          alt={content.alt || "Image"} 
          style={{ 
            maxWidth: `${content.width || 100}%`, 
            height: "auto", 
            borderRadius: "8px",
            display: "block",
            margin: content.align === "center" ? "0 auto" : content.align === "right" ? "0 0 0 auto" : "0 auto 0 0"
          }} 
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
          onLoad={(e) => {
            (e.target as HTMLImageElement).nextElementSibling?.classList.add('hidden');
          }}
        />
      ) : null}
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 p-10 rounded-xl text-center border-2 border-dashed border-gray-300 ${content.url && content.url.trim() ? 'hidden' : ''}`}>
        <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-500 text-sm">Add image URL</p>
        <p className="text-gray-400 text-xs mt-1">Paste a valid image URL</p>
      </div>
    </div>;
    case "divider": return <div className="block-preview-smooth" style={{ padding: "15px 30px" }}><hr style={{ border: "none", borderTop: `${content.thickness || 1}px ${content.style || "solid"} ${content.color || "#e5e7eb"}`, margin: 0 }} /></div>;
    case "spacer": return <div className="block-preview-smooth bg-gradient-to-r from-transparent via-gray-100 to-transparent opacity-50 flex items-center justify-center" style={{ height: `${content.height || 30}px` }}><span className="text-[10px] text-gray-400 bg-white px-2 rounded">{content.height}px</span></div>;
    case "product": return <div className="block-preview-smooth" style={{ background: "#f8fafc", borderRadius: "16px", padding: "24px", margin: "20px 30px", textAlign: "center" }}>{content.imageUrl ? <img src={content.imageUrl} alt={content.name} style={{ maxWidth: "160px", height: "auto", borderRadius: "12px", marginBottom: "16px" }} /> : <div className="bg-gradient-to-br from-gray-200 to-gray-300 w-32 h-32 mx-auto rounded-xl flex items-center justify-center mb-4"><Package className="w-10 h-10 text-gray-400" /></div>}<h3 style={{ margin: "0 0 8px 0", color: "#1f2937", fontSize: "18px", fontWeight: "600" }}>{content.name || "Product"}</h3><p style={{ color: "#10b981", fontSize: "24px", fontWeight: "bold", margin: "8px 0 16px" }}>{content.price || "$0.00"}</p><span style={{ background: "#10b981", color: "white", padding: "12px 24px", borderRadius: "10px", display: "inline-block", fontWeight: "600" }}>{content.buttonText || "View"}</span></div>;
    case "cart_items": return (
      <div className="block-preview-smooth" style={{ padding: "20px 30px" }}>
        <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", color: "#1f2937", fontSize: "18px", fontWeight: "600", textAlign: "center" }}>🛒 Your Cart Items</h3>
          {/* Sample cart items preview */}
          <div style={{ borderBottom: "1px solid #e5e7eb", padding: "12px 0", display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="bg-gradient-to-br from-gray-200 to-gray-300 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontWeight: "600", color: "#1f2937" }}>Sample Product 1</p>
              <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Qty: 2 × $49.99</p>
            </div>
            <p style={{ margin: 0, fontWeight: "bold", color: "#10b981" }}>$99.98</p>
          </div>
          <div style={{ borderBottom: "1px solid #e5e7eb", padding: "12px 0", display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="bg-gradient-to-br from-gray-200 to-gray-300 w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontWeight: "600", color: "#1f2937" }}>Sample Product 2</p>
              <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Qty: 1 × $29.99</p>
            </div>
            <p style={{ margin: 0, fontWeight: "bold", color: "#10b981" }}>$29.99</p>
          </div>
          <div style={{ borderTop: "2px solid #e5e7eb", marginTop: "16px", paddingTop: "16px", textAlign: "right" }}>
            <p style={{ margin: 0, color: "#1f2937", fontSize: "18px", fontWeight: "bold" }}>Total: $129.97</p>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: "11px", color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>
            ⚡ Cart items auto-populate from {"{{cart_items}}"} variable
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <span style={{ background: "#10b981", color: "white", padding: "16px 36px", borderRadius: "10px", display: "inline-block", fontWeight: "600", fontSize: "16px" }}>{content.buttonText || "Complete Your Order"}</span>
        </div>
      </div>
    );
    case "coupon": return <div className="block-preview-smooth" style={{ background: `linear-gradient(135deg, ${content.bgColor || "#fef3c7"}, #fff7ed)`, border: `3px dashed ${content.borderColor || "#f59e0b"}`, borderRadius: "16px", padding: "24px", margin: "20px 30px", textAlign: "center" }}><p style={{ color: "#92400e", fontSize: "28px", fontWeight: "bold", margin: "0 0 12px" }}>{content.discount || "10% OFF"}</p><div style={{ background: "white", padding: "14px 28px", borderRadius: "10px", fontFamily: "monospace", fontSize: "24px", margin: "12px auto", display: "inline-block", border: `2px solid ${content.borderColor || "#f59e0b"}`, letterSpacing: "3px", fontWeight: "bold" }}>{content.code || "CODE"}</div><p style={{ color: "#78350f", margin: "12px 0 0", fontSize: "14px" }}>{content.description || ""}</p></div>;
    case "footer": return <div className="block-preview-smooth" style={{ background: content.bgColor || "#1f2937", padding: "40px 30px 30px", textAlign: "center", color: content.textColor || "#9ca3af", fontSize: "14px", lineHeight: 1.6 }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ color: content.linkColor || "#10b981", fontSize: "18px", fontWeight: "bold", margin: "0 0 10px" }}>{content.companyName || "9RX LLC"}</h3>
        <p style={{ margin: "0 0 8px" }}>{content.address || "936 Broad River Ln, Charlotte, NC 28211"}</p>
        <p style={{ margin: "0 0 8px" }}>Phone: {content.phone || "+1 (800) 940-9619"}</p>
        <p style={{ margin: "0 0 8px" }}>Email: {content.email || "info@9rx.com"}</p>
        <p style={{ margin: "0" }}>Website: {content.website || "www.9rx.com"}</p>
      </div>
      <div style={{ borderTop: "1px solid #374151", paddingTop: "20px", marginTop: "20px", fontSize: "12px" }}>
        <p style={{ margin: "0 0 8px" }}>© {new Date().getFullYear()} {content.companyName || "9RX LLC"}. All rights reserved.</p>
        {content.showUnsubscribe && <p style={{ margin: "0" }}>Unsubscribe | Privacy Policy</p>}
      </div>
    </div>;
    default: return <div className="p-4 text-gray-400">Unknown block</div>;
  }
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
    {children}
  </Label>
);

const InspectorSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-800">{title}</p>
      {description ? <p className="text-[11px] leading-4 text-slate-500">{description}</p> : null}
    </div>
    {children}
  </div>
);

const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="relative group">
        <input 
          type="color" 
          value={value} 
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.value);
          }} 
          onClick={(e) => e.stopPropagation()}
          onInput={(e) => {
            e.stopPropagation();
            onChange((e.target as HTMLInputElement).value);
          }}
          className="w-9 h-8 rounded-md cursor-pointer border-2 border-gray-200 hover:border-blue-400 transition-colors" 
          style={{ backgroundColor: value }}
        />
        <div className="absolute inset-0 rounded-md ring-2 ring-white pointer-events-none" />
      </div>
      <Input 
        value={value} 
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value);
        }} 
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.target.select()}
        className="flex-1 h-8 rounded-lg border-slate-200 bg-slate-50 text-[10px] font-mono focus:bg-white" 
        placeholder="#000000"
      />
    </div>
  </div>
);

const AlignPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div>
    <FieldLabel>Alignment</FieldLabel>
    <div className="flex gap-0.5 rounded-xl bg-slate-100 p-0.5" onClick={(e) => e.stopPropagation()}>
      {[{ v: "left", i: AlignLeft }, { v: "center", i: AlignCenter }, { v: "right", i: AlignRight }].map(({ v, i: Icon }) => (
        <Button 
          key={v} 
          type="button" 
          variant="ghost"
          size="sm" 
          className={`flex-1 h-7 rounded-md transition-all ${
            value === v 
              ? 'bg-white shadow-sm text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            onChange(v); 
          }}
        >
          <Icon className="w-3.5 h-3.5" />
        </Button>
      ))}
    </div>
  </div>
);

const SliderField = ({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) => {
  const [localValue, setLocalValue] = useState([value]);
  const isInteracting = useRef(false);
  
  // Sync when external value changes
  useEffect(() => {
    if (!isInteracting.current) {
      setLocalValue([value]);
    }
  }, [value]);

  const handleSliderChange = (newValues: number[]) => {
    const newValue = newValues[0];
    // console.log('🎚️ Slider changed:', label, 'from', localValue[0], 'to', newValue);
    setLocalValue([newValue]);
    onChange(Math.round(newValue));
  };

  const handleNumericInput = (inputValue: string) => {
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      const roundedValue = Math.round(numValue);
      // console.log('🔢 Input changed:', label, 'to', roundedValue);
      setLocalValue([roundedValue]);
      onChange(roundedValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = Math.min(max, localValue[0] + (e.shiftKey ? 10 : 1));
      setLocalValue([newValue]);
      onChange(Math.round(newValue));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = Math.max(min, localValue[0] - (e.shiftKey ? 10 : 1));
      setLocalValue([newValue]);
      onChange(Math.round(newValue));
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <FieldLabel>{label}</FieldLabel>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={Math.round(localValue[0])}
            onChange={(e) => handleNumericInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => {
              isInteracting.current = true;
              e.target.select();
            }}
            onBlur={() => {
              isInteracting.current = false;
            }}
            className="h-7 w-16 rounded-lg border-0 bg-slate-50 text-center text-xs font-mono transition-all duration-200 hover:bg-white focus:bg-white"
            min={min}
            max={max}
            title="Use ↑↓ arrows (Shift+↑↓ for +10)"
          />
          <span className="text-xs text-gray-400">px</span>
        </div>
      </div>
      <div className="slider-container" onClick={(e) => e.stopPropagation()}>
        <Slider 
          value={localValue}
          onValueChange={handleSliderChange}
          onValueCommit={() => { isInteracting.current = false; }}
          onPointerDown={() => { isInteracting.current = true; }}
          min={min}
          max={max}
          step={1}
          className="w-full"
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min}px</span>
        <span>{max}px</span>
      </div>
    </div>
  );
};

function BlockEditor({ block, onUpdate, variables, onImageUpload, uploadingImage }: { 
  block: EmailBlock; 
  onUpdate: (content: any) => void; 
  variables: string[];
  onImageUpload?: (file: File) => Promise<string | null>;
  uploadingImage?: boolean;
}) {
  const { type, content } = block;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rich text formatting helper
  const applyTextFormat = (format: 'bold' | 'italic' | 'link') => {
    const textarea = document.querySelector(`textarea[data-block-id="${block.id}"]`) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.text?.substring(start, end) || '';
    
    if (!selectedText) return;
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'link':
        const url = prompt('Enter URL:', 'https://');
        if (url) {
          formattedText = `[${selectedText}](${url})`;
        } else {
          return;
        }
        break;
    }
    
    const newText = content.text?.substring(0, start) + formattedText + content.text?.substring(end);
    onUpdate({ text: newText });
  };

  const insertVariableAtCursor = (variableName: string) => {
    const token = `{{${variableName}}}`;
    const textarea = document.querySelector(`textarea[data-block-id="${block.id}"]`) as HTMLTextAreaElement;

    if (!textarea) {
      onUpdate({ text: `${content.text || ""}${token}` });
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const currentValue = content.text || "";
    const newText = currentValue.substring(0, start) + token + currentValue.substring(end);
    onUpdate({ text: newText });

    requestAnimationFrame(() => {
      textarea.focus();
      const nextPosition = start + token.length;
      textarea.setSelectionRange(nextPosition, nextPosition);
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {(() => {
        switch (type) {
    case "header": return (
      <InspectorSection title="Header Content" description="Set the main headline and visual emphasis.">
        <div>
          <FieldLabel>Heading Text</FieldLabel>
          <Input value={content.text} onChange={(e) => { e.stopPropagation(); onUpdate({ text: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" placeholder="Enter heading..." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ColorPicker label="Background" value={content.bgColor || "#10b981"} onChange={(v) => onUpdate({ bgColor: v })} />
          <ColorPicker label="Text Color" value={content.textColor || "#ffffff"} onChange={(v) => onUpdate({ textColor: v })} />
        </div>
        <SliderField label="Font Size" value={parseInt(content.fontSize || "28")} onChange={(v) => onUpdate({ fontSize: v.toString() })} min={18} max={48} />
        <SliderField label="Padding" value={parseInt(content.padding || "30")} onChange={(v) => onUpdate({ padding: v.toString() })} min={10} max={60} />
      </InspectorSection>
    );
    case "text": return (
      <InspectorSection title="Text Content" description="Write body copy, apply formatting, and insert template variables.">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <FieldLabel>Text Content</FieldLabel>
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 hover:bg-white"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyTextFormat('bold'); }}
                    >
                      <Bold className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bold</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 hover:bg-white"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyTextFormat('italic'); }}
                    >
                      <Italic className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Italic</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 hover:bg-white"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyTextFormat('link'); }}
                    >
                      <Link className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add Link</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <Textarea 
            data-block-id={block.id}
            value={content.text} 
            onChange={(e) => { e.stopPropagation(); onUpdate({ text: e.target.value }); }} 
            onClick={(e) => e.stopPropagation()} 
            rows={4} 
            className="min-h-[120px] rounded-xl border-slate-200 text-xs" 
            placeholder="Enter your text..." 
          />
          <p className="mt-1 text-[10px] text-slate-400">
            Select text, then use the controls above for formatting.
          </p>
          {variables.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
                Variable tip: click a variable to insert it at the text cursor, not just at the end.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variables.map(v => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="h-6 cursor-pointer rounded-full px-2.5 text-[10px] transition-colors hover:bg-blue-100 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      insertVariableAtCursor(v);
                    }}
                  >
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <ColorPicker label="Text Color" value={content.color || "#374151"} onChange={(v) => onUpdate({ color: v })} />
        <AlignPicker value={content.align || "left"} onChange={(v) => onUpdate({ align: v })} />
        <SliderField label="Font Size" value={parseInt(content.fontSize || "16")} onChange={(v) => onUpdate({ fontSize: v.toString() })} min={12} max={24} />
      </InspectorSection>
    );
    case "button": return (
      <InspectorSection title="Button Settings" description="Configure the primary CTA text, link destination, and style.">
        <div>
          <FieldLabel>Button Text</FieldLabel>
          <Input value={content.text} onChange={(e) => { e.stopPropagation(); onUpdate({ text: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" />
        </div>
        <div>
          <FieldLabel>Link URL</FieldLabel>
          <Input value={content.url} onChange={(e) => { e.stopPropagation(); onUpdate({ url: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" placeholder="https://..." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ColorPicker label="Background" value={content.bgColor || "#10b981"} onChange={(v) => onUpdate({ bgColor: v })} />
          <ColorPicker label="Text Color" value={content.textColor || "#ffffff"} onChange={(v) => onUpdate({ textColor: v })} />
        </div>
        <AlignPicker value={content.align || "center"} onChange={(v) => onUpdate({ align: v })} />
        <div onClick={(e) => e.stopPropagation()}>
          <FieldLabel>Size</FieldLabel>
          <Select value={content.size || "medium"} onValueChange={(v) => onUpdate({ size: v })}>
            <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SliderField label="Border Radius" value={parseInt(content.radius || "8")} onChange={(v) => onUpdate({ radius: v.toString() })} min={0} max={30} />
      </InspectorSection>
    );
    case "image": return (
      <InspectorSection title="Image Settings" description="Upload imagery, confirm previews, and adjust layout safely for email clients.">
        <div>
          <FieldLabel>Image</FieldLabel>
          
          {/* Image Upload Section */}
          {onImageUpload && (
            <div className="mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await onImageUpload(file);
                    if (url) {
                      onUpdate({ url });
                    }
                  }
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full gap-1.5 rounded-xl border-slate-200 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <>
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3 text-blue-500" />
                    Upload Image
                  </>
                )}
              </Button>
              <p className="text-[10px] text-gray-400 mt-1 text-center">Max 5MB</p>
            </div>
          )}
          
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] text-gray-400">or paste URL</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          
          <Input 
            value={content.url || ""} 
            onChange={(e) => { 
              e.stopPropagation(); 
              const newUrl = e.target.value;
              onUpdate({ url: newUrl }); 
            }} 
            onClick={(e) => e.stopPropagation()} 
            onBlur={(e) => {
              const newUrl = e.target.value;
              onUpdate({ url: newUrl });
            }}
            className="h-9 rounded-xl border-slate-200 text-xs" 
            placeholder="https://example.com/image.jpg"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-6 rounded-full px-2 text-[10px]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const sampleUrl = "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop";
                onUpdate({ url: sampleUrl });
              }}
            >
              Sample 1
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-6 rounded-full px-2 text-[10px]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const sampleUrl = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop";
                onUpdate({ url: sampleUrl });
              }}
            >
              Sample 2
            </Button>
          </div>
          {content.url && content.url.trim() && (
            <div className="mt-2 rounded-xl bg-slate-50 p-2">
              <img 
                src={content.url} 
                alt="Preview" 
                className="max-w-full h-16 object-contain rounded border mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                  if (sibling) sibling.textContent = '❌ Invalid';
                }}
                onLoad={(e) => {
                  const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                  if (sibling) sibling.textContent = '✅ Loaded';
                }}
              />
              <p className="text-[10px] text-blue-500 mt-1 text-center">✅ Loaded</p>
            </div>
          )}
        </div>
        <div>
          <FieldLabel>Alt Text</FieldLabel>
          <Input 
            value={content.alt || ""} 
            onChange={(e) => { 
              e.stopPropagation(); 
              onUpdate({ alt: e.target.value }); 
            }} 
            onClick={(e) => e.stopPropagation()} 
            className="h-9 rounded-xl border-slate-200 text-xs" 
            placeholder="Describe the image"
          />
        </div>
        <AlignPicker value={content.align || "center"} onChange={(v) => onUpdate({ align: v })} />
        <SliderField label="Width" value={parseInt(content.width || "100")} onChange={(v) => onUpdate({ width: v.toString() })} min={20} max={100} />
      </InspectorSection>
    );
    case "divider": return (
      <div className="space-y-3">
        <ColorPicker label="Color" value={content.color || "#e5e7eb"} onChange={(v) => onUpdate({ color: v })} />
        <div onClick={(e) => e.stopPropagation()}>
          <Label className="text-[11px] font-medium text-gray-500 mb-1 block">Style</Label>
          <Select value={content.style || "solid"} onValueChange={(v) => onUpdate({ style: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SliderField label="Thickness" value={parseInt(content.thickness || "1")} onChange={(v) => onUpdate({ thickness: v.toString() })} min={1} max={5} />
      </div>
    );
    case "spacer": return (
      <div className="space-y-3">
        <SliderField label="Height" value={parseInt(content.height || "30")} onChange={(v) => onUpdate({ height: v.toString() })} min={10} max={100} />
      </div>
    );
    case "product": return (
      <InspectorSection title="Product Card" description="Control merchandising details for a featured product block.">
        <div>
          <FieldLabel>Product Name</FieldLabel>
          <Input value={content.name} onChange={(e) => { e.stopPropagation(); onUpdate({ name: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" />
        </div>
        <div>
          <FieldLabel>Price</FieldLabel>
          <Input value={content.price} onChange={(e) => { e.stopPropagation(); onUpdate({ price: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" placeholder="$99.99" />
        </div>
        <div>
          <FieldLabel>Image URL</FieldLabel>
          <Input value={content.imageUrl} onChange={(e) => { e.stopPropagation(); onUpdate({ imageUrl: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" placeholder="https://..." />
        </div>
        <div>
          <FieldLabel>Button Text</FieldLabel>
          <Input value={content.buttonText} onChange={(e) => { e.stopPropagation(); onUpdate({ buttonText: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" />
        </div>
        <div>
          <FieldLabel>Button URL</FieldLabel>
          <Input value={content.buttonUrl} onChange={(e) => { e.stopPropagation(); onUpdate({ buttonUrl: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" placeholder="https://..." />
        </div>
      </InspectorSection>
    );
    case "cart_items": return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">Dynamic Cart Items</span>
          </div>
          <p className="text-[11px] text-amber-700">
            This block automatically displays cart items using the <code className="bg-amber-100 px-1 rounded">{"{{cart_items}}"}</code> variable. Products are pulled from the user's abandoned cart.
          </p>
        </div>
        <div>
          <Label className="text-[11px] font-medium text-gray-500 mb-1 block">Button Text</Label>
          <Input value={content.buttonText || "Complete Your Order"} onChange={(e) => { e.stopPropagation(); onUpdate({ buttonText: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-[11px] font-medium text-gray-500 mb-1 block">Button URL</Label>
          <Input value={content.buttonUrl || "https://9rx.com/pharmacy/order/create"} onChange={(e) => { e.stopPropagation(); onUpdate({ buttonUrl: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-8 text-xs" />
        </div>
        <div className="pt-2 border-t border-gray-100">
          <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Available Variables</Label>
          <div className="space-y-1 text-[10px] text-gray-500">
            <p><code className="bg-gray-100 px-1 rounded">{"{{cart_items}}"}</code> - Product list HTML</p>
            <p><code className="bg-gray-100 px-1 rounded">{"{{cart_total}}"}</code> - Cart total amount</p>
            <p><code className="bg-gray-100 px-1 rounded">{"{{item_count}}"}</code> - Number of items</p>
            <p><code className="bg-gray-100 px-1 rounded">{"{{user_name}}"}</code> - Customer name</p>
          </div>
        </div>
      </div>
    );
    case "coupon": return (
      <div className="space-y-3">
        <div>
          <Label className="text-[11px] font-medium text-gray-500 mb-1 block">Discount Text</Label>
          <Input value={content.discount} onChange={(e) => { e.stopPropagation(); onUpdate({ discount: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-8 text-xs" placeholder="10% OFF" />
        </div>
        <div>
          <Label className="text-[11px] font-medium text-gray-500 mb-1 block">Coupon Code</Label>
          <Input value={content.code} onChange={(e) => { e.stopPropagation(); onUpdate({ code: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-8 text-xs font-mono tracking-wider" />
        </div>
        <div>
          <Label className="text-[11px] font-medium text-gray-500 mb-1 block">Description</Label>
          <Input value={content.description} onChange={(e) => { e.stopPropagation(); onUpdate({ description: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-8 text-xs" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ColorPicker label="Background" value={content.bgColor || "#fef3c7"} onChange={(v) => onUpdate({ bgColor: v })} />
          <ColorPicker label="Border" value={content.borderColor || "#f59e0b"} onChange={(v) => onUpdate({ borderColor: v })} />
        </div>
      </div>
    );
    case "footer": return (
      <div className="space-y-3">
        <InspectorSection title="Brand Details" description="Set the business identity and contact information shown in the footer.">
        <div>
          <FieldLabel>Company Name</FieldLabel>
          <Input value={content.companyName || "9RX LLC"} onChange={(e) => { e.stopPropagation(); onUpdate({ companyName: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" />
        </div>
        <div>
          <FieldLabel>Address</FieldLabel>
          <Textarea value={content.address || "936 Broad River Ln, Charlotte, NC 28211"} onChange={(e) => { e.stopPropagation(); onUpdate({ address: e.target.value }); }} onClick={(e) => e.stopPropagation()} rows={2} className="rounded-xl border-slate-200 text-xs" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Phone</FieldLabel>
            <Input value={content.phone || "+1 (800) 940-9619"} onChange={(e) => { e.stopPropagation(); onUpdate({ phone: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input value={content.email || "info@9rx.com"} onChange={(e) => { e.stopPropagation(); onUpdate({ email: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" />
          </div>
        </div>
        <div>
          <FieldLabel>Website</FieldLabel>
          <Input value={content.website || "www.9rx.com"} onChange={(e) => { e.stopPropagation(); onUpdate({ website: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="h-9 rounded-xl border-slate-200 text-xs" />
        </div>
        </InspectorSection>

        <InspectorSection title="Colors" description="Tune the footer palette for contrast and brand consistency.">
          <div className="space-y-2">
            <ColorPicker label="Background" value={content.bgColor || "#1f2937"} onChange={(v) => onUpdate({ bgColor: v })} />
            <ColorPicker label="Text Color" value={content.textColor || "#9ca3af"} onChange={(v) => onUpdate({ textColor: v })} />
            <ColorPicker label="Link Color" value={content.linkColor || "#10b981"} onChange={(v) => onUpdate({ linkColor: v })} />
          </div>
        </InspectorSection>

        <InspectorSection title="Options" description="Toggle utility links and social sections in the footer." >
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input type="checkbox" checked={content.showUnsubscribe !== false} onChange={(e) => { e.stopPropagation(); onUpdate({ showUnsubscribe: e.target.checked }); }} onClick={(e) => e.stopPropagation()} className="h-3.5 w-3.5 rounded text-blue-500" />
              <span className="text-[11px] text-slate-600">Show Unsubscribe Link</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input type="checkbox" checked={content.showSocial !== false} onChange={(e) => { e.stopPropagation(); onUpdate({ showSocial: e.target.checked }); }} onClick={(e) => e.stopPropagation()} className="h-3.5 w-3.5 rounded text-blue-500" />
              <span className="text-[11px] text-slate-600">Show Social Links</span>
            </label>
          </div>
        </InspectorSection>
        
        {content.showSocial && (
          <InspectorSection title="Social Links" description="Add destination URLs for the social links shown in the footer.">
            <div className="grid grid-cols-2 gap-1.5">
              <Input value={content.socialLinks?.facebook || ""} onChange={(e) => { e.stopPropagation(); onUpdate({ socialLinks: { ...content.socialLinks, facebook: e.target.value } }); }} onClick={(e) => e.stopPropagation()} placeholder="Facebook" className="h-8 rounded-xl border-slate-200 text-[10px]" />
              <Input value={content.socialLinks?.twitter || ""} onChange={(e) => { e.stopPropagation(); onUpdate({ socialLinks: { ...content.socialLinks, twitter: e.target.value } }); }} onClick={(e) => e.stopPropagation()} placeholder="Twitter" className="h-8 rounded-xl border-slate-200 text-[10px]" />
              <Input value={content.socialLinks?.linkedin || ""} onChange={(e) => { e.stopPropagation(); onUpdate({ socialLinks: { ...content.socialLinks, linkedin: e.target.value } }); }} onClick={(e) => e.stopPropagation()} placeholder="LinkedIn" className="h-8 rounded-xl border-slate-200 text-[10px]" />
              <Input value={content.socialLinks?.instagram || ""} onChange={(e) => { e.stopPropagation(); onUpdate({ socialLinks: { ...content.socialLinks, instagram: e.target.value } }); }} onClick={(e) => e.stopPropagation()} placeholder="Instagram" className="h-8 rounded-xl border-slate-200 text-[10px]" />
            </div>
          </InspectorSection>
        )}
      </div>
    );
    default: return <p className="text-gray-400 text-xs">No options</p>;
        }
      })()}
    </div>
  );
}

export default VisualEmailEditor;
