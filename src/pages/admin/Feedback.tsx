import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import axios from "../../../axiosconfig";
import { supabase } from "@/integrations/supabase/client";

type FeedbackType = "bug" | "suggestion" | "other";
type FeedbackStatus = "new" | "reviewed" | "resolved";

interface FeedbackItem {
  _id: string;
  feedbackType: FeedbackType;
  status: FeedbackStatus;
  message: string;
  pageUrl?: string;
  pharmacy?: {
    email?: string;
    displayName?: string;
    companyName?: string;
  };
  images?: Array<{
    url?: string;
    path?: string;
    originalName?: string;
  }>;
  createdAt: string;
}

export default function AdminFeedbackPage() {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_APP_BASE_URL ||
    "https://9rx.mahitechnocrafts.in";

  const apiOrigin = useMemo(() => {
    try {
      return new URL(API_BASE_URL).origin;
    } catch (_error) {
      return window.location.origin;
    }
  }, [API_BASE_URL]);

  const toAssetUrl = (rawPath?: string) => {
    if (!rawPath) return "";

    const trimmed = String(rawPath).trim();
    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed)) {
      const absolute = window.location.protocol === "https:" && trimmed.startsWith("http://")
        ? trimmed.replace(/^http:\/\//i, "https://")
        : trimmed;
      return encodeURI(absolute);
    }

    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return encodeURI(`${apiOrigin}${normalizedPath}`);
  };
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [feedbackType, setFeedbackType] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params: Record<string, string | number> = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (status !== "all") params.status = status;
      if (feedbackType !== "all") params.feedbackType = feedbackType;

      const res = await axios.get("/api/feedback", {
        params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.data?.success) {
        setItems(res.data.data || []);
        setTotal(res.data.pagination?.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to load feedback list:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, nextStatus: FeedbackStatus) => {
    try {
      setUpdatingId(feedbackId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await axios.patch(
        `/api/feedback/${feedbackId}/status`,
        { status: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (res.data?.success) {
        setItems((prev) =>
          prev.map((item) =>
            item._id === feedbackId ? { ...item, status: nextStatus } : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to update feedback status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [page, limit, status, feedbackType]);

  const typeVariant = (type: FeedbackType) => {
    if (type === "bug") return "destructive";
    if (type === "suggestion") return "default";
    return "secondary";
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Pharmacy Feedback
            </CardTitle>
            <CardDescription>
              Manage and review feedback from pharmacies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search email/company/message"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    setPage(1);
                    fetchFeedback();
                  }}
                  disabled={loading}
                >
                  Search
                </Button>
              </div>

              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={feedbackType}
                onValueChange={(value) => {
                  setFeedbackType(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <Badge variant={typeVariant(item.feedbackType) as any}>{item.feedbackType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.status}
                          disabled={updatingId === item._id}
                          onValueChange={(value) =>
                            updateFeedbackStatus(item._id, value as FeedbackStatus)
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">new</SelectItem>
                            <SelectItem value="reviewed">reviewed</SelectItem>
                            <SelectItem value="resolved">resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{item.pharmacy?.displayName || "N/A"}</div>
                          <div className="text-muted-foreground">{item.pharmacy?.email || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">{item.pageUrl || "-"}</TableCell>
                      <TableCell>{format(new Date(item.createdAt), "dd MMM yyyy, hh:mm a")}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Feedback Detail</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                              <div><strong>Type:</strong> {item.feedbackType}</div>
                              <div><strong>Status:</strong> {item.status}</div>
                              <div><strong>Pharmacy:</strong> {item.pharmacy?.displayName || "N/A"}</div>
                              <div><strong>Email:</strong> {item.pharmacy?.email || "-"}</div>
                              <div><strong>Company:</strong> {item.pharmacy?.companyName || "-"}</div>
                              <div><strong>Page:</strong> {item.pageUrl || "-"}</div>
                              <div><strong>Created:</strong> {format(new Date(item.createdAt), "PPpp")}</div>
                              <div className="rounded-md border p-3 whitespace-pre-wrap">{item.message}</div>
                              {Array.isArray(item.images) && item.images.length > 0 && (
                                <div className="space-y-2">
                                  <div><strong>Attachments:</strong></div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {item.images.map((image, idx) => {
                                      const imageUrl = toAssetUrl(image.url || image.path);
                                      if (!imageUrl) return null;

                                      return (
                                        <a
                                          key={`${item._id}-img-${idx}`}
                                          href={imageUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="rounded border p-1 hover:bg-slate-50"
                                        >
                                          <img
                                            src={imageUrl}
                                            alt={image.originalName || `feedback-image-${idx + 1}`}
                                            className="h-24 w-full rounded object-cover"
                                          />
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!loading && items.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No feedback found
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {total > 0
                  ? `Showing ${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} of ${total}`
                  : "Showing 0 results"}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label>Show</Label>
                  <Select
                    value={String(limit)}
                    onValueChange={(value) => {
                      setLimit(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[85px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
