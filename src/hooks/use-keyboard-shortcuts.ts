import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlOrMeta = (e.ctrlKey || e.metaKey) === (shortcut.ctrlKey || shortcut.metaKey || false);
        const shift = e.shiftKey === (shortcut.shiftKey || false);
        
        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlOrMeta && shift) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [shortcuts]);
}

// Common shortcuts for admin dashboard
export function useAdminKeyboardShortcuts() {
  const navigate = useNavigate();

  useKeyboardShortcuts([
    {
      key: "k",
      ctrlKey: true,
      action: () => {
        const searchInput = document.getElementById("global-search");
        if (searchInput) searchInput.focus();
      },
      description: "Focus search",
    },
    {
      key: "d",
      ctrlKey: true,
      action: () => navigate("/admin/dashboard"),
      description: "Go to dashboard",
    },
    {
      key: "o",
      ctrlKey: true,
      action: () => navigate("/admin/orders"),
      description: "Go to orders",
    },
    {
      key: "p",
      ctrlKey: true,
      action: () => navigate("/admin/products"),
      description: "Go to products",
    },
    {
      key: "u",
      ctrlKey: true,
      action: () => navigate("/admin/users"),
      description: "Go to users",
    },
  ]);
}
