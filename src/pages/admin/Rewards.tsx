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
import { DashboardLayout } from "@/components/DashboardLayout"
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
}

const defaultTiers: RewardTier[] = [
  { id: "1", name: "Bronze", min_points: 0, color: "bg-amber-600", benefits: ["1 point per $1"], multiplier: 1, display_order: 1 },
  { id: "2", name: "Silver", min_points: 1000, color: "bg-gray-400", benefits: ["1.25x points", "Free shipping over $50"], multiplier: 1.25, display_order: 2 },
  { id: "3", name: "Gold", min_points: 5000, color: "bg-yellow-500", benefits: ["1.5x points", "Free shipping", "Priority support"], multiplier: 1.5, display_order: 3 },
  { id: "4", name: "Platinum", min_points: 10000, color: "bg-purple-600", benefits: ["2x points", "Free shipping", "Priority support", "Exclusive deals"], multiplier: 2, display_order: 4 },
]

export default function AdminRewards() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Config state
  const [config, setConfig] = useState<RewardsConfig>({
    program_enabled: true,
    points_per_dollar: 1,
    referral_bonus: 200,
    review_bonus: 50,
    birthday_bonus: 100
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
      const { data: configData } = await supabase
        .from("rewards_config")
        .select("*")
        .limit(1)
        .single()
      
      if (configData) {
        setConfig(configData)
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
            birthday_bonus: config.birthday_bonus
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
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </DashboardLayout>
    )
  }


  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6 text-pink-500" />
              Rewards Program Management
            </h1>
            <p className="text-gray-500">Manage loyalty program, tiers, and member rewards</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Program Status:</span>
              <Switch 
                checked={config.program_enabled} 
                onCheckedChange={(v) => setConfig({...config, program_enabled: v})} 
              />
              <Badge className={config.program_enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {config.program_enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  <p className="text-xs text-gray-500">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Star className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPointsIssued.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Points Issued</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalRedemptions}</p>
                  <p className="text-xs text-gray-500">Redemptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Gift className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeRewards}</p>
                  <p className="text-xs text-gray-500">Active Rewards</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="tiers">Tiers</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    How Members Earn Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Every $1 spent</span>
                    <Badge className="bg-emerald-100 text-emerald-700">+{config.points_per_dollar} point</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Refer a friend</span>
                    <Badge className="bg-blue-100 text-blue-700">+{config.referral_bonus} points</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Write a review</span>
                    <Badge className="bg-purple-100 text-purple-700">+{config.review_bonus} points</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Birthday bonus</span>
                    <Badge className="bg-pink-100 text-pink-700">+{config.birthday_bonus} points</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Membership Tiers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tiers.map(tier => (
                    <div key={tier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                        <span className="font-medium">{tier.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{tier.min_points.toLocaleString()}+ pts</p>
                        <p className="text-xs text-gray-500">{tier.multiplier}x multiplier</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Available Rewards ({rewards.length})</h3>
              <Dialog open={showAddReward} onOpenChange={setShowAddReward}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" /> Add Reward
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <Button onClick={handleAddReward} className="w-full bg-emerald-600" disabled={!newReward.name}>
                      Add Reward
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {rewards.map(reward => (
                <Card key={reward.id} className={!reward.is_active ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${reward.type === "discount" ? "bg-green-100" : reward.type === "shipping" ? "bg-blue-100" : reward.type === "credit" ? "bg-purple-100" : "bg-orange-100"}`}>
                        {reward.type === "discount" ? <Percent className="w-5 h-5 text-green-600" /> :
                         reward.type === "shipping" ? <Truck className="w-5 h-5 text-blue-600" /> :
                         reward.type === "credit" ? <DollarSign className="w-5 h-5 text-purple-600" /> :
                         <Star className="w-5 h-5 text-orange-600" />}
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">{reward.points_required} pts</Badge>
                    </div>
                    <h4 className="font-semibold mb-1">{reward.name}</h4>
                    <p className="text-sm text-gray-500 mb-3">{reward.description}</p>
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
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No rewards configured yet. Click "Add Reward" to create one.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers" className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {tiers.map(tier => (
                <Card key={tier.id}>
                  <CardHeader className={`${tier.color} text-white rounded-t-lg`}>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      {tier.name}
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      {tier.min_points.toLocaleString()}+ points
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-lg font-bold mb-3">{tier.multiplier}x Points</p>
                    <ul className="space-y-2">
                      {tier.benefits?.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <p className="text-sm text-gray-500">{filteredUsers.length} users</p>
            </div>

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
                          <span className="font-bold text-emerald-600">{(user.reward_points || 0).toLocaleString()}</span>
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Earning Rules Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Points per $1 spent</Label>
                    <Input type="number" value={config.points_per_dollar} onChange={e => setConfig({...config, points_per_dollar: parseInt(e.target.value) || 1})} />
                  </div>
                  <div>
                    <Label>Referral Bonus (points)</Label>
                    <Input type="number" value={config.referral_bonus} onChange={e => setConfig({...config, referral_bonus: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <Label>Review Bonus (points)</Label>
                    <Input type="number" value={config.review_bonus} onChange={e => setConfig({...config, review_bonus: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <Label>Birthday Bonus (points)</Label>
                    <Input type="number" value={config.birthday_bonus} onChange={e => setConfig({...config, birthday_bonus: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <Button onClick={handleSaveSettings} disabled={saving} className="bg-emerald-600">
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
