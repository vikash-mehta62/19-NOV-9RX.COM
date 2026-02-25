import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart, Mail, Eye, CheckCircle, Clock, DollarSign,
  TrendingUp, AlertCircle, RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AbandonedCart {
  id: string;
  user_id: string;
  cart_data: any;
  cart_value: number;
  item_count: number;
  reminder_sent_count: number;
  last_reminder_at: string | null;
  recovered: boolean;
  recovered_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    business_name: string;
  };
}

export default function AbandonedCarts() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAbandonedCarts();
  }, []);

  const fetchAbandonedCarts = async () => {
    try {
      // Fetch active carts that haven't been updated in the last 1 minute (for testing purposes)
      // This replaces the separate abandoned_carts table to avoid duplication
      const cutoffTime = new Date(Date.now() - 1 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("carts")
        .select(`
          *,
          user:profiles!user_id (
            email,
            company_name
          )
        `)
        .eq("status", "active")
        .lt("updated_at", cutoffTime)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Map carts to AbandonedCart interface and filter out empty carts
      const mappedCarts: AbandonedCart[] = (data || [])
        .map((cart: any) => {
          // Calculate correct cart total from items
          let calculatedTotal = 0;
          if (cart.items && Array.isArray(cart.items)) {
            cart.items.forEach((item: any) => {
              if (item.sizes && Array.isArray(item.sizes)) {
                item.sizes.forEach((size: any) => {
                  calculatedTotal += (size.quantity || 0) * (size.price || 0);
                });
              } else {
                calculatedTotal += (item.quantity || 0) * (item.price || 0);
              }
            });
          }

          return {
            id: cart.id,
            user_id: cart.user_id,
            cart_data: { items: cart.items },
            cart_value: calculatedTotal,
            item_count: cart.items?.length || 0,
            reminder_sent_count: cart.reminder_sent_count || 0,
            last_reminder_at: cart.abandoned_email_sent_at,
            recovered: cart.recovery_status === 'recovered',
            recovered_at: null,
            created_at: cart.created_at,
            updated_at: cart.updated_at,
            user: cart.user ? {
              email: cart.user.email,
              business_name: cart.user.company_name
            } : undefined
          };
        })
        .filter((cart) => cart.item_count > 0); // Only show carts with items

      setCarts(mappedCarts);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (cart: AbandonedCart) => {
    try {
      // Call server API to send email
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';
      const response = await fetch(`${apiBaseUrl}/api/cart/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cart.id })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send reminder');
      }

      toast({
        title: "Reminder Sent",
        description: data.message || `Cart recovery email sent to ${cart.user?.email || "user"}`,
      });
      
      await fetchAbandonedCarts();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send reminder email", 
        variant: "destructive" 
      });
    }
  };

  const markAsRecovered = async (cartId: string) => {
    try {
      const { error } = await supabase
        .from("carts")
        .update({
          recovery_status: 'recovered',
        })
        .eq("id", cartId);

      if (error) {
        console.error("Error marking cart as recovered:", error);
        throw error;
      }

      toast({ title: "Success", description: "Cart marked as recovered" });
      setDetailsOpen(false); // Close the dialog
      await fetchAbandonedCarts(); // Refresh the list
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to mark cart as recovered", 
        variant: "destructive" 
      });
    }
  };

  const viewDetails = (cart: AbandonedCart) => {
    setSelectedCart(cart);
    setDetailsOpen(true);
  };

  const stats = {
    total: carts.length,
    pending: carts.filter((c) => !c.recovered && c.reminder_sent_count === 0).length,
    reminded: carts.filter((c) => !c.recovered && c.reminder_sent_count > 0).length,
    recovered: carts.filter((c) => c.recovered).length,
    totalValue: carts.filter((c) => !c.recovered).reduce((sum, c) => sum + (c.cart_value || 0), 0),
    recoveredValue: carts.filter((c) => c.recovered).reduce((sum, c) => sum + (c.cart_value || 0), 0),
  };

  const recoveryRate = stats.total > 0 ? ((stats.recovered / stats.total) * 100).toFixed(1) : 0;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Abandoned Carts</h1>
            <p className="text-muted-foreground">Track and recover abandoned shopping carts</p>
          </div>
          <Button onClick={fetchAbandonedCarts} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-muted-foreground">Total Carts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.reminded}</div>
              <p className="text-muted-foreground">Reminded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.recovered}</div>
              <p className="text-muted-foreground">Recovered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">${stats.totalValue.toFixed(2)}</div>
              <p className="text-muted-foreground">At Risk</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{recoveryRate}%</div>
              <p className="text-muted-foreground">Recovery Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Cart Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cart Details</DialogTitle>
            </DialogHeader>
            {selectedCart && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedCart.user?.business_name || "Unknown"}</p>
                    <p className="text-sm">{selectedCart.user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cart Value</p>
                    <p className="font-medium text-xl">${selectedCart.cart_value?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Abandoned</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(selectedCart.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reminders Sent</p>
                    <p className="font-medium">{selectedCart.reminder_sent_count}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Cart Items ({selectedCart.item_count})</p>
                  <div className="bg-muted rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {selectedCart.cart_data?.items?.map((item: any, index: number) => {
                      if (item.sizes && Array.isArray(item.sizes)) {
                        // Item has sizes
                        return item.sizes.map((size: any, sizeIndex: number) => (
                          <div key={`${index}-${sizeIndex}`} className="flex justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="font-medium">{item.name || item.product_name} - {size.size_value || ''}</p>
                              <p className="text-sm text-muted-foreground">Qty: {size.quantity}</p>
                            </div>
                            <p className="font-medium">${((size.price || 0) * (size.quantity || 0)).toFixed(2)}</p>
                          </div>
                        ));
                      } else {
                        // Simple item structure
                        return (
                          <div key={index} className="flex justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="font-medium">{item.name || item.product_name}</p>
                              <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <p className="font-medium">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                          </div>
                        );
                      }
                    }) || <p className="text-muted-foreground">No items data available</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!selectedCart.recovered && (
                    <>
                      <Button onClick={() => sendReminder(selectedCart)}>
                        <Mail className="mr-2 h-4 w-4" /> Send Reminder
                      </Button>
                      <Button variant="outline" onClick={() => markAsRecovered(selectedCart.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Mark Recovered
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Abandoned Carts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : carts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No abandoned carts found. Great news!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Abandoned</TableHead>
                    <TableHead>Reminders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carts.map((cart) => (
                    <TableRow key={cart.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cart.user?.business_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{cart.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{cart.item_count} items</TableCell>
                      <TableCell className="font-medium">${cart.cart_value?.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(cart.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cart.reminder_sent_count > 0 ? "default" : "secondary"}>
                          {cart.reminder_sent_count} sent
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cart.recovered ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" /> Recovered
                          </Badge>
                        ) : cart.reminder_sent_count > 0 ? (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Mail className="h-3 w-3 mr-1" /> Reminded
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <AlertCircle className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewDetails(cart)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!cart.recovered && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendReminder(cart)}
                              title="Send Reminder"
                            >
                              <Mail className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
