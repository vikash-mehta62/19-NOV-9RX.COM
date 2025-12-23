import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Copy, Check, Share2, Gift } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getUserReferralCode, getReferralStats } from "@/services/referralService"

interface ReferralSectionProps {
  userId: string
  referralBonus: number
}

export const ReferralSection = ({ userId, referralBonus }: ReferralSectionProps) => {
  const { toast } = useToast()
  const [referralCode, setReferralCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({
    referralCount: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
    totalPointsEarned: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const code = await getUserReferralCode(userId)
        if (code) setReferralCode(code)

        const referralStats = await getReferralStats(userId)
        if (referralStats) {
          setStats({
            referralCount: referralStats.referralCount,
            pendingReferrals: referralStats.pendingReferrals,
            completedReferrals: referralStats.completedReferrals,
            totalPointsEarned: referralStats.totalPointsEarned
          })
        }
      } catch (error) {
        console.error("Error fetching referral data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchData()
  }, [userId])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard"
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive"
      })
    }
  }

  const shareReferral = async () => {
    const shareText = `Join me on 9RX and get ${referralBonus} bonus points on your first order! Use my referral code: ${referralCode}`
    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join 9RX",
          text: shareText,
          url: shareUrl
        })
      } catch (error) {
        // User cancelled or share failed
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Refer a Friend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Code */}
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Share your code and you'll both earn <span className="font-bold text-blue-600">+{referralBonus} points</span> when they make their first purchase!
          </p>
          <div className="flex gap-2">
            <Input
              value={referralCode}
              readOnly
              className="font-mono text-lg font-bold text-center bg-white"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              onClick={shareReferral}
              className="shrink-0 bg-blue-600 hover:bg-blue-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center p-3 bg-white rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.completedReferrals}</p>
            <p className="text-xs text-gray-500">Successful</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{stats.pendingReferrals}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.totalPointsEarned}</p>
            <p className="text-xs text-gray-500">Points Earned</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/50 rounded-lg p-3 mt-3">
          <p className="text-xs font-medium text-gray-700 mb-2">How it works:</p>
          <ol className="text-xs text-gray-600 space-y-1">
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
              Share your referral code with friends
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
              They sign up and enter your code
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
              When they place their first order, you both get {referralBonus} points!
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

export default ReferralSection
