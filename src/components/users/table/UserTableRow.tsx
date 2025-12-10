import { User } from "../UsersTable";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Building2, ChevronDown, ChevronUp, Phone, Calendar } from "lucide-react";
import UserActions from "../UserActions";
import { UserRole } from "../schemas/userFormSchemas";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserTableRowProps {
  user: User;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onUserUpdated: () => void;
  getStatusBadgeColor: (status: string) => string;
  handleStatusBadgeClick: (user: User) => void;
  searchTerm?: string;
}

// Highlight matching text in search results
const HighlightText = ({ text, highlight }: { text: string; highlight?: string }) => {
  if (!highlight || !highlight.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

export function UserTableRow({
  user,
  isSelected,
  onSelectChange,
  onUserUpdated,
  getStatusBadgeColor,
  handleStatusBadgeClick,
  searchTerm = "",
}: UserTableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const userType = user.type.toLowerCase() as "pharmacy" | "hospital" | "group";

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get avatar background color based on user type
  const getAvatarColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "pharmacy":
        return "bg-green-100 text-green-700";
      case "hospital":
        return "bg-red-100 text-red-700";
      case "group":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <>
      <TableRow 
        className={cn(
          "hover:bg-muted/50 transition-colors",
          isSelected && "bg-primary/5"
        )}
      >
        <TableCell className="px-2 sm:px-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectChange}
            aria-label={`Select ${user.name}`}
            className="h-5 w-5"
          />
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-3">
            {/* Avatar with initials */}
            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
              getAvatarColor(user.type)
            )}>
              {getInitials(user.name)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate">
                <HighlightText text={user.name} highlight={searchTerm} />
              </span>
              {/* Mobile: Show email and expand button */}
              <div className="flex items-center gap-2 md:hidden">
                <span className="text-xs text-muted-foreground truncate">
                  <HighlightText text={user.email} highlight={searchTerm} />
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs text-primary"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  <span className="ml-1">{isExpanded ? "Less" : "More"}</span>
                </Button>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">
              <HighlightText text={user.email} highlight={searchTerm} />
            </span>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{user.company || "-"}</span>
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <Badge variant="outline" className="capitalize">
            {user.type}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge 
            className={`${getStatusBadgeColor(user.status)} cursor-pointer whitespace-nowrap`}
            onClick={() => handleStatusBadgeClick(user)}
          >
            {user.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <UserActions
            userId={user.id}
            userStatus={user.status}
            userName={user.name}
            userEmail={user.email}
            userType={userType}
            onUserUpdated={onUserUpdated}
          />
        </TableCell>
      </TableRow>
      
      {/* Mobile Expanded Details Row */}
      {isExpanded && (
        <TableRow className="md:hidden bg-muted/30 animate-in slide-in-from-top-1 duration-200">
          <TableCell colSpan={7} className="py-3">
            <div className="grid grid-cols-2 gap-3 text-sm px-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">{user.company || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {user.type}
                </Badge>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 col-span-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Last Active</p>
                <p className="font-medium">{user.lastActive || "-"}</p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}