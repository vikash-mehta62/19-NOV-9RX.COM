import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Cake, Gift, Calendar, Check, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateDateOfBirth, getBirthdayStatus, checkAndAwardBirthdayBonus } from "@/services/birthdayBonusService"

interface BirthdaySectionProps {
  userId: string
  birthdayBonus: number
  onPointsUpdate?: () => void
}

export const BirthdaySection = ({ userId, birthdayBonus, onPointsUpdate }: BirthdaySectionProps) => {
  const { toast } = useToast()
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [hasBirthday, setHasBirthday] = useState(false)
  const [bonusClaimed, setBonusClaimed] = useState(false)
  const [daysUntilBirthday, setDaysUntilBirthday] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true)
      try {
        const status = await getBirthdayStatus(userId)
        setHasBirthday(status.hasBirthday)
        setBonusClaimed(status.bonusClaimedThisYear)
        setDaysUntilBirthday(status.daysUntilBirthday)
        if (status.dateOfBirth) {
          setDateOfBirth(status.dateOfBirth)
        }
      } catch (error) {
        console.error("Error fetching birthday status:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchStatus()
  }, [userId])

  const handleSaveBirthday = async () => {
    if (!dateOfBirth) {
      toast({
        title: "Error",
        description: "Please enter your date of birth",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Pass true to give welcome bonus on first-time birthday save
      const result = await updateDateOfBirth(userId, dateOfBirth, true)
      if (result.success) {
        setHasBirthday(true)
        toast({
          title: result.bonusAwarded ? "🎁 Bonus Received!" : "Birthday Saved! 🎂",
          description: result.message
        })
        
        // Refresh status
        const status = await getBirthdayStatus(userId)
        setBonusClaimed(status.bonusClaimedThisYear)
        setDaysUntilBirthday(status.daysUntilBirthday)
        
        if (onPointsUpdate) onPointsUpdate()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save birthday",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClaimBonus = async () => {
    setClaiming(true)
    try {
      const result = await checkAndAwardBirthdayBonus(userId)
      if (result.awarded) {
        setBonusClaimed(true)
        toast({
          title: "🎂 Happy Birthday!",
          description: result.message
        })
        if (onPointsUpdate) onPointsUpdate()
      } else {
        toast({
          title: "Info",
          description: result.message
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim birthday bonus",
        variant: "destructive"
      })
    } finally {
      setClaiming(false)
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

  const isBirthdayToday = daysUntilBirthday === 0

  return (
    <Card className={`border-2 ${isBirthdayToday && !bonusClaimed ? 'border-pink-300 bg-gradient-to-br from-pink-50 to-purple-50' : 'border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cake className="w-5 h-5 text-purple-600" />
          Birthday Bonus
          <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700">
            +{birthdayBonus} points
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasBirthday ? (
          <>
            <p className="text-sm text-gray-600">
              Add your birthday to receive <span className="font-bold text-purple-600">{birthdayBonus} bonus points</span> every year!
            </p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="bg-white"
                max={new Date().toISOString().split('T')[0]}
              />
              <Button
                onClick={handleSaveBirthday}
                disabled={saving || !dateOfBirth}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </>
        ) : isBirthdayToday && !bonusClaimed ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎂🎉🎁</div>
            <h3 className="text-xl font-bold text-purple-700 mb-2">Happy Birthday!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Claim your special birthday bonus of <span className="font-bold">{birthdayBonus} points</span>!
            </p>
            <Button
              onClick={handleClaimBonus}
              disabled={claiming}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              {claiming ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              Claim Birthday Bonus
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <Calendar className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Your Birthday</p>
                <p className="text-xs text-gray-500">
                  {new Date(dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            {bonusClaimed ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Birthday bonus claimed this year!</span>
              </div>
            ) : daysUntilBirthday !== undefined && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg text-purple-700">
                <Gift className="w-5 h-5" />
                <span className="text-sm">
                  {daysUntilBirthday === 1 
                    ? "Your birthday is tomorrow! 🎉" 
                    : `${daysUntilBirthday} days until your birthday bonus!`}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BirthdaySection
