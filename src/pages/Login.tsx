"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { LoginForm } from "@/components/auth/LoginForm" // Assuming this component exists
import { SignupForm } from "@/components/auth/SignupForm" // Assuming this component exists
import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useToast } from "@/hooks/use-toast" // Assuming this hook exists
import { Stethoscope } from "lucide-react"

const Login = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  // Determine the default tab based on URL state or default to 'login'
  const defaultTab = location?.state?.defaultTab || "login"

  // Effect to redirect authenticated users based on their user type
  useEffect(() => {
    const userType = sessionStorage.getItem("userType")
    const isLoggedIn = sessionStorage.getItem("isLoggedIn")

    if (isLoggedIn === "true" && userType) {
      switch (userType) {
        case "pharmacy":
          navigate("/pharmacy/products")
          break
        case "admin":
          navigate("/admin/dashboard")
          break
        case "hospital":
          navigate("/hospital/dashboard")
          break
        case "group":
          navigate("/group/dashboard")
          break
        default:
          // Handle invalid user types
          toast({
            title: "Error",
            description: "Invalid user type. Please log in again.",
            variant: "destructive",
          })
          sessionStorage.clear() // Clear session for security
      }
    }
  }, [navigate, toast]) // Dependencies for the useEffect hook

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-gray-50"> {/* Overall light background */}
      {/* Left Side - Visually Engaging Section (White Theme) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-white border-r border-gray-100 shadow-md">
        {/* Subtle abstract shapes for background visual interest */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-50 opacity-20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-50 opacity-20 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 p-12 flex flex-col justify-between h-full">
          {/* Logo and Branding */}
          <div className="flex items-center mb-8">
            <div className="h-24 w-28 mr-4 flex-shrink-0">
              <img src="/final.png" alt="9RX Logo" className="h-full w-full object-contain" />
            </div>
            
          </div>

          {/* Marketing Message */}
          <div className="max-w-md">
            <h1 className="text-5xl font-extrabold text-gray-900 leading-tight drop-shadow-sm">
              Elevate Your Pharmacy
              <br />
              <span className="text-blue-600">with Premium Supplies</span>
            </h1>
            <p className="mt-4 text-gray-700 text-lg">
              Experience unmatched quality in pharmacy supplies and packaging solutions. Trusted by leading pharmacies nationwide for reliability and excellence.
            </p>
          </div>

          {/* Optional: Add a subtle graphic or icon */}
          <div className="mt-auto text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} 9RX. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Scrollable Form Section (White Theme) */}
      <div className="w-full lg:w-1/2 h-screen overflow-y-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center relative bg-white">
        {/* Subtle Background Blurs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-100 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-purple-100 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="w-full max-w-md mx-auto py-10 z-10 relative">
          {/* Mobile Branding (visible only on smaller screens) */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex items-center justify-center">
             
               <div className="h-24 w-28 mr-4 flex-shrink-0">
              <img src="/final.png" alt="9RX Logo" className="h-full w-full object-contain" />
            </div>
            </div>
          </div>

          {/* Main Card with Tabs */}
          <Card className="shadow-2xl border border-gray-100 bg-white rounded-xl">
            <CardHeader className="space-y-2 pb-6 pt-8">
              <CardTitle className="text-4xl font-extrabold text-center text-gray-900 leading-tight">
                Welcome Back!
              </CardTitle>
              <CardDescription className="text-center text-gray-600 text-lg mt-2">
                Sign in to your account or create a new one to get started.
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-8">
              <Tabs defaultValue={defaultTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-1 rounded-xl h-14 border border-gray-200">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 font-semibold text-lg transition-all duration-300 ease-in-out"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-purple-700 font-semibold text-lg transition-all duration-300 ease-in-out"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4 mt-8">
                  <LoginForm />
                </TabsContent>
                <TabsContent value="signup" className="space-y-4 mt-8">
                  <SignupForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Login