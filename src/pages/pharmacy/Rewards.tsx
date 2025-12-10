import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, Star, Trophy, Zap, Crown, Sparkles,
  Lock, Clock
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  category: string;
  available: boolean;
}

const Rewards = () => {
  const userProfile = useSelector((state: RootState) => state.user.profile);
  
  // Mock data - replace with actual API
  const currentPoints = 2450;
  const lifetimePoints = 8750;
  const tierLevel = "Gold";
  const nextTier = "Platinum";
  const pointsToNextTier = 5000 - currentPoints;
  const tierProgress = (currentPoints / 5000) * 100;

  const rewards: Reward[] = [
    { id: "1", name: "5% Off Next Order", description: "Get 5% discount on your next purchase", pointsRequired: 500, category: "discount", available: true },
    { id: "2", name: "Free Shipping", description: "Free shipping on any order", pointsRequired: 750, category: "shipping", available: true },
    { id: "3", name: "10% Off Next Order", description: "Get 10% discount on your next purchase", pointsRequired: 1000, category: "discount", available: true },
    { id: "4", name: "$25 Store Credit", description: "Add $25 credit to your account", pointsRequired: 2000, category: "credit", available: true },
    { id: "5", name: "Priority Support", description: "Get priority customer support for 30 days", pointsRequired: 3000, category: "service", available: false },
    { id: "6", name: "$50 Store Credit", description: "Add $50 credit to your account", pointsRequired: 4000, category: "credit", available: false },
  ];

  const recentActivity = [
    { id: "1", action: "Order Completed", points: 125, date: "Dec 10, 2024", type: "earned" },
    { id: "2", action: "Redeemed 5% Discount", points: -500, date: "Dec 8, 2024", type: "redeemed" },
    { id: "3", action: "Order Completed", points: 89, date: "Dec 5, 2024", type: "earned" },
    { id: "4", action: "Referral Bonus", points: 200, date: "Dec 1, 2024", type: "bonus" },
  ];

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      Bronze: "from-amber-600 to-orange-700",
      Silver: "from-gray-400 to-gray-600",
      Gold: "from-yellow-500 to-amber-600",
      Platinum: "from-indigo-500 to-purple-600",
    };
    return colors[tier] || colors.Bronze;
  };

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
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${getTierColor(tierLevel)}`}>
                    <Crown className="w-5 h-5" />
                    <span className="font-bold">{tierLevel} Member</span>
                  </div>
                </div>
              </div>
              
              {/* Progress to next tier */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-pink-100 mb-2">
                  <span>Progress to {nextTier}</span>
                  <span>{pointsToNextTier} points to go</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${tierProgress}%` }}
                  />
                </div>
              </div>
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
                  <Badge variant="secondary">+1 point</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Refer a friend</span>
                  <Badge variant="secondary">+200 points</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Write a review</span>
                  <Badge variant="secondary">+50 points</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Birthday bonus</span>
                  <Badge variant="secondary">+100 points</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
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
                const canRedeem = currentPoints >= reward.pointsRequired;
                return (
                  <div 
                    key={reward.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      canRedeem 
                        ? "border-emerald-200 bg-emerald-50 hover:border-emerald-400" 
                        : "border-gray-200 bg-gray-50 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${canRedeem ? "bg-emerald-100" : "bg-gray-200"}`}>
                        {canRedeem ? (
                          <Gift className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <Badge variant={canRedeem ? "default" : "secondary"} className={canRedeem ? "bg-emerald-600" : ""}>
                        {reward.pointsRequired.toLocaleString()} pts
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-gray-900">{reward.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                    <Button 
                      className={`w-full mt-4 ${canRedeem ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      disabled={!canRedeem}
                      variant={canRedeem ? "default" : "secondary"}
                    >
                      {canRedeem ? "Redeem Now" : `Need ${reward.pointsRequired - currentPoints} more`}
                    </Button>
                  </div>
                );
              })}
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
                      activity.type === "earned" ? "bg-green-100" : 
                      activity.type === "redeemed" ? "bg-orange-100" : "bg-purple-100"
                    }`}>
                      {activity.type === "earned" ? (
                        <Star className="w-4 h-4 text-green-600" />
                      ) : activity.type === "redeemed" ? (
                        <Gift className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Trophy className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.date}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${activity.points > 0 ? "text-green-600" : "text-orange-600"}`}>
                    {activity.points > 0 ? "+" : ""}{activity.points} pts
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Rewards;
