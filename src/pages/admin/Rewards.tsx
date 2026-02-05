"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/supabaseClient"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DashboardLayout } from "@/components/DashboardLayout"
import { useScreenSize } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Gift,
  Star,
  Users,
  Settings,
  Plus,
  Minus,
  Trash2,
  Search,
  Award,
  TrendingUp,
  DollarSign,
  Percent,
  Truck,
  Crown,
  Loader2,
  Save,
  UserPlus,
  RefreshCw
} from "lucide-react"

interface RewardTier {
  id: string
  name: string
  min_points: number
  color: string
  benefits: string[]
  multiplier: number
  display_order: number
}

interface RewardItem {
  id: string
  name: string
  description: string
  points_required: number
  type: "discount" | "shipping" | "credit" | "support"
  value: number
  is_active: boolean
}

interface RewardsConfig {
  id?: string
  program_enabled: boolean
  points_per_dollar: number
  referral_bonus: number
  review_bonus: number
  birthday_bonus: number
  point_redemption_value: number
}

const defaultTiers: RewardTier[] = [
  { id: "1", name: "Bronze", min_points: 0, color: "bg-amber-600", benefits: ["1 point per $1"], multiplier: 1, display_order: 1 },
  { id: "2", name: "Silver", min_points: 1000, color: "bg-gray-400", benefits: ["1.25x points", "Free shipping over $50"], multiplier: 1.25, display_order: 2 },
  { id: "3", name: "Gold", min_points: 5000, color: "bg-yellow-500", benefits: ["1.5x points", "Free shipping", "Priority support"], multiplier: 1.5, display_order: 3 },
  { id: "4", name: "Platinum", min_points: 10000, color: "bg-purple-600", benefits: ["2x points", "Free shipping", "Priority support", "Exclusive deals"], multiplier: 2, display_order: 4 },
]

