import { supabase } from "@/integrations/supabase/client"

// Update user's date of birth
export async function updateDateOfBirth(
  userId: string, 
  dateOfBirth: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ date_of_birth: dateOfBirth })
      .eq("id", userId)

    if (error) throw error

    // Check if today is their birthday and award bonus
    const today = new Date()
    const dob = new Date(dateOfBirth)
    
    if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
      await checkAndAwardBirthdayBonus(userId)
    }

    return { success: true, message: "Birthday saved successfully!" }
  } catch (error) {
    console.error("Error updating date of birth:", error)
    return { success: false, message: "Failed to save birthday" }
  }
}

// Check and award birthday bonus
export async function checkAndAwardBirthdayBonus(userId: string): Promise<{ 
  awarded: boolean; 
  points?: number; 
  message: string 
}> {
  try {
    // Get user profile
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("date_of_birth, birthday_bonus_year, reward_points, first_name")
      .eq("id", userId)
      .single()

    if (userError || !user?.date_of_birth) {
      return { awarded: false, message: "No birthday on file" }
    }

    const today = new Date()
    const currentYear = today.getFullYear()
    const dob = new Date(user.date_of_birth)

    // Check if today is their birthday
    if (today.getMonth() !== dob.getMonth() || today.getDate() !== dob.getDate()) {
      return { awarded: false, message: "Today is not your birthday" }
    }

    // Check if already awarded this year
    if (user.birthday_bonus_year === currentYear) {
      return { awarded: false, message: "Birthday bonus already claimed this year" }
    }

    // Get birthday bonus amount from config
    const { data: config } = await supabase
      .from("rewards_config")
      .select("birthday_bonus")
      .single()

    const birthdayBonus = config?.birthday_bonus || 100

    // Award the bonus
    const newPoints = (user.reward_points || 0) + birthdayBonus

    await supabase
      .from("profiles")
      .update({ 
        reward_points: newPoints,
        birthday_bonus_year: currentYear
      })
      .eq("id", userId)

    // Log transaction
    await supabase
      .from("reward_transactions")
      .insert({
        user_id: userId,
        points: birthdayBonus,
        transaction_type: "bonus",
        description: `🎂 Happy Birthday${user.first_name ? `, ${user.first_name}` : ''}! Enjoy your bonus points!`,
        reference_type: "birthday"
      })

    return { 
      awarded: true, 
      points: birthdayBonus,
      message: `🎂 Happy Birthday! You've received ${birthdayBonus} bonus points!`
    }
  } catch (error) {
    console.error("Error checking birthday bonus:", error)
    return { awarded: false, message: "Error checking birthday bonus" }
  }
}

// Get user's birthday status
export async function getBirthdayStatus(userId: string): Promise<{
  hasBirthday: boolean
  dateOfBirth?: string
  bonusClaimedThisYear: boolean
  daysUntilBirthday?: number
}> {
  try {
    const { data: user } = await supabase
      .from("profiles")
      .select("date_of_birth, birthday_bonus_year")
      .eq("id", userId)
      .single()

    if (!user?.date_of_birth) {
      return { hasBirthday: false, bonusClaimedThisYear: false }
    }

    const today = new Date()
    const currentYear = today.getFullYear()
    const dob = new Date(user.date_of_birth)
    
    // Calculate days until next birthday
    let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate())
    if (nextBirthday < today) {
      nextBirthday = new Date(currentYear + 1, dob.getMonth(), dob.getDate())
    }
    
    const diffTime = nextBirthday.getTime() - today.getTime()
    const daysUntilBirthday = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return {
      hasBirthday: true,
      dateOfBirth: user.date_of_birth,
      bonusClaimedThisYear: user.birthday_bonus_year === currentYear,
      daysUntilBirthday: daysUntilBirthday === 0 ? 0 : daysUntilBirthday
    }
  } catch (error) {
    console.error("Error getting birthday status:", error)
    return { hasBirthday: false, bonusClaimedThisYear: false }
  }
}

// Check all users for birthday bonus (for scheduled job/cron)
export async function processAllBirthdayBonuses(): Promise<{ processed: number; awarded: number }> {
  try {
    const today = new Date()
    const month = today.getMonth() + 1 // JS months are 0-indexed
    const day = today.getDate()
    const currentYear = today.getFullYear()

    // Find users with birthday today who haven't received bonus this year
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id")
      .not("date_of_birth", "is", null)
      .or(`birthday_bonus_year.is.null,birthday_bonus_year.neq.${currentYear}`)

    if (error || !users) {
      return { processed: 0, awarded: 0 }
    }

    let awarded = 0
    for (const user of users) {
      // Get full user data to check birthday
      const { data: profile } = await supabase
        .from("profiles")
        .select("date_of_birth")
        .eq("id", user.id)
        .single()

      if (profile?.date_of_birth) {
        const dob = new Date(profile.date_of_birth)
        if (dob.getMonth() + 1 === month && dob.getDate() === day) {
          const result = await checkAndAwardBirthdayBonus(user.id)
          if (result.awarded) awarded++
        }
      }
    }

    return { processed: users.length, awarded }
  } catch (error) {
    console.error("Error processing birthday bonuses:", error)
    return { processed: 0, awarded: 0 }
  }
}

export default {
  updateDateOfBirth,
  checkAndAwardBirthdayBonus,
  getBirthdayStatus,
  processAllBirthdayBonuses
}
