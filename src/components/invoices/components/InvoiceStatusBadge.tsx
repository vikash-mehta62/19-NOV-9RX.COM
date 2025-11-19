
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Link, Mail, CheckCircle, AlertCircle, Ban, Clock } from "lucide-react";

interface InvoiceStatusBadgeProps {
  status: string;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const statusConfig = {
    paid: {
      color: "bg-green-500/20 text-green-600 border-green-500/20",
      icon: CheckCircle,
      label: "Paid",
      description: "Payment has been received"
    },
    unpaid: {
      color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/20",
      icon: Clock,
      label: "Pending",
      description: "Waiting for payment"
    },
    needs_payment_link: {
      color: "bg-blue-500/20 text-blue-600 border-blue-500/20",
      icon: Link,
      label: "Needs Payment Link",
      description: "Payment link needs to be generated"
    },
    payment_link_sent: {
      color: "bg-purple-500/20 text-purple-600 border-purple-500/20",
      icon: Mail,
      label: "Link Sent",
      description: "Payment link has been sent to customer"
    },
    overdue: {
      color: "bg-red-500/20 text-red-600 border-red-500/20",
      icon: AlertCircle,
      label: "Overdue",
      description: "Payment is past due"
    },
    cancelled: {
      color: "bg-gray-500/20 text-gray-600 border-gray-500/20",
      icon: Ban,
      label: "Cancelled",
      description: "Invoice has been cancelled"
    },
    draft: {
      color: "bg-slate-500/20 text-slate-600 border-slate-500/20",
      icon: Calendar,
      label: "Draft",
      description: "Invoice is in draft state"
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className={`${config.color} gap-1.5`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
