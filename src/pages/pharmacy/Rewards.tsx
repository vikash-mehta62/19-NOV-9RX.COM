import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, Star, Trophy, Zap, Crown, Sparkles,
  Lock, Clock, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { ReferralSection } from "@/components/rewards/ReferralSection";
import { BirthdaySection } from "@/components/rewards/BirthdaySection";

interface RewardItem {
  id: string;
  name: string;
  description: string;
  points_required: number;
  type: string;
  value: number;
  is_active: boolean;
}

interface RewardTier {
  id: string;
  name: string;
  min_points: number;
  color: string;
  benefits: string[];
  multiplier: number;
}

interface RewardTransaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface RewardsConfig {
  points_per_dollar: number;
  referral_bonus: number;
  review_bonus: number;
  birthday_bonus: number;
}

const Rewards = () => {
  const { toast } = useToast();
  const userProfile = useSelector(selectUserProfile);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  
  // User data
  const [currentPoints, setCurrentPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [currentTier, setCurrentTier] = useState<RewardTier | null>(null);
  const [nextTier, setNextTier] = useState<RewardTier | null>(null);
  
  // Config & rewards
  const [config, setConfig] = useState<RewardsConfig | null>(null);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [recentActivity, setRecentActivity] = useState<RewardTransaction[]>([]);

  useEffect(() => {
    if (userProfile?.id) {
      fetchData();
    }
  }, [userProfile?.id]);

  // Real-time subscription for points updates
  useEffect(() => {
    if (!userProfile?.id) return;

    // Subscribe to profile changes (for points updates)
    const profileChannel = supabase
      .channel(`profile-points-${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userProfile.id}`
        },
        (payload) => {
          console.log('Profile updated (real-time):', payload);
          const newData = payload.new as any;
          if (newData.reward_points !== undefined) {
            setCurrentPoints(newData.reward_points || 0);
          }
          if (newData.lifetime_reward_points !== undefined) {
            setLifetimePoints(newData.lifetime_reward_points || 0);
          }
          // Update tier based on new points
          if (tiers.length > 0 && newData.reward_points !== undefined) {
            updateTierFromPoints(newData.reward_points || 0);
          }
        }
      )
      .subscribe();

    // Subscribe to new reward transactions
    const transactionsChannel = supabase
      .channel(`reward-transactions-${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reward_transactions',
          filter: `user_id=eq.${userProfile.id}`
        },
        (payload) => {
          console.log('New transaction (real-time):', payload);
          const newTransaction = payload.new as RewardTransaction;
          setRecentActivity(prev => [newTransaction, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [userProfile?.id, tiers]);

  // Helper function to update tier based on points
  const updateTierFromPoints = (points: number) => {
    if (tiers.length === 0) return;
    
    let current = tiers[0];
    let next: RewardTier | null = null;
    
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (points >= tiers[i].min_points) {
        current = tiers[i];
        next = tiers[i + 1] || null;
        break;
      }
    }
    
    setCurrentTier(current);
    setNextTier(next);
  };

  // Set points from userProfile when it changes
  useEffect(() => {
    if (userProfile) {
      setCurrentPoints(userProfile.reward_points || 0);
      setLifetimePoints(userProfile.lifetime_reward_points || 0);
    }
  }, [userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = userProfile?.id;
      if (!userId) {
        console.log("No user ID found in userProfile");
        return;
      }

      console.log("Fetching rewards data for user:", userId);

      // Fetch fresh user points from database (not from Redux cache)
      const { data: freshProfile, error: profileError } = await supabase
        .from("profiles")
        .select("reward_points, lifetime_reward_points, reward_tier")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      if (freshProfile) {
        console.log("Fresh profile data:", freshProfile);
        setCurrentPoints(freshProfile.reward_points || 0);
        setLifetimePoints(freshProfile.lifetime_reward_points || 0);
      }

      const points = freshProfile?.reward_points || 0;

      // Fetch config
      const { data: configData } = await supabase
        .from("rewards_config")
        .select("*")
        .limit(1)
        .single();
      
      if (configData) {
        setConfig(configData);
      }

      // Fetch tiers
      const { data: tiersData } = await supabase
        .from("reward_tiers")
        .select("*")
        .order("min_points", { ascending: true });
      
      if (tiersData) {
        setTiers(tiersData);
        
        // Determine current and next tier
        let current = tiersData[0];
        let next: RewardTier | null = null;
        
        for (let i = tiersData.length - 1; i >= 0; i--) {
          if (points >= tiersData[i].min_points) {
            current = tiersData[i];
            next = tiersData[i + 1] || null;
            break;
          }
        }
        
        setCurrentTier(current);
        setNextTier(next);
      }

      // Fetch active rewards
      const { data: rewardsData } = await supabase
        .from("reward_items")
        .select("*")
        .eq("is_active", true)
        .order("points_required", { ascending: true });
      
      if (rewardsData) {
        setRewards(rewardsData);
      }

      // Fetch recent transactions
      const { data: transactionsData, error: transError } = await supabase
        .from("reward_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (transError) {
        console.error("Error fetching transactions:", transError);
      }
      
      if (transactionsData) {
        console.log("Fetched transactions:", transactionsData.length);
        setRecentActivity(transactionsData);
      } else {
        console.log("No transactions found for user:", userId);
      }
    } catch (error) {
      console.error("Error fetching rewards data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: RewardItem) => {
    if (currentPoints < reward.points_required) return;
    
    setRedeeming(reward.id);
    try {
      const userId = userProfile?.id;
      if (!userId) return;

      const newPoints = currentPoints - reward.points_required;

      // Update user points
      await supabase
        .from("profiles")
        .update({ reward_points: newPoints })
        .eq("id", userId);

      // Create redemption record with reward details for checkout use
      await supabase
        .from("reward_redemptions")
        .insert({
          user_id: userId,
          reward_item_id: reward.id,
          points_spent: reward.points_required,
          status: "pending", // Pending until used at checkout
          reward_type: reward.type, // Store type for checkout
          reward_value: reward.value, // Store value for checkout
          reward_name: reward.name, // Store name for display
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });

      // Log transaction
      await supabase
        .from("reward_transactions")
        .insert({
          user_id: userId,
          points: -reward.points_required,
          transaction_type: "redeem",
          description: `Redeemed: ${reward.name}`
        });

      setCurrentPoints(newPoints);
      toast({
        title: "Reward Redeemed! 🎉",
        description: `You've successfully redeemed "${reward.name}". It's now available to use at checkout!`,
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error redeeming reward:", error);
      toast({
        title: "Error",
        description: "Failed to redeem reward. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRedeeming(null);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      Bronze: "from-amber-600 to-orange-700",
      Silver: "from-gray-400 to-gray-600",
      Gold: "from-yellow-500 to-amber-600",
      Platinum: "from-indigo-500 to-purple-600",
    };
    return colors[tier] || colors.Bronze;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earn": return <Star className="w-4 h-4 text-green-600" />;
      case "redeem": return <Gift className="w-4 h-4 text-orange-600" />;
      case "bonus": return <Trophy className="w-4 h-4 text-purple-600" />;
      default: return <Star className="w-4 h-4 text-blue-600" />;
    }
  };

  const pointsToNextTier = nextTier ? nextTier.min_points - currentPoints : 0;
  const tierProgress = nextTier && currentTier
    ? ((currentPoints - currentTier.min_points) / (nextTier.min_points - currentTier.min_points)) * 100
    : 100;

  if (loading) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="w-6 h-6 text-pink-600" />
              Rewards & Points
            </h1>
            <p className="text-gray-500 mt-1">Earn points on every purchase and redeem for rewards</p>
          </div>
        </div>

        {/* Points Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Points */}
          <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white col-span-1 md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm">Available Points</p>
                  <h2 className="text-4xl font-bold mt-1">{currentPoints.toLocaleString()}</h2>
                  <p className="text-pink-200 text-sm mt-2">
                    Lifetime earned: {lifetimePoints.toLocaleString()} points
                  </p>
                </div>
                <div className="text-right">
                  {currentTier && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${getTierColor(currentTier.name)}`}>
                      <Crown className="w-5 h-5" />
                      <span className="font-bold">{currentTier.name} Member</span>
                    </div>
                  )}
                  {currentTier && (
                    <p className="text-pink-200 text-sm mt-2">
                      {currentTier.multiplier}x points on purchases
                    </p>
                  )}
                </div>
              </div>
              
              {/* Progress to next tier */}
              {nextTier && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-pink-100 mb-2">
                    <span>Progress to {nextTier.name}</span>
                    <span>{pointsToNextTier.toLocaleString()} points to go</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, tierProgress)}%` }}
                    />
                  </div>
                </div>
              )}
              {!nextTier && currentTier && (
                <div className="mt-6 text-center">
                  <p className="text-pink-100">🎉 You've reached the highest tier!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How to Earn */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                How to Earn
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Every $1 spent</span>
                  <Badge variant="secondary">+{config?.points_per_dollar || 1} point</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Refer a friend</span>
                  <Badge variant="secondary">+{config?.referral_bonus || 200} points</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Write a review</span>
                  <Badge variant="secondary">+{config?.review_bonus || 50} points</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Birthday bonus</span>
                  <Badge variant="secondary">+{config?.birthday_bonus || 100} points</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral & Birthday Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userProfile?.id && (
            <>
              <ReferralSection 
                userId={userProfile.id} 
                referralBonus={config?.referral_bonus || 200} 
              />
              <BirthdaySection 
                userId={userProfile.id} 
                birthdayBonus={config?.birthday_bonus || 100}
                onPointsUpdate={fetchData}
              />
            </>
          )}
        </div>

        {/* Available Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Available Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => {
                const canRedeem = currentPoints >= reward.points_required;
                const isRedeeming = redeeming === reward.id;
                return (
                  <div 
                    key={reward.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      canRedeem 
                        ? "border-blue-200 bg-blue-50 hover:border-blue-400" 
                        : "border-gray-200 bg-gray-50 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${canRedeem ? "bg-blue-100" : "bg-gray-200"}`}>
                        {canRedeem ? (
                          <Gift className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <Badge variant={canRedeem ? "default" : "secondary"} className={canRedeem ? "bg-blue-600 text-white" : ""}>
                        {reward.points_required.toLocaleString()} pts
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-gray-900">{reward.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                    <Button 
                      className={`w-full mt-4 ${canRedeem ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      disabled={!canRedeem || isRedeeming}
                      variant={canRedeem ? "default" : "secondary"}
                      onClick={() => handleRedeem(reward)}
                    >
                      {isRedeeming ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {canRedeem ? "Redeem Now" : `Need ${(reward.points_required - currentPoints).toLocaleString()} more`}
                    </Button>
                  </div>
                );
              })}
              {rewards.length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No rewards available at this time.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      activity.transaction_type === "earn" ? "bg-green-100" : 
                      activity.transaction_type === "redeem" ? "bg-orange-100" : "bg-purple-100"
                    }`}>
                      {getTransactionIcon(activity.transaction_type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${activity.points > 0 ? "text-white" : "text-orange-600"}`}>
                    {activity.points > 0 ? "+" : ""}{activity.points} pts
                  </span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No activity yet. Start earning points by placing orders!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Rewards;
