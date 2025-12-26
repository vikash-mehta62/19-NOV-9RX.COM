import { useState, useEffect, useRef } from "react";
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
  Mail, Smartphone, Monitor, MousePointerClick, Layers, Settings2, Wand2, LayoutTemplate, Sparkles, GripVertical,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Columns
} from "lucide-react";

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
  onChange: (html: string) => void; 
  variables?: string[];
  templates?: Array<{ id: string; name: string; subject: string; html_content: string; }>;
}

const blockDefaults: Record<string, any> = {
  header: { text: "Your Heading Here", bgColor: "#10b981", textColor: "#ffffff", fontSize: "28", padding: "30" },
  text: { text: "Enter your text here...", color: "#374151", fontSize: "16", align: "left" },
  button: { text: "Click Here", url: "#", bgColor: "#10b981", textColor: "#ffffff", align: "center", radius: "8", size: "medium" },
  image: { url: "", alt: "Image", width: "100", align: "center" },
  divider: { color: "#e5e7eb", thickness: "1", style: "solid" },
  spacer: { height: "30" },
  product: { name: "Product Name", price: "$99.99", imageUrl: "", buttonText: "View Product", buttonUrl: "#" },
  coupon: { code: "SAVE10", discount: "10% OFF", description: "Use at checkout", bgColor: "#fef3c7", borderColor: "#f59e0b" },
  footer: { 
    companyName: "9RX LLC", 
    address: "936 Broad River Ln, Charlotte, NC 28211", 
    phone: "+1 (800) 969-6295", 
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
  { id: "welcome", name: "Welcome", description: "Greet new users", gradient: "from-emerald-400 to-cyan-500",
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
  { id: "order", name: "Order Confirmed", description: "Confirmation email", gradient: "from-green-400 to-emerald-500",
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
  { type: "header", name: "Header", icon: Type, color: "bg-blue-500" },
  { type: "text", name: "Text", icon: Type, color: "bg-gray-500" },
  { type: "button", name: "Button", icon: MousePointerClick, color: "bg-green-500" },
  { type: "image", name: "Image", icon: ImageIcon, color: "bg-purple-500" },
  { type: "divider", name: "Divider", icon: Minus, color: "bg-gray-400" },
  { type: "spacer", name: "Spacer", icon: Square, color: "bg-gray-300" },
  { type: "product", name: "Product", icon: Package, color: "bg-orange-500" },
  { type: "coupon", name: "Coupon", icon: Gift, color: "bg-yellow-500" },
  { type: "footer", name: "Footer", icon: Mail, color: "bg-indigo-500" },
];

function generateHtml(rows: EmailRow[], globalStyle: any): string {
  const bodyContent = rows.map(row => {
    // Start a table for the row
    const rowContent = `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <tr>
        ${row.columns.map(col => {
          const { type, content } = col.block;
          let blockHtml = "";
          
          switch (type) {
            case "header": blockHtml = `<div style="background:${content.bgColor || "#10b981"};padding:${content.padding || 30}px;text-align:center;"><h1 style="color:${content.textColor || "#ffffff"};margin:0;font-size:${content.fontSize || 28}px;font-weight:bold;">${content.text || ""}</h1></div>`; break;
            case "empty": blockHtml = ""; break;
            case "text": blockHtml = `<div style="padding:20px 30px;"><p style="color:${content.color || "#374151"};font-size:${content.fontSize || 16}px;text-align:${content.align || "left"};margin:0;line-height:1.7;white-space:pre-wrap;">${(content.text || "").replace(/\n/g, "<br>")}</p></div>`; break;
            case "button": const bp = content.size === "large" ? "16px 36px" : content.size === "small" ? "10px 20px" : "14px 28px"; blockHtml = `<div style="text-align:${content.align || "center"};padding:20px 30px;"><a href="${content.url || "#"}" style="background:${content.bgColor || "#10b981"};color:${content.textColor || "#ffffff"};padding:${bp};text-decoration:none;border-radius:${content.radius || 8}px;font-weight:600;display:inline-block;">${content.text || ""}</a></div>`; break;
            case "image": blockHtml = content.url ? `<div style="text-align:${content.align || "center"};padding:20px 30px;"><img src="${content.url}" alt="${content.alt || ""}" style="max-width:${content.width || 100}%;height:auto;border-radius:8px;" /></div>` : ""; break;
            case "divider": blockHtml = `<div style="padding:15px 30px;"><hr style="border:none;border-top:${content.thickness || 1}px ${content.style || "solid"} ${content.color || "#e5e7eb"};margin:0;" /></div>`; break;
            case "spacer": blockHtml = `<div style="height:${content.height || 30}px;"></div>`; break;
            case "product": blockHtml = `<div style="background:#f8fafc;border-radius:16px;padding:24px;margin:20px 30px;text-align:center;">${content.imageUrl ? `<img src="${content.imageUrl}" alt="${content.name}" style="max-width:160px;height:auto;border-radius:12px;margin-bottom:16px;" />` : ""}<h3 style="margin:0 0 8px;color:#1f2937;font-size:18px;font-weight:600;">${content.name || ""}</h3><p style="color:#10b981;font-size:24px;font-weight:bold;margin:8px 0 16px;">${content.price || ""}</p><a href="${content.buttonUrl || "#"}" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:10px;display:inline-block;font-weight:600;">${content.buttonText || ""}</a></div>`; break;
            case "coupon": blockHtml = `<div style="background:linear-gradient(135deg,${content.bgColor || "#fef3c7"},#fff7ed);border:3px dashed ${content.borderColor || "#f59e0b"};border-radius:16px;padding:24px;margin:20px 30px;text-align:center;"><p style="color:#92400e;font-size:28px;font-weight:bold;margin:0 0 12px;">${content.discount || ""}</p><div style="background:white;padding:14px 28px;border-radius:10px;font-family:monospace;font-size:24px;margin:12px auto;display:inline-block;border:2px solid ${content.borderColor || "#f59e0b"};letter-spacing:3px;font-weight:bold;">${content.code || ""}</div><p style="color:#78350f;margin:12px 0 0;font-size:14px;">${content.description || ""}</p></div>`; break;
            case "footer": blockHtml = `<div style="background:${content.bgColor || "#1f2937"};padding:40px 30px 30px;text-align:center;color:${content.textColor || "#9ca3af"};font-size:14px;line-height:1.6;">
              <div style="margin-bottom:20px;">
                <h3 style="color:${content.linkColor || "#10b981"};font-size:18px;font-weight:bold;margin:0 0 10px;">${content.companyName || "9RX LLC"}</h3>
                <p style="margin:0 0 8px;">${content.address || "936 Broad River Ln, Charlotte, NC 28211"}</p>
                <p style="margin:0 0 8px;">Phone: <a href="tel:${content.phone || "+18009696295"}" style="color:${content.linkColor || "#10b981"};text-decoration:none;">${content.phone || "+1 (800) 969-6295"}</a></p>
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
                ${content.showUnsubscribe ? `<p style="margin:0;"><a href="{{unsubscribe_url}}" style="color:${content.textColor || "#9ca3af"};text-decoration:underline;">Unsubscribe</a> | <a href="https://9rx.com/privacy" style="color:${content.textColor || "#9ca3af"};text-decoration:underline;">Privacy Policy</a></p>` : ""}
              </div>
            </div>`; break;
            default: blockHtml = "";
          }

          return `
            <td width="${col.width}%" valign="top" style="width: ${col.width}%;">
              ${blockHtml}
            </td>
          `;
        }).join("")}
      </tr>
    </table>
    `;
    return rowContent;
  }).join("\n");
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:${globalStyle.bgColor || "#f1f5f9"};"><div style="background:${globalStyle.contentBg || "#ffffff"};border-radius:${globalStyle.borderRadius || 12}px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">${bodyContent}</div></body></html>`;
}

export function VisualEmailEditor({ initialHtml, onChange, variables = [], templates = [] }: VisualEmailEditorProps) {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "code">("edit");
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [globalStyle, setGlobalStyle] = useState({ bgColor: "#f1f5f9", contentBg: "#ffffff", borderRadius: "12" });
  const [htmlEditMode, setHtmlEditMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  
  // Drag and drop states
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingNewBlock, setIsDraggingNewBlock] = useState(false);

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
      onChange(generatedHtml);
      setEditingExistingHtml(false);
    } else if (htmlEditMode && htmlContent) {
      // console.log('Using HTML edit mode content:', htmlContent.substring(0, 200) + '...'); // Debug log
      onChange(htmlContent);
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
      onChange(newHtml);
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
      onChange(dbTemplate.html_content || '');
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
    // Enhanced HTML to blocks conversion
    const htmlContent = initialHtml || '';
    const newRows: EmailRow[] = [];
    
    if (htmlContent.trim()) {
      // Try to parse and extract meaningful content
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      let blockIndex = 0;
      let customFooterData: any = {};
      
      // 1. Find and extract Footer to prevent duplication (since we always add a fresh one)
      // We look for the footer container by its signature content or style
      const totalTextLength = doc.body.textContent?.length || 0;
      
      let footerCandidates = Array.from(doc.querySelectorAll('div')).filter(el => {
        const text = el.textContent || '';
        const style = el.getAttribute('style') || '';
        
        // Safety check: The footer should not contain the main content variables
        if (text.includes('{{first_name}}') || text.includes('{{order_number}}')) return false;
        
        // Safety check: Exclude oversized containers, but be less strict if we have strong footer signals
        const hasCopyright = text.toLowerCase().includes('all rights reserved');
        const hasContactInfo = (text.includes('Phone:') && text.includes('Email:')) || 
                               (text.includes('9RX LLC') && text.includes('Charlotte, NC'));
                               
        // If it looks exactly like a footer, ignore the size check
        if (!hasCopyright && !hasContactInfo) {
           if (totalTextLength > 300 && text.length > totalTextLength * 0.8) return false;
        }

        const hasFooterStyle = style.includes('padding:40px 30px 30px') || 
                               style.includes('padding: 40px 30px 30px');
        
        // Strong signal: Has copyright text
        if (hasCopyright) return true;
        
        // Strong signal: Has contact info (Company + Address/Phone/Email)
        if (hasContactInfo) return true;
        
        // Medium signal: Has specific footer style AND at least some contact info
        const partialContact = text.includes('Phone:') || text.includes('Email:') || text.includes('Website:');
        if (hasFooterStyle && partialContact) return true;
        
        return false;
      });

      // Filter out nested candidates (keep only the outermost ones)
      // If candidate A contains candidate B, we only want to keep A (the parent)
      footerCandidates = footerCandidates.filter(candidate => {
        return !footerCandidates.some(other => other !== candidate && other.contains(candidate));
      });

      // Pick the primary footer element (usually the last one in the DOM)
      const footerElement = footerCandidates.length > 0 ? footerCandidates[footerCandidates.length - 1] : null;
      
      if (footerElement) {
        console.log('🗑️ Footer found in HTML, extracting data and removing to prevent duplication');
        
        // Extract data to preserve customizations
        const h3 = footerElement.querySelector('h3');
        const pTags = footerElement.querySelectorAll('p');
        
        if (h3) customFooterData.companyName = h3.textContent?.trim();
        if (pTags.length > 0) customFooterData.address = pTags[0].textContent?.trim();
        
        // Try to extract contact info (Phone, Email, Website)
        pTags.forEach(p => {
          const text = p.textContent || '';
          if (text.includes('Phone:')) customFooterData.phone = text.replace('Phone:', '').trim();
          if (text.includes('Email:')) customFooterData.email = text.replace('Email:', '').trim();
          if (text.includes('Website:')) customFooterData.website = text.replace('Website:', '').trim();
        });
        
        // Remove ALL identified footer candidates to ensure clean state
        // (In case there are multiple footer-like sections or split containers)
        footerCandidates.forEach(el => el.remove());
      }

      // Helper to find background color up the tree
      const findBackgroundColor = (el: Element | null): string | null => {
        let current = el;
        let steps = 0;
        while (current && steps < 4) { // Look up to 4 parents
          const style = current.getAttribute('style') || '';
          const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);
          if (bgMatch && bgMatch[1] && !bgMatch[1].includes('transparent') && !bgMatch[1].includes('rgba(0, 0, 0, 0)')) {
            return bgMatch[1].trim();
          }
          current = current.parentElement;
          steps++;
        }
        return null;
      };

      // Helper to find text color
      const findTextColor = (el: Element | null): string | null => {
         const style = el?.getAttribute('style') || '';
         const colorMatch = style.match(/color:\s*([^;]+)/i);
         return colorMatch ? colorMatch[1].trim() : null;
      };

      // Helper to add block as a row
      const addBlockAsRow = (block: EmailBlock) => {
        newRows.push({
          id: `row-${Date.now()}-${blockIndex}`,
          columns: [{
            id: `col-${Date.now()}-${blockIndex}`,
            width: 100,
            block: block
          }]
        });
        blockIndex++;
      };

      // Recursive function to process nodes in order
      const processNode = (node: Node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as Element;
        
        // Skip script and style tags
        if (['SCRIPT', 'STYLE', 'META', 'HEAD', 'TITLE'].includes(el.tagName)) return;

        // 1. Check for Coupon (Heuristic)
        const style = el.getAttribute('style') || '';
        const text = el.textContent || '';
        const isCouponCandidate = (style.includes('border') && style.includes('dashed')) || 
                                  (text.includes('% OFF') || text.includes('Code:'));
        
        // Only treat as coupon if it seems to be a container for it
        if (isCouponCandidate && el.tagName === 'DIV' && text.length < 200) {
           const discount = text.match(/(\d+%?\s*OFF)/i)?.[1] || 'Special Offer';
           const code = text.match(/Code:\s*([A-Z0-9]+)/i)?.[1] || 'SAVE';
           
           addBlockAsRow({
              id: `block-${Date.now()}-${blockIndex}`,
              type: 'coupon',
              content: {
                 ...blockDefaults.coupon,
                 discount: discount,
                 code: code,
                 description: text.replace(discount, '').replace(code, '').replace('Code:', '').trim().substring(0, 50),
                 bgColor: findBackgroundColor(el) || '#fef3c7'
              }
           });
           return; // Don't process children of coupon
        }

        // 2. Check for Header
        if (isHeaderElement(el)) {
           addBlockAsRow({
              id: `block-${Date.now()}-${blockIndex}`,
              type: 'header',
              content: {
                 ...blockDefaults.header,
                 text: el.textContent?.trim() || 'Header',
                 bgColor: findBackgroundColor(el) || 'transparent', // No default green
                 textColor: findTextColor(el) || '#000000'
              }
           });
           return;
        }

        // 3. Check for Button
        if (el.tagName === 'A' && (style.includes('background') || el.classList.contains('button') || style.includes('padding'))) {
            addBlockAsRow({
              id: `block-${Date.now()}-${blockIndex}`,
              type: 'button',
              content: {
                 ...blockDefaults.button,
                 text: el.textContent?.trim() || 'Button',
                 url: el.getAttribute('href') || '#',
                 bgColor: findBackgroundColor(el) || '#10b981',
                 textColor: findTextColor(el) || '#ffffff'
              }
           });
           return;
        }

        // Check for Divider
        if (el.tagName === 'HR') {
           addBlockAsRow({
              id: `block-${Date.now()}-${blockIndex}`,
              type: 'divider',
              content: { ...blockDefaults.divider }
           });
           return;
        }

        // Check for Image
        if (el.tagName === 'IMG') {
           const src = el.getAttribute('src') || '';
           if (src) {
             addBlockAsRow({
                id: `block-${Date.now()}-${blockIndex}`,
                type: 'image',
                content: {
                   ...blockDefaults.image,
                   url: src,
                   alt: el.getAttribute('alt') || 'Image',
                   width: el.getAttribute('width') || '100',
                   // Try to detect alignment from parent
                   align: el.parentElement?.style.textAlign || 'center'
                }
             });
           }
           return;
        }

        // 4. Check for Text (P or DIV/SPAN with only text)
        const hasBlockChildren = el.querySelector('div, table, h1, h2, h3, h4, h5, h6, a, p, img, ul, ol, li, blockquote');
        const isTextNode = (el.tagName === 'P' || el.tagName === 'SPAN' || (el.tagName === 'DIV' && !hasBlockChildren));
        
        if (isTextNode) {
           // Improved text extraction:
           // 1. Preserve <br> as newlines
           // 2. Preserve non-breaking spaces (&nbsp;)
           // 3. Collapse source code whitespace (newlines/indentation) to single space UNLESS pre-wrap is set
           
           const clone = el.cloneNode(true) as Element;
           const uniqueNewline = '%%%NEWLINE%%%';
           clone.querySelectorAll('br').forEach(br => br.replaceWith(uniqueNewline));
           
           let text = clone.textContent || '';
           
           const style = el.getAttribute('style') || '';
           const preservesWhitespace = style.includes('white-space:pre') || style.includes('white-space: pre');

           if (!preservesWhitespace) {
              // Collapse standard whitespace chars (space, tab, cr, lf) into single space
              text = text.replace(/[\r\n\t ]+/g, ' ');
           } else {
              // If pre-wrap, we still want to remove source code indentation/newlines if they are just formatting
              // But we want to keep significant spaces. 
              // Since generateHtml doesn't add source indentation, we can trust textContent mostly.
              // But let's at least normalize non-breaking spaces if needed.
              // Actually, if it's pre-wrap, we should just trust it, but we might want to handle the <br> placeholder.
           }
           
           // Restore explicit line breaks from <br>
           text = text.split(uniqueNewline).join('\n');
           
           const textContent = text; // Don't trim if pre-wrap? Maybe trim end is ok. Let's keep it safe.

           if (textContent && textContent.trim().length > 0) {
              addBlockAsRow({
                 id: `block-${Date.now()}-${blockIndex}`,
                 type: 'text',
                 content: {
                    ...blockDefaults.text,
                    text: textContent, // Keep original spaces
                    color: findTextColor(el) || '#374151'
                 }
              });
           }
           return;
        }

        // 5. Recurse for containers (div, table, etc.)
        Array.from(el.children).forEach(child => processNode(child));
      };

      // Start processing from body
      Array.from(doc.body.children).forEach(child => processNode(child));
      
      // Always add a footer
      newRows.push({
        id: `row-${Date.now()}-${blockIndex}`,
        locked: true,
        columns: [{
          id: `col-${Date.now()}-${blockIndex}`,
          width: 100,
          block: {
            id: `block-${Date.now()}-${blockIndex}`,
            type: 'footer',
            content: { ...blockDefaults.footer, ...customFooterData }
          }
        }]
      });
      blockIndex++;
      
      // If no blocks were created (parsing failed), fallback to basic structure
      if (newRows.length <= 1) { // Only footer or empty
        const fallbackRows: EmailRow[] = [
          {
            id: `row-${Date.now()}-0`,
            columns: [{
              id: `col-${Date.now()}-0`,
              width: 100,
              block: {
                id: `block-${Date.now()}-0`,
                type: 'header',
                content: { ...blockDefaults.header, text: 'Edit Your Header' }
              }
            }]
          },
          {
            id: `row-${Date.now()}-1`,
            columns: [{
              id: `col-${Date.now()}-1`,
              width: 100,
              block: {
                id: `block-${Date.now()}-1`,
                type: 'text',
                content: { ...blockDefaults.text, text: 'Content conversion incomplete. Please check Code view.' }
              }
            }]
          }
        ];
        newRows.unshift(...fallbackRows);
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




  // Template Selection Screen - only for new templates (not editing existing)
  if (showTemplates && rows.length === 0 && !editingExistingHtml) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white mb-4"><Wand2 className="w-8 h-8" /></div>
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
                  <button type="button" key={template.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadTemplate(template.id); }} className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-emerald-400 transition-all hover:shadow-lg">
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
            <Tooltip><TooltipTrigger asChild><Button type="button" variant={viewMode === "preview" ? "secondary" : "ghost"} size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewMode("preview"); }} className="gap-1.5 h-8"><Eye className="w-4 h-4" /><span className="hidden sm:inline">Preview</span></Button></TooltipTrigger><TooltipContent>Preview Mode</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button type="button" variant={viewMode === "code" ? "secondary" : "ghost"} size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewMode("code"); }} className="gap-1.5 h-8"><Code className="w-4 h-4" /><span className="hidden sm:inline">Code</span></Button></TooltipTrigger><TooltipContent>View HTML Code</TooltipContent></Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "preview" && (
            <div className="flex items-center bg-white rounded-lg border p-0.5">
              <Button type="button" variant={deviceView === "desktop" ? "secondary" : "ghost"} size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeviceView("desktop"); }} className="h-7 px-2"><Monitor className="w-4 h-4" /></Button>
              <Button type="button" variant={deviceView === "mobile" ? "secondary" : "ghost"} size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeviceView("mobile"); }} className="h-7 px-2"><Smartphone className="w-4 h-4" /></Button>
            </div>
          )}
          {variables.length > 0 && viewMode === "edit" && (
            <Select onValueChange={(v) => navigator.clipboard.writeText(`{{${v}}}`)}><SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="📋 Variables" /></SelectTrigger><SelectContent>{variables.map(v => (<SelectItem key={v} value={v} className="text-xs">{`{{${v}}}`}</SelectItem>))}</SelectContent></Select>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetEditor(); }} className="h-8 text-gray-500 hover:text-red-500"><Undo2 className="w-4 h-4 mr-1" />Reset</Button>
        </div>
      </div>

      {/* Context Toolbar - Fixed at Top */}
      {selectedColumnData && selectedRowIndex !== -1 && viewMode === "edit" && (
        <div className="border-b bg-white px-4 py-2 flex items-center gap-4 overflow-x-auto shadow-sm z-40 sticky top-0">
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
             <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Move</span>
             <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveColumnToPrevRow(selectedRowIndex, selectedColIndex)}><ArrowUp className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Move Up (Row)</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveColumnToNextRow(selectedRowIndex, selectedColIndex)}><ArrowDown className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Move Down (Row)</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveColumnLeft(selectedRowIndex, selectedColIndex)}><ArrowLeft className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Move Left</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveColumnRight(selectedRowIndex, selectedColIndex)}><ArrowRight className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Move Right</TooltipContent></Tooltip>
             </TooltipProvider>
          </div>

          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
             <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Width</span>
             {[25, 33, 50, 100].map(w => (
               <Button 
                 key={w}
                 type="button"
                 variant={selectedColumnData.width === w ? "secondary" : "ghost"}
                 size="sm"
                 className={`h-7 px-2 text-xs ${selectedColumnData.width === w ? 'bg-emerald-100 text-emerald-700 font-bold' : ''}`}
                 onClick={() => setColumnWidth(selectedRowIndex, selectedColIndex, w)}
               >
                 {w === 33 ? '1/3' : w === 25 ? '1/4' : w === 50 ? '1/2' : 'Full'}
               </Button>
             ))}
          </div>

          <div className="flex items-center gap-1">
             <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Actions</span>
             <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="sm" variant="ghost" className="h-7 gap-1.5 text-gray-700" onClick={() => splitColumn(selectedColumnData.block.id)}><Columns className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Split</span></Button></TooltipTrigger><TooltipContent>Add Column Side-by-Side</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="sm" variant="ghost" className="h-7 gap-1.5 text-gray-700" onClick={() => duplicateBlock(selectedColumnData.block.id)}><Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clone Row</span></Button></TooltipTrigger><TooltipContent>Duplicate Entire Row</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" size="sm" variant="ghost" className="h-7 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteBlock(selectedColumnData.block.id)}><Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Delete</span></Button></TooltipTrigger><TooltipContent>Delete Block</TooltipContent></Tooltip>
             </TooltipProvider>
          </div>
        </div>
      )}

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
                onChange(e.target.value);
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
        <div className="flex h-[600px]">
          {/* Left Panel - Blocks (Scrollable) */}
          <div className="w-64 border-r bg-gray-50/50 flex flex-col">
            <div className="p-3 border-b bg-white flex-shrink-0">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Layers className="w-4 h-4" />Content Blocks
              </h3>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="grid grid-cols-2 gap-2">
                {blockTypes.map(block => (
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
                    className="group p-3 rounded-xl border-2 border-gray-100 bg-white hover:border-emerald-300 hover:shadow-md transition-all text-center cursor-grab active:cursor-grabbing"
                  >
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

          {/* Center - Canvas (Scrollable) */}
          <div className="flex-1 flex items-start justify-center p-12 bg-gray-50 overflow-y-auto" style={{ backgroundColor: globalStyle.bgColor }}>
            <div className="w-full max-w-[500px] relative">
              <div 
                className="bg-white shadow-xl transition-all h-fit min-h-[400px]" 
                style={{ backgroundColor: globalStyle.contentBg, borderRadius: `${globalStyle.borderRadius}px` }}
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
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 flex items-center justify-center mb-4"><Code className="w-8 h-8 text-blue-500" /></div>
                      <p className="text-gray-700 font-medium mb-2">Saved Template Loaded</p>
                      <p className="text-gray-500 text-sm mb-4">This template contains HTML content. Choose how you'd like to edit it:</p>
                      <div className="flex gap-2 justify-center mb-4">
                        <Button type="button" variant="default" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewMode("preview"); }} className="gap-1"><Eye className="w-4 h-4" />Preview</Button>
                        <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHtmlEditMode(true); setViewMode("edit"); }} className="gap-1"><Code className="w-4 h-4" />Edit HTML</Button>
                        <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); convertToBlocks(); }} className="gap-1"><Wand2 className="w-4 h-4" />Convert to Blocks</Button>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-gray-400 text-xs mb-2">Or start over with a new design:</p>
                        <Button type="button" variant="link" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingExistingHtml(false); setShowTemplates(true); }} className="text-emerald-600 text-sm"><LayoutTemplate className="w-4 h-4 mr-1" />Choose Different Template</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4"><Plus className="w-8 h-8 text-gray-400" /></div>
                      <p className="text-gray-500 font-medium">Click a block to add content</p>
                      <p className="text-gray-400 text-sm mt-1">Or choose a template to get started</p>
                      <Button type="button" variant="link" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTemplates(true); }} className="mt-2 text-emerald-600"><LayoutTemplate className="w-4 h-4 mr-1" />Browse Templates</Button>
                    </div>
                  )
                ) : (
                  <div className="relative">
                    {rows.map((row, index) => {
                      const isRowSelected = row.columns.some(c => c.block.id === selectedBlock);
                      return (
                      <div key={row.id} className={`relative group/row mb-1 transition-all ${isRowSelected ? 'z-50' : 'z-0'}`} data-row-index={index}>
                        {/* Row Hover Outline */}
                        <div className="absolute inset-0 border border-transparent group-hover/row:border-dashed group-hover/row:border-gray-300 pointer-events-none rounded-lg" />
                        
                        {/* Row Controls (Left Side) */}
                        {!row.locked && (
                            <div className="absolute -left-10 top-2 flex flex-col gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity z-20">
                               <TooltipProvider>
                                  <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-sm border hover:bg-gray-50 text-gray-600" onClick={() => moveRow(row.columns[0].block.id, "up")}><ArrowUp className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="left">Move Row Up</TooltipContent></Tooltip>
                                  <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-sm border hover:bg-gray-50 text-gray-600" onClick={() => moveRow(row.columns[0].block.id, "down")}><ArrowDown className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="left">Move Row Down</TooltipContent></Tooltip>
                               </TooltipProvider>
                            </div>
                        )}

                        <div className="flex w-full items-start" style={{ gap: '0' }}>
                            {row.columns.map((col, colIndex) => {
                               const isSelected = selectedBlock === col.block.id;
                               
                               return (
                               <div key={col.id} style={{ width: `${col.width}%` }} className={`relative group/col transition-all p-1 ${isSelected ? 'z-10' : 'z-0'}`}>
                                  {/* Hover Outline for Column */}
                                  {!row.locked && !isSelected && (
                                     <div className="absolute inset-0 border-2 border-transparent group-hover/col:border-blue-400 pointer-events-none rounded transition-colors" />
                                  )}

                                  {/* Block Content */}
                                  <div 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedBlock(col.block.id); }} 
                                    className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-emerald-500 ring-offset-2 rounded" : ""}`}
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
          <div className="w-72 border-l bg-white flex flex-col">
            {selectedBlockData ? (
              <>
                <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
                  <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Edit {blockTypes.find(b => b.type === selectedBlockData.type)?.name}
                  </h3>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedBlock(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <BlockEditor block={selectedBlockData} onUpdate={(content) => updateBlock(selectedBlockData.id, content)} variables={variables} />
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div>
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                    <MousePointerClick className="w-6 h-6 text-gray-400" />
                  </div>
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
    case "coupon": return <div className="block-preview-smooth" style={{ background: `linear-gradient(135deg, ${content.bgColor || "#fef3c7"}, #fff7ed)`, border: `3px dashed ${content.borderColor || "#f59e0b"}`, borderRadius: "16px", padding: "24px", margin: "20px 30px", textAlign: "center" }}><p style={{ color: "#92400e", fontSize: "28px", fontWeight: "bold", margin: "0 0 12px" }}>{content.discount || "10% OFF"}</p><div style={{ background: "white", padding: "14px 28px", borderRadius: "10px", fontFamily: "monospace", fontSize: "24px", margin: "12px auto", display: "inline-block", border: `2px solid ${content.borderColor || "#f59e0b"}`, letterSpacing: "3px", fontWeight: "bold" }}>{content.code || "CODE"}</div><p style={{ color: "#78350f", margin: "12px 0 0", fontSize: "14px" }}>{content.description || ""}</p></div>;
    case "footer": return <div className="block-preview-smooth" style={{ background: content.bgColor || "#1f2937", padding: "40px 30px 30px", textAlign: "center", color: content.textColor || "#9ca3af", fontSize: "14px", lineHeight: 1.6 }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ color: content.linkColor || "#10b981", fontSize: "18px", fontWeight: "bold", margin: "0 0 10px" }}>{content.companyName || "9RX LLC"}</h3>
        <p style={{ margin: "0 0 8px" }}>{content.address || "936 Broad River Ln, Charlotte, NC 28211"}</p>
        <p style={{ margin: "0 0 8px" }}>Phone: {content.phone || "+1 (800) 969-6295"}</p>
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

const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <Label className="text-xs text-gray-500">{label}</Label>
    <div className="flex gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
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
          className="w-10 h-9 rounded-lg cursor-pointer border border-gray-200 bg-transparent" 
          style={{ backgroundColor: value }}
        />
      </div>
      <Input 
        value={value} 
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value);
        }} 
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.target.select()}
        className="flex-1 h-9 text-xs font-mono" 
        placeholder="#000000"
      />
    </div>
  </div>
);

const AlignPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div>
    <Label className="text-xs text-gray-500">Alignment</Label>
    <div className="flex gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
      {[{ v: "left", i: AlignLeft }, { v: "center", i: AlignCenter }, { v: "right", i: AlignRight }].map(({ v, i: Icon }) => (
        <Button 
          key={v} 
          type="button" 
          variant={value === v ? "default" : "outline"} 
          size="sm" 
          className="flex-1 h-9" 
          onClick={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            onChange(v); 
          }}
        >
          <Icon className="w-4 h-4" />
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
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs text-gray-500">{label}</Label>
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
            className="w-16 h-6 text-xs font-mono text-center border-0 bg-gray-50 hover:bg-white focus:bg-white transition-all duration-200"
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
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}px</span>
        <span>{max}px</span>
      </div>
    </div>
  );
};

function BlockEditor({ block, onUpdate, variables }: { block: EmailBlock; onUpdate: (content: any) => void; variables: string[] }) {
  const { type, content } = block;

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {(() => {
        switch (type) {
    case "header": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Heading Text</Label><Input value={content.text} onChange={(e) => { e.stopPropagation(); onUpdate({ text: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" placeholder="Enter heading..." /></div>
        <div className="grid grid-cols-2 gap-3"><ColorPicker label="Background" value={content.bgColor || "#10b981"} onChange={(v) => onUpdate({ bgColor: v })} /><ColorPicker label="Text Color" value={content.textColor || "#ffffff"} onChange={(v) => onUpdate({ textColor: v })} /></div>
        <SliderField label="Font Size" value={parseInt(content.fontSize || "28")} onChange={(v) => onUpdate({ fontSize: v.toString() })} min={18} max={48} />
        <SliderField label="Padding" value={parseInt(content.padding || "30")} onChange={(v) => onUpdate({ padding: v.toString() })} min={10} max={60} />
      </div>
    );
    case "text": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Text Content</Label><Textarea value={content.text} onChange={(e) => { e.stopPropagation(); onUpdate({ text: e.target.value }); }} onClick={(e) => e.stopPropagation()} rows={5} className="mt-1.5 text-sm" placeholder="Enter your text..." />{variables.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{variables.map(v => (<Badge key={v} variant="secondary" className="cursor-pointer text-xs hover:bg-emerald-100 hover:text-emerald-700 transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate({ text: content.text + `{{${v}}}` }); }}>{`{{${v}}}`}</Badge>))}</div>}</div>
        <ColorPicker label="Text Color" value={content.color || "#374151"} onChange={(v) => onUpdate({ color: v })} />
        <AlignPicker value={content.align || "left"} onChange={(v) => onUpdate({ align: v })} />
        <SliderField label="Font Size" value={parseInt(content.fontSize || "16")} onChange={(v) => onUpdate({ fontSize: v.toString() })} min={12} max={24} />
      </div>
    );
    case "button": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Button Text</Label><Input value={content.text} onChange={(e) => { e.stopPropagation(); onUpdate({ text: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" /></div>
        <div><Label className="text-xs text-gray-500">Link URL</Label><Input value={content.url} onChange={(e) => { e.stopPropagation(); onUpdate({ url: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" placeholder="https://..." /></div>
        <div className="grid grid-cols-2 gap-3"><ColorPicker label="Background" value={content.bgColor || "#10b981"} onChange={(v) => onUpdate({ bgColor: v })} /><ColorPicker label="Text Color" value={content.textColor || "#ffffff"} onChange={(v) => onUpdate({ textColor: v })} /></div>
        <AlignPicker value={content.align || "center"} onChange={(v) => onUpdate({ align: v })} />
        <div onClick={(e) => e.stopPropagation()}><Label className="text-xs text-gray-500">Size</Label><Select value={content.size || "medium"} onValueChange={(v) => onUpdate({ size: v })}><SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="small">Small</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="large">Large</SelectItem></SelectContent></Select></div>
        <SliderField label="Border Radius" value={parseInt(content.radius || "8")} onChange={(v) => onUpdate({ radius: v.toString() })} min={0} max={30} />
      </div>
    );
    case "image": return (
      <div className="space-y-5">
        <div>
          <Label className="text-xs text-gray-500">Image URL *</Label>
          <Input 
            value={content.url || ""} 
            onChange={(e) => { 
              e.stopPropagation(); 
              const newUrl = e.target.value;
              // console.log('Image URL changed:', newUrl); // Debug log
              onUpdate({ url: newUrl }); 
            }} 
            onClick={(e) => e.stopPropagation()} 
            onBlur={(e) => {
              // Force update on blur to ensure it's saved
              const newUrl = e.target.value;
              // console.log('Image URL blur update:', newUrl); // Debug log
              onUpdate({ url: newUrl });
            }}
            className="mt-1.5 h-10" 
            placeholder="https://example.com/image.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste a direct link to an image (jpg, png, gif, webp)
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-6 text-xs px-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const sampleUrl = "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop";
                // console.log('Setting sample URL:', sampleUrl); // Debug log
                onUpdate({ url: sampleUrl });
              }}
            >
              📱 Sample 1
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-6 text-xs px-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const sampleUrl = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop";
                // console.log('Setting sample URL:', sampleUrl); // Debug log
                onUpdate({ url: sampleUrl });
              }}
            >
              💊 Sample 2
            </Button>
          </div>
          {content.url && content.url.trim() && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Preview:</p>
              <img 
                src={content.url} 
                alt="Preview" 
                className="max-w-full h-20 object-contain rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                  if (sibling) sibling.textContent = '❌ Invalid image URL';
                }}
                onLoad={(e) => {
                  const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                  if (sibling) sibling.textContent = '✅ Image loaded successfully';
                }}
              />
              <p className="text-xs text-gray-500 mt-1">✅ Image loaded successfully</p>
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs text-gray-500">Alt Text</Label>
          <Input 
            value={content.alt || ""} 
            onChange={(e) => { 
              e.stopPropagation(); 
              onUpdate({ alt: e.target.value }); 
            }} 
            onClick={(e) => e.stopPropagation()} 
            className="mt-1.5 h-10" 
            placeholder="Describe the image"
          />
          <p className="text-xs text-gray-500 mt-1">
            Important for accessibility and email clients
          </p>
        </div>
        <AlignPicker value={content.align || "center"} onChange={(v) => onUpdate({ align: v })} />
        <SliderField label="Width" value={parseInt(content.width || "100")} onChange={(v) => onUpdate({ width: v.toString() })} min={20} max={100} />
      </div>
    );
    case "divider": return (
      <div className="space-y-5">
        <ColorPicker label="Color" value={content.color || "#e5e7eb"} onChange={(v) => onUpdate({ color: v })} />
        <div onClick={(e) => e.stopPropagation()}><Label className="text-xs text-gray-500">Style</Label><Select value={content.style || "solid"} onValueChange={(v) => onUpdate({ style: v })}><SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem><SelectItem value="dotted">Dotted</SelectItem></SelectContent></Select></div>
        <SliderField label="Thickness" value={parseInt(content.thickness || "1")} onChange={(v) => onUpdate({ thickness: v.toString() })} min={1} max={5} />
      </div>
    );
    case "spacer": return <SliderField label="Height" value={parseInt(content.height || "30")} onChange={(v) => onUpdate({ height: v.toString() })} min={10} max={100} />;
    case "product": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Product Name</Label><Input value={content.name} onChange={(e) => { e.stopPropagation(); onUpdate({ name: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" /></div>
        <div><Label className="text-xs text-gray-500">Price</Label><Input value={content.price} onChange={(e) => { e.stopPropagation(); onUpdate({ price: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" placeholder="$99.99" /></div>
        <div><Label className="text-xs text-gray-500">Image URL</Label><Input value={content.imageUrl} onChange={(e) => { e.stopPropagation(); onUpdate({ imageUrl: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" placeholder="https://..." /></div>
        <div><Label className="text-xs text-gray-500">Button Text</Label><Input value={content.buttonText} onChange={(e) => { e.stopPropagation(); onUpdate({ buttonText: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" /></div>
        <div><Label className="text-xs text-gray-500">Button URL</Label><Input value={content.buttonUrl} onChange={(e) => { e.stopPropagation(); onUpdate({ buttonUrl: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" placeholder="https://..." /></div>
      </div>
    );
    case "coupon": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Discount Text</Label><Input value={content.discount} onChange={(e) => { e.stopPropagation(); onUpdate({ discount: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" placeholder="10% OFF" /></div>
        <div><Label className="text-xs text-gray-500">Coupon Code</Label><Input value={content.code} onChange={(e) => { e.stopPropagation(); onUpdate({ code: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10 font-mono tracking-wider" /></div>
        <div><Label className="text-xs text-gray-500">Description</Label><Input value={content.description} onChange={(e) => { e.stopPropagation(); onUpdate({ description: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" /></div>
        <div className="grid grid-cols-2 gap-3"><ColorPicker label="Background" value={content.bgColor || "#fef3c7"} onChange={(v) => onUpdate({ bgColor: v })} /><ColorPicker label="Border" value={content.borderColor || "#f59e0b"} onChange={(v) => onUpdate({ borderColor: v })} /></div>
      </div>
    );
    case "footer": return (
      <div className="space-y-5">
        <div><Label className="text-xs text-gray-500">Company Name</Label><Input value={content.companyName || "9RX LLC"} onChange={(e) => { e.stopPropagation(); onUpdate({ companyName: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" /></div>
        <div><Label className="text-xs text-gray-500">Address</Label><Textarea value={content.address || "936 Broad River Ln, Charlotte, NC 28211"} onChange={(e) => { e.stopPropagation(); onUpdate({ address: e.target.value }); }} onClick={(e) => e.stopPropagation()} rows={2} className="mt-1.5 text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-gray-500">Phone</Label><Input value={content.phone || "+1 (800) 969-6295"} onChange={(e) => { e.stopPropagation(); onUpdate({ phone: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" /></div>
          <div><Label className="text-xs text-gray-500">Email</Label><Input value={content.email || "info@9rx.com"} onChange={(e) => { e.stopPropagation(); onUpdate({ email: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" /></div>
        </div>
        <div><Label className="text-xs text-gray-500">Website</Label><Input value={content.website || "www.9rx.com"} onChange={(e) => { e.stopPropagation(); onUpdate({ website: e.target.value }); }} onClick={(e) => e.stopPropagation()} className="mt-1.5 h-10" /></div>
        <div className="grid grid-cols-3 gap-2">
          <ColorPicker label="Background" value={content.bgColor || "#1f2937"} onChange={(v) => onUpdate({ bgColor: v })} />
          <ColorPicker label="Text Color" value={content.textColor || "#9ca3af"} onChange={(v) => onUpdate({ textColor: v })} />
          <ColorPicker label="Link Color" value={content.linkColor || "#10b981"} onChange={(v) => onUpdate({ linkColor: v })} />
        </div>
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="showUnsubscribe" checked={content.showUnsubscribe !== false} onChange={(e) => { e.stopPropagation(); onUpdate({ showUnsubscribe: e.target.checked }); }} onClick={(e) => e.stopPropagation()} className="rounded" />
            <Label htmlFor="showUnsubscribe" className="text-xs text-gray-500">Show Unsubscribe Link</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="showSocial" checked={content.showSocial !== false} onChange={(e) => { e.stopPropagation(); onUpdate({ showSocial: e.target.checked }); }} onClick={(e) => e.stopPropagation()} className="rounded" />
            <Label htmlFor="showSocial" className="text-xs text-gray-500">Show Social Links</Label>
          </div>
        </div>
        {content.showSocial && (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <Label className="text-xs text-gray-500">Social Media Links (Optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input value={content.socialLinks?.facebook || ""} onChange={(e) => { e.stopPropagation(); onUpdate({ socialLinks: { ...content.socialLinks, facebook: e.target.value } }); }} onClick={(e) => e.stopPropagation()} placeholder="Facebook URL" className="h-9 text-xs" />
              <Input value={content.socialLinks?.twitter || ""} onChange={(e) => { e.stopPropagation(); onUpdate({ socialLinks: { ...content.socialLinks, twitter: e.target.value } }); }} onClick={(e) => e.stopPropagation()} placeholder="Twitter URL" className="h-9 text-xs" />
              <Input value={content.socialLinks?.linkedin || ""} onChange={(e) => { e.stopPropagation(); onUpdate({ socialLinks: { ...content.socialLinks, linkedin: e.target.value } }); }} onClick={(e) => e.stopPropagation()} placeholder="LinkedIn URL" className="h-9 text-xs" />
              <Input value={content.socialLinks?.instagram || ""} onChange={(e) => { e.stopPropagation(); onUpdate({ socialLinks: { ...content.socialLinks, instagram: e.target.value } }); }} onClick={(e) => e.stopPropagation()} placeholder="Instagram URL" className="h-9 text-xs" />
            </div>
          </div>
        )}
      </div>
    );
    default: return <p className="text-gray-400 text-sm">No options</p>;
        }
      })()}
    </div>
  );
}

export default VisualEmailEditor;
