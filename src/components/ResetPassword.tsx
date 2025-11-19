import { useState } from "react"
import { useForm } from "react-hook-form"
import { Eye, EyeOff, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Navbar } from "./landing/HeroSection"
import { supabase } from "@/integrations/supabase/client"
import axios from '../../axiosconfig'
interface PasswordResetFormValues {
  password: string
  confirmPassword: string
}

export default function PasswordReset() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { toast } = useToast()
  const [searchParams] = useSearchParams();
  const userEmail = searchParams.get("email");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PasswordResetFormValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const password = watch("password")

  const onSubmit = async (data: PasswordResetFormValues) => {
    setIsLoading(true)
    try {
      // Make network call to reset password
      async function updateNewPassword(newPassword) {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });
      
        if (error) {
          console.error('Error updating password:', error.message);
        } else {
          console.log('Password updated successfully!', data);

          const userDAta = data.user.user_metadata ;
          console.log(userDAta)
          try {
            const response = await axios.post("/update-profile", {
              name: `${userDAta.first_name} ${userDAta.last_name}`,
              email: userDAta.email,
            
            });
          
            console.log("Verification Successful:", response.data);
        
           
          } catch (error) {
            console.error("Error in user verification:", error.response?.data || error.message);
          }
        }
      }
      
      updateNewPassword(data.password)

      toast({
        title: "Password reset successful",
        description: "Your password has been reset successfully.",
      })
      navigate("/login", { state: { defaultTab: "login" } });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }


  return (

  <div>

<Navbar />
    <Card className="mx-auto w-full max-w-md  items-center justify-center h-screen mt-[100px]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) => value === password || "Passwords do not match",
                })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Resetting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Reset Password
              </span>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  </div>
  
  )
}