export default function AdminRewards() {
  const { toast } = useToast()
  const screenSize = useScreenSize()
  const isMobile = screenSize === 'mobile'
  const isTablet = screenSize === 'tablet'
  const isCompact = isMobile || isTablet
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Config state
  const [config, setConfig] = useState<RewardsConfig>({
    program_enabled: true,
    points_per_dollar: 1,
    referral_bonus: 200,
    review_bonus: 50,
    birthday_bonus: 100,
    point_redemption_value: 0.01
  })
  
  // Data
  const [tiers, setTiers] = useState<RewardTier[]>(defaultTiers)
  const [rewards, setRewards] = useState<RewardItem[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [totalRedemptions, setTotalRedemptions] = useState(0)
  
  // Dialogs
  const [showAddReward, setShowAddReward] = useState(false)
  
  // New reward form
  const [newReward, setNewReward] = useState({
    name: "",
    description: "",
    points_required: 500,
    type: "discount" as const,
    value: 5
  })

  // Stats
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalPointsIssued: 0,
    totalRedemptions: 0,
    activeRewards: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch config
      const { data: configData, error: configError } = await supabase
        .from("rewards_config")
        .select("*")
        .limit(1)
        .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows gracefully
      
      if (configData) {
        setConfig(configData)
      } else if (!configError) {
        // No config exists yet, use defaults
        console.log("No rewards config found, using defaults")
      }

      // Fetch tiers
      const { data: tiersData } = await supabase
        .from("reward_tiers")
        .select("*")
        .order("display_order", { ascending: true })
      
      if (tiersData && tiersData.length > 0) {
        setTiers(tiersData)
      }

      // Fetch reward items
      const { data: rewardsData } = await supabase
        .from("reward_items")
        .select("*")
        .order("points_required", { ascending: true })
      
      if (rewardsData) {
        setRewards(rewardsData)
      }

      // Fetch users with reward points (only enrolled members)
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, company_name, email, reward_points, lifetime_reward_points, reward_tier")
        .not("reward_tier", "is", null)
        .order("reward_points", { ascending: false })

      setUsers(usersData || [])

      // Fetch redemption count
      const { count: redemptionCount } = await supabase
        .from("reward_redemptions")
        .select("*", { count: "exact", head: true })
      
      setTotalRedemptions(redemptionCount || 0)
      
      // Calculate stats
      const totalPoints = usersData?.reduce((sum, u) => sum + (u.reward_points || 0), 0) || 0
      setStats({
        totalMembers: usersData?.filter(u => (u.reward_points || 0) > 0).length || 0,
        totalPointsIssued: totalPoints,
        totalRedemptions: redemptionCount || 0,
        activeRewards: rewardsData?.filter(r => r.is_active).length || 0
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ title: "Error loading rewards data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      if (config.id) {
        await supabase
          .from("rewards_config")
          .update({
            program_enabled: config.program_enabled,
            points_per_dollar: config.points_per_dollar,
            referral_bonus: config.referral_bonus,
            review_bonus: config.review_bonus,
            birthday_bonus: config.birthday_bonus,
            point_redemption_value: config.point_redemption_value,
            updated_at: new Date().toISOString()
          })
          .eq("id", config.id)
      } else {
        const { data } = await supabase
          .from("rewards_config")
          .insert({
            program_enabled: config.program_enabled,
            points_per_dollar: config.points_per_dollar,
            referral_bonus: config.referral_bonus,
            review_bonus: config.review_bonus,
            birthday_bonus: config.birthday_bonus,
            point_redemption_value: config.point_redemption_value
          })
          .select()
          .single()
        
        if (data) setConfig(data)
      }
      toast({ title: "Settings saved successfully" })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({ title: "Error saving settings", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleAddReward = async () => {
    try {
      const { data, error } = await supabase
        .from("reward_items")
        .insert({
          name: newReward.name,
          description: newReward.description,
          points_required: newReward.points_required,
          type: newReward.type,
          value: newReward.value,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      setRewards([...rewards, data])
      setShowAddReward(false)
      setNewReward({ name: "", description: "", points_required: 500, type: "discount", value: 5 })
      toast({ title: "Reward added successfully" })
    } catch (error) {
      console.error("Error adding reward:", error)
      toast({ title: "Error adding reward", variant: "destructive" })
    }
  }

  const handleToggleReward = async (id: string, currentStatus: boolean) => {
    try {
      await supabase
        .from("reward_items")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
      
      setRewards(rewards.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r))
    } catch (error) {
      toast({ title: "Error updating reward", variant: "destructive" })
    }
  }

  const handleDeleteReward = async (id: string) => {
    try {
      await supabase.from("reward_items").delete().eq("id", id)
      setRewards(rewards.filter(r => r.id !== id))
      toast({ title: "Reward deleted" })
    } catch (error) {
      toast({ title: "Error deleting reward", variant: "destructive" })
    }
  }

  const handleAdjustPoints = async (userId: string, adjustment: number) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const newPoints = Math.max(0, (user.reward_points || 0) + adjustment)
    const newTier = getUserTier(newPoints)
    
    try {
      // Update user points
      await supabase
        .from("profiles")
        .update({ 
          reward_points: newPoints,
          reward_tier: newTier.name,
          lifetime_reward_points: adjustment > 0 
            ? (user.lifetime_reward_points || 0) + adjustment 
            : user.lifetime_reward_points
        })
        .eq("id", userId)

      // Log transaction
      await supabase
        .from("reward_transactions")
        .insert({
          user_id: userId,
          points: adjustment,
          transaction_type: adjustment > 0 ? "adjust" : "redeem",
          description: `Admin ${adjustment > 0 ? "added" : "deducted"} ${Math.abs(adjustment)} points`
        })
      
      toast({ title: `Points ${adjustment > 0 ? 'added' : 'deducted'} successfully` })
      
      // Update local state
      setUsers(users.map(u => u.id === userId ? { 
        ...u, 
        reward_points: newPoints,
        reward_tier: newTier.name
      } : u))
    } catch (error) {
      console.error("Error adjusting points:", error)
      toast({ title: "Error adjusting points", variant: "destructive" })
    }
  }

  const getUserTier = (points: number): RewardTier => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (points >= tiers[i].min_points) return tiers[i]
    }
    return tiers[0]
  }

  const filteredUsers = users.filter(u => 
    u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }


  return (
    <DashboardLayout role="admin">
      <div className={cn("space-y-6", isCompact && "space-y-4 p-4")}>
        {/* Header */}
        <div className={cn(
          "flex justify-between items-start gap-4",
          isCompact ? "flex-col space-y-4" : "items-center"
        )}>
          <div className={cn(isCompact && "text-center w-full")}>
            <h1 className={cn(
              "font-bold flex items-center gap-2",
              isCompact ? "text-xl justify-center" : "text-2xl"
            )}>
              <Gift className={cn("text-pink-500", isCompact ? "w-5 h-5" : "w-6 h-6")} />
              Rewards Program Management
            </h1>
            <p className={cn(
              "text-gray-500 mt-1",
              isCompact ? "text-sm" : ""
            )}>
              Manage loyalty program, tiers, and member rewards
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-3",
            isCompact ? "w-full flex-col space-y-3" : ""
          )}>
            <Button 
              variant="outline" 
              size={isCompact ? "default" : "sm"} 
              onClick={fetchData}
              className={cn(isCompact && "w-full")}
            >
              <RefreshCw className={cn("mr-2", isCompact ? "w-4 h-4" : "w-4 h-4")} /> 
              Refresh
            </Button>
            <div className={cn(
              "flex items-center gap-2",
              isCompact ? "w-full justify-between bg-gray-50 p-3 rounded-lg" : ""
            )}>
              <span className={cn("text-gray-600", isCompact ? "text-sm font-medium" : "text-sm")}>
                Program Status:
              </span>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={config.program_enabled} 
                  onCheckedChange={(v) => setConfig({...config, program_enabled: v})} 
                />
                <Badge className={cn(
                  config.program_enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                  isCompact && "px-3 py-1"
                )}>
                  {config.program_enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={cn(
          "grid gap-4",
          isCompact ? "grid-cols-2" : "grid-cols-4"
        )}>
          <Card className={cn(isCompact && "shadow-md")}>
            <CardContent className={cn("p-4", isCompact && "p-3")}>
              <div className={cn("flex items-center gap-3", isCompact && "gap-2")}>
                <div className={cn("p-2 bg-blue-100 rounded-lg", isCompact && "p-1.5")}>
                  <Users className={cn("text-blue-600", isCompact ? "w-4 h-4" : "w-5 h-5")} />
                </div>
                <div>
                  <p className={cn("font-bold", isCompact ? "text-lg" : "text-2xl")}>
                    {stats.totalMembers}
                  </p>
                  <p className={cn("text-gray-500", isCompact ? "text-xs" : "text-xs")}>
                    Total Members
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={cn(isCompact && "shadow-md")}>
            <CardContent className={cn("p-4", isCompact && "p-3")}>
              <div className={cn("flex items-center gap-3", isCompact && "gap-2")}>
                <div className={cn("p-2 bg-blue-100 rounded-lg", isCompact && "p-1.5")}>
                  <Star className={cn("text-blue-600", isCompact ? "w-4 h-4" : "w-5 h-5")} />
                </div>
                <div>
                  <p className={cn("font-bold", isCompact ? "text-lg" : "text-2xl")}>
                    {stats.totalPointsIssued.toLocaleString()}
                  </p>
                  <p className={cn("text-gray-500", isCompact ? "text-xs" : "text-xs")}>
                    Points Issued
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={cn(isCompact && "shadow-md")}>
            <CardContent className={cn("p-4", isCompact && "p-3")}>
              <div className={cn("flex items-center gap-3", isCompact && "gap-2")}>
                <div className={cn("p-2 bg-purple-100 rounded-lg", isCompact && "p-1.5")}>
                  <Award className={cn("text-purple-600", isCompact ? "w-4 h-4" : "w-5 h-5")} />
                </div>
                <div>
                  <p className={cn("font-bold", isCompact ? "text-lg" : "text-2xl")}>
                    {stats.totalRedemptions}
                  </p>
                  <p className={cn("text-gray-500", isCompact ? "text-xs" : "text-xs")}>
                    Redemptions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={cn(isCompact && "shadow-md")}>
            <CardContent className={cn("p-4", isCompact && "p-3")}>
              <div className={cn("flex items-center gap-3", isCompact && "gap-2")}>
                <div className={cn("p-2 bg-orange-100 rounded-lg", isCompact && "p-1.5")}>
                  <Gift className={cn("text-orange-600", isCompact ? "w-4 h-4" : "w-5 h-5")} />
                </div>
                <div>
                  <p className={cn("font-bold", isCompact ? "text-lg" : "text-2xl")}>
                    {stats.activeRewards}
                  </p>
                  <p className={cn("text-gray-500", isCompact ? "text-xs" : "text-xs")}>
                    Active Rewards
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={cn(
            isCompact 
              ? "w-full grid grid-cols-3 h-auto" 
              : ""
          )}>
            <TabsTrigger 
              value="overview" 
              className={cn(isCompact && "text-xs py-2 px-2")}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className={cn(isCompact && "text-xs py-2 px-2")}
            >
              Rewards
            </TabsTrigger>
            <TabsTrigger 
              value="tiers" 
              className={cn(isCompact && "text-xs py-2 px-2")}
            >
              Tiers
            </TabsTrigger>
            {!isCompact && (
              <>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </>
            )}
          </TabsList>
          
          {/* Mobile: Additional tabs in dropdown or separate row */}
          {isCompact && (
            <div className="mt-2">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="members" className="text-xs py-2 px-2">
                  Members
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs py-2 px-2">
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className={cn(
              "grid gap-4",
              isCompact ? "grid-cols-1 space-y-4" : "grid-cols-2"
            )}>
              <Card className={cn(isCompact && "shadow-md")}>
                <CardHeader className={cn(isCompact && "pb-3")}>
                  <CardTitle className={cn(
                    "flex items-center gap-2",
                    isCompact ? "text-base" : "text-lg"
                  )}>
                    <TrendingUp className={cn("text-blue-600", isCompact ? "w-4 h-4" : "w-5 h-5")} />
                    How Members Earn Points
                  </CardTitle>
                </CardHeader>
                <CardContent className={cn("space-y-3", isCompact && "space-y-2")}>
                  <div className={cn(
                    "flex items-center justify-between p-3 bg-gray-50 rounded-lg",
                    isCompact && "p-2"
                  )}>
                    <span className={cn(isCompact && "text-sm")}>Every $1 spent</span>
                    <Badge className="bg-blue-100 text-blue-700">
                      +{config.points_per_dollar} point
                    </Badge>
                  </div>
                  <div className={cn(
                    "flex items-center justify-between p-3 bg-gray-50 rounded-lg",
                    isCompact && "p-2"
                  )}>
                    <span className={cn(isCompact && "text-sm")}>Refer a friend</span>
                    <Badge className="bg-blue-100 text-blue-700">
                      +{config.referral_bonus} points
                    </Badge>
                  </div>
                  <div className={cn(
                    "flex items-center justify-between p-3 bg-gray-50 rounded-lg",
                    isCompact && "p-2"
                  )}>
                    <span className={cn(isCompact && "text-sm")}>Write a review</span>
                    <Badge className="bg-purple-100 text-purple-700">
                      +{config.review_bonus} points
                    </Badge>
                  </div>
                  <div className={cn(
                    "flex items-center justify-between p-3 bg-gray-50 rounded-lg",
                    isCompact && "p-2"
                  )}>
                    <span className={cn(isCompact && "text-sm")}>Birthday bonus</span>
                    <Badge className="bg-pink-100 text-pink-700">
                      +{config.birthday_bonus} points
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(isCompact && "shadow-md")}>
                <CardHeader className={cn(isCompact && "pb-3")}>
                  <CardTitle className={cn(
                    "flex items-center gap-2",
                    isCompact ? "text-base" : "text-lg"
                  )}>
                    <Crown className={cn("text-yellow-500", isCompact ? "w-4 h-4" : "w-5 h-5")} />
                    Membership Tiers
                  </CardTitle>
                </CardHeader>
                <CardContent className={cn("space-y-3", isCompact && "space-y-2")}>
                  {tiers.map(tier => (
                    <div 
                      key={tier.id} 
                      className={cn(
                        "flex items-center justify-between p-3 bg-gray-50 rounded-lg",
                        isCompact && "p-2"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                        <span className={cn("font-medium", isCompact && "text-sm")}>
                          {tier.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-medium", isCompact ? "text-xs" : "text-sm")}>
                          {tier.min_points.toLocaleString()}+ pts
                        </p>
                        <p className={cn("text-gray-500", isCompact ? "text-xs" : "text-xs")}>
                          {tier.multiplier}x multiplier
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <div className={cn(
              "flex justify-between items-center",
              isCompact && "flex-col gap-3 items-stretch"
            )}>
              <h3 className={cn(
                "font-semibold",
                isCompact ? "text-center text-base" : ""
              )}>
                Available Rewards ({rewards.length})
              </h3>
              <Dialog open={showAddReward} onOpenChange={setShowAddReward}>
                <DialogTrigger asChild>
                  <Button className={cn(
                    "bg-blue-600 hover:bg-blue-700",
                    isCompact && "w-full"
                  )}>
                    <Plus className="w-4 h-4 mr-2" /> Add Reward
                  </Button>
                </DialogTrigger>
                <DialogContent className={cn(isCompact && "w-[95vw] max-w-none")}>
                  <DialogHeader>
                    <DialogTitle>Add New Reward</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Reward Name</Label>
                      <Input value={newReward.name} onChange={e => setNewReward({...newReward, name: e.target.value})} placeholder="e.g., 15% Off Next Order" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={newReward.description} onChange={e => setNewReward({...newReward, description: e.target.value})} placeholder="Brief description" />
                    </div>
                    <div className={cn("grid gap-4", isCompact ? "grid-cols-1" : "grid-cols-2")}>
                      <div>
                        <Label>Points Required</Label>
                        <Input type="number" value={newReward.points_required} onChange={e => setNewReward({...newReward, points_required: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={newReward.type} onValueChange={(v: any) => setNewReward({...newReward, type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="discount">Discount %</SelectItem>
                            <SelectItem value="shipping">Free Shipping</SelectItem>
                            <SelectItem value="credit">Store Credit $</SelectItem>
                            <SelectItem value="support">Priority Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Value ({newReward.type === "credit" ? "$" : newReward.type === "discount" ? "%" : "days"})</Label>
                      <Input type="number" value={newReward.value} onChange={e => setNewReward({...newReward, value: parseInt(e.target.value) || 0})} />
                    </div>
                    <Button onClick={handleAddReward} className="w-full bg-blue-600" disabled={!newReward.name}>
                      Add Reward
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className={cn(
              "grid gap-4",
              isCompact ? "grid-cols-1" : "grid-cols-3"
            )}>
              {rewards.map(reward => (
                <Card key={reward.id} className={cn(
                  !reward.is_active ? "opacity-50" : "",
                  isCompact && "shadow-md"
                )}>
                  <CardContent className={cn("p-4", isCompact && "p-3")}>
                    <div className={cn(
                      "flex items-start justify-between mb-3",
                      isCompact && "mb-2"
                    )}>
                      <div className={cn(
                        "p-2 rounded-lg",
                        isCompact && "p-1.5",
                        reward.type === "discount" ? "bg-green-100" : 
                        reward.type === "shipping" ? "bg-blue-100" : 
                        reward.type === "credit" ? "bg-purple-100" : "bg-orange-100"
                      )}>
                        {reward.type === "discount" ? <Percent className={cn("text-green-600", isCompact ? "w-4 h-4" : "w-5 h-5")} /> :
                         reward.type === "shipping" ? <Truck className={cn("text-blue-600", isCompact ? "w-4 h-4" : "w-5 h-5")} /> :
                         reward.type === "credit" ? <DollarSign className={cn("text-purple-600", isCompact ? "w-4 h-4" : "w-5 h-5")} /> :
                         <Star className={cn("text-orange-600", isCompact ? "w-4 h-4" : "w-5 h-5")} />}
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        {reward.points_required} pts
                      </Badge>
                    </div>
                    <h4 className={cn("font-semibold mb-1", isCompact && "text-sm")}>
                      {reward.name}
                    </h4>
                    <p className={cn("text-gray-500 mb-3", isCompact ? "text-xs mb-2" : "text-sm")}>
                      {reward.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Switch checked={reward.is_active} onCheckedChange={() => handleToggleReward(reward.id, reward.is_active)} />
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteReward(reward.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rewards.length === 0 && (
                <div className={cn(
                  "text-center py-8 text-gray-500",
                  isCompact ? "col-span-1" : "col-span-3"
                )}>
                  No rewards configured yet. Click "Add Reward" to create one.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers" className="space-y-4">
            <div className={cn(
              "grid gap-4",
              isCompact ? "grid-cols-1 space-y-4" : "grid-cols-4"
            )}>
              {tiers.map(tier => (
                <Card key={tier.id} className={cn(isCompact && "shadow-lg")}>
                  <CardHeader className={cn(
                    `${tier.color} text-white rounded-t-lg`,
                    isCompact && "p-4"
                  )}>
                    <CardTitle className={cn(
                      "flex items-center gap-2",
                      isCompact ? "text-lg justify-center" : ""
                    )}>
                      <Crown className={cn(isCompact ? "w-5 h-5" : "w-5 h-5")} />
                      {tier.name}
                    </CardTitle>
                    <CardDescription className={cn(
                      "text-white/80",
                      isCompact ? "text-center text-base font-medium" : ""
                    )}>
                      {tier.min_points.toLocaleString()}+ points
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={cn("p-4", isCompact && "p-4")}>
                    <div className={cn(
                      "text-center mb-4",
                      isCompact && "mb-3"
                    )}>
                      <p className={cn(
                        "font-bold mb-1",
                        isCompact ? "text-2xl" : "text-lg"
                      )}>
                        {tier.multiplier}x Points
                      </p>
                      <p className={cn(
                        "text-gray-600",
                        isCompact ? "text-sm" : "text-xs"
                      )}>
                        Earning multiplier
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className={cn(
                        "font-semibold text-gray-800 mb-2",
                        isCompact ? "text-sm" : "text-xs"
                      )}>
                        Benefits:
                      </h4>
                      <ul className={cn("space-y-2", isCompact && "space-y-1.5")}>
                        {tier.benefits?.map((benefit, i) => (
                          <li key={i} className={cn(
                            "flex items-start gap-2",
                            isCompact ? "text-sm" : "text-sm"
                          )}>
                            <Star className={cn(
                              "text-yellow-500 flex-shrink-0 mt-0.5",
                              isCompact ? "w-3.5 h-3.5" : "w-3 h-3"
                            )} />
                            <span className="text-gray-700">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {isCompact && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Required Points:</span>
                          <span className="font-semibold text-gray-800">
                            {tier.min_points.toLocaleString()}+
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Mobile: Additional tier information */}
            {isCompact && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      How Tiers Work
                    </h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Your tier is automatically upgraded based on your total reward points. 
                      Higher tiers earn more points and unlock exclusive benefits.
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white rounded-lg p-2 border border-blue-200">
                        <div className="font-medium text-blue-900">Automatic Upgrades</div>
                        <div className="text-blue-700">Based on points earned</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-blue-200">
                        <div className="font-medium text-blue-900">Lifetime Benefits</div>
                        <div className="text-blue-700">Keep tier benefits</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className={cn(
              "flex justify-between items-center",
              isCompact && "flex-col gap-3 items-stretch"
            )}>
              <div className={cn("relative", isCompact ? "w-full" : "w-64")}>
                <Search className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",
                  isCompact ? "w-4 h-4" : "w-4 h-4"
                )} />
                <Input 
                  placeholder="Search members..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className={cn(
                    "pl-9",
                    isCompact && "h-12 text-base"
                  )}
                />
              </div>
              <p className={cn(
                "text-gray-500",
                isCompact ? "text-center text-sm" : "text-sm"
              )}>
                {filteredUsers.length} users
              </p>
            </div>

            {isCompact ? (
              /* Mobile: Card Layout */
              <div className="space-y-3">
                {filteredUsers.slice(0, 50).map(user => {
                  const tier = getUserTier(user.reward_points || 0)
                  return (
                    <Card key={user.id} className="shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base truncate">
                              {user.first_name} {user.last_name || user.company_name}
                            </h3>
                            <p className="text-sm text-gray-500 truncate mt-0.5">
                              {user.email}
                            </p>
                          </div>
                          <Badge className={`${tier.color} text-white flex-shrink-0 ml-2`}>
                            {tier.name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {(user.reward_points || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Points</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-800">
                              {tier.multiplier}x
                            </p>
                            <p className="text-xs text-gray-500">Multiplier</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAdjustPoints(user.id, 100)} 
                            className="flex-1"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add 100
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAdjustPoints(user.id, -100)}
                            className="flex-1"
                          >
                            <Minus className="w-4 h-4 mr-1" />
                            Remove 100
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No members found</p>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: Table Layout */
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.slice(0, 50).map(user => {
                      const tier = getUserTier(user.reward_points || 0)
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.first_name} {user.last_name || user.company_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <span className="font-bold text-blue-600">{(user.reward_points || 0).toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${tier.color} text-white`}>{tier.name}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => handleAdjustPoints(user.id, 100)} title="Add 100 points">
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleAdjustPoints(user.id, -100)} title="Remove 100 points">
                                <Minus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className={cn(isCompact && "shadow-md")}>
              <CardHeader className={cn(isCompact && "pb-3")}>
                <CardTitle className={cn(
                  "flex items-center gap-2",
                  isCompact ? "text-base" : ""
                )}>
                  <Settings className={cn(isCompact ? "w-4 h-4" : "w-5 h-5")} />
                  Earning Rules Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className={cn("space-y-4", isCompact && "space-y-3")}>
                <div className={cn(
                  "grid gap-4",
                  isCompact ? "grid-cols-1" : "grid-cols-2"
                )}>
                  <div>
                    <Label className={cn(isCompact && "text-sm font-medium")}>
                      Points per $1 spent
                    </Label>
                    <Input 
                      type="number" 
                      value={config.points_per_dollar} 
                      onChange={e => setConfig({...config, points_per_dollar: parseInt(e.target.value) || 1})}
                      className={cn(isCompact && "h-12 text-base")}
                    />
                    {isCompact && (
                      <p className="text-xs text-gray-500 mt-1">
                        How many points customers earn per dollar spent
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label className={cn(isCompact && "text-sm font-medium")}>
                      Referral Bonus (points)
                    </Label>
                    <Input 
                      type="number" 
                      value={config.referral_bonus} 
                      onChange={e => setConfig({...config, referral_bonus: parseInt(e.target.value) || 0})}
                      className={cn(isCompact && "h-12 text-base")}
                    />
                    {isCompact && (
                      <p className="text-xs text-gray-500 mt-1">
                        Points awarded for successful referrals
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label className={cn(isCompact && "text-sm font-medium")}>
                      Review Bonus (points)
                    </Label>
                    <Input 
                      type="number" 
                      value={config.review_bonus} 
                      onChange={e => setConfig({...config, review_bonus: parseInt(e.target.value) || 0})}
                      className={cn(isCompact && "h-12 text-base")}
                    />
                    {isCompact && (
                      <p className="text-xs text-gray-500 mt-1">
                        Points for writing product reviews
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label className={cn(isCompact && "text-sm font-medium")}>
                      Birthday Bonus (points)
                    </Label>
                    <Input 
                      type="number" 
                      value={config.birthday_bonus} 
                      onChange={e => setConfig({...config, birthday_bonus: parseInt(e.target.value) || 0})}
                      className={cn(isCompact && "h-12 text-base")}
                    />
                    {isCompact && (
                      <p className="text-xs text-gray-500 mt-1">
                        Special birthday points bonus
                      </p>
                    )}
                  </div>
                  
                  <div className={cn(isCompact && "col-span-1")}>
                    <Label className={cn(isCompact && "text-sm font-medium")}>
                      Point Redemption Value ($)
                    </Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      value={config.point_redemption_value} 
                      onChange={e => setConfig({...config, point_redemption_value: parseFloat(e.target.value) || 0.01})}
                      className={cn(isCompact && "h-12 text-base")}
                    />
                    <p className={cn(
                      "text-gray-500 mt-1",
                      isCompact ? "text-xs" : "text-xs"
                    )}>
                      Dollar value per point when redeeming (e.g., 0.01 = 100 points = $1)
                    </p>
                  </div>
                </div>
                
                {isCompact && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <h4 className="font-medium text-blue-900 text-sm mb-2">
                      💡 Configuration Tips
                    </h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Higher point values encourage more engagement</li>
                      <li>• Referral bonuses should be significant to motivate sharing</li>
                      <li>• Review bonuses help build product credibility</li>
                      <li>• Birthday bonuses create special moments for customers</li>
                    </ul>
                  </div>
                )}
                
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving} 
                  className={cn(
                    "bg-blue-600",
                    isCompact ? "w-full h-12 text-base" : ""
                  )}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
