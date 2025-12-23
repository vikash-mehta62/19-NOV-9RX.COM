import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupFormData } from "../types/signup.types";
import { Eye, EyeOff, User, Mail, Phone, Lock, CheckCircle2, XCircle, Gift, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { validateReferralCode } from "@/services/referralService";

interface SignupFormFieldsProps {
  formData: SignupFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { score, label: "Medium", color: "bg-yellow-500" };
  return { score, label: "Strong", color: "bg-green-500" };
};

export const SignupFormFields = ({
  formData,
  onChange,
  isLoading,
}: SignupFormFieldsProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referrerName, setReferrerName] = useState<string>("");
  const [checkingReferral, setCheckingReferral] = useState(false);

  const passwordStrength = useMemo(() => 
    calculatePasswordStrength(formData.password), 
    [formData.password]
  );

  const passwordsMatch = formData.password && formData.confirmPassword && 
    formData.password === formData.confirmPassword;

  const passwordsDontMatch = formData.confirmPassword && 
    formData.password !== formData.confirmPassword;

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode && !formData.referralCode) {
      const event = {
        target: { id: "referralCode", value: refCode }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  }, [searchParams]);

  // Validate referral code when it changes
  useEffect(() => {
    const validateCode = async () => {
      if (!formData.referralCode || formData.referralCode.length < 6) {
        setReferralValid(null);
        setReferrerName("");
        return;
      }

      setCheckingReferral(true);
      try {
        const result = await validateReferralCode(formData.referralCode);
        setReferralValid(result.valid);
        setReferrerName(result.referrerName || "");
      } catch (error) {
        setReferralValid(false);
      } finally {
        setCheckingReferral(false);
      }
    };

    const debounce = setTimeout(validateCode, 500);
    return () => clearTimeout(debounce);
  }, [formData.referralCode]);

  return (
    <div className="space-y-4">
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
            First Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={onChange}
              required
              disabled={isLoading}
              className="pl-10 h-11 rounded-xl border-gray-200 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
            Last Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={onChange}
              required
              disabled={isLoading}
              className="pl-10 h-11 rounded-xl border-gray-200 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="you@pharmacy.com"
            value={formData.email}
            onChange={onChange}
            required
            disabled={isLoading}
            className="pl-10 h-11 rounded-xl border-gray-200 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Phone Field */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
          Phone Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={formData.phone}
            onChange={onChange}
            required
            disabled={isLoading}
            className="pl-10 h-11 rounded-xl border-gray-200 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Password Field with Strength Indicator */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={onChange}
            required
            disabled={isLoading}
            minLength={6}
            className="pl-10 pr-12 h-11 rounded-xl border-gray-200 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        
        {/* Password Strength Indicator */}
        {formData.password && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    level <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <p className={`text-xs font-medium ${
                passwordStrength.label === "Weak" ? "text-red-500" :
                passwordStrength.label === "Medium" ? "text-yellow-600" : "text-green-500"
              }`}>
                {passwordStrength.label} password
              </p>
              <div className="flex gap-2 text-xs text-gray-500">
                <span className={formData.password.length >= 8 ? "text-green-500" : ""}>8+ chars</span>
                <span className={/[A-Z]/.test(formData.password) ? "text-green-500" : ""}>A-Z</span>
                <span className={/[0-9]/.test(formData.password) ? "text-green-500" : ""}>0-9</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={onChange}
            required
            disabled={isLoading}
            className={`pl-10 pr-12 h-11 rounded-xl border-gray-200 focus:border-blue-500 ${
              passwordsMatch ? "border-green-300" : ""
            } ${passwordsDontMatch ? "border-red-300" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          {passwordsMatch && (
            <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        {passwordsDontMatch && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Passwords do not match
          </p>
        )}
        {passwordsMatch && (
          <p className="text-xs text-green-500 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Passwords match
          </p>
        )}
      </div>

      {/* Referral Code Field */}
      <div className="space-y-2">
        <Label htmlFor="referralCode" className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Referral Code <span className="text-xs text-gray-400">(optional)</span>
        </Label>
        <div className="relative">
          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="referralCode"
            placeholder="Enter referral code"
            value={formData.referralCode || ""}
            onChange={onChange}
            disabled={isLoading}
            className={`pl-10 pr-10 h-11 rounded-xl border-gray-200 focus:border-blue-500 uppercase ${
              referralValid === true ? "border-green-300" : ""
            } ${referralValid === false ? "border-red-300" : ""}`}
            maxLength={10}
          />
          {checkingReferral && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          )}
          {!checkingReferral && referralValid === true && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
          {!checkingReferral && referralValid === false && (
            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
          )}
        </div>
        {referralValid === true && referrerName && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Gift className="h-3 w-3" /> Referred by {referrerName} - You'll both get bonus points!
          </p>
        )}
        {referralValid === false && formData.referralCode && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Invalid referral code
          </p>
        )}
      </div>
    </div>
  );
};
