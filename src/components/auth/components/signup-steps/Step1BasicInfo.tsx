import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupFormData } from "../../types/signup.types";
import { Eye, EyeOff, User, Mail, Lock, CheckCircle2, XCircle, Gift, Loader2, Building2, Store } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { validateReferralCode } from "@/services/referralService";

interface Step1Props {
  formData: SignupFormData;
  onChange: (field: keyof SignupFormData, value: any) => void;
  isLoading: boolean;
  referralValid: boolean | null;
  setReferralValid: (valid: boolean | null) => void;
}

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

export const Step1BasicInfo = ({ formData, onChange, isLoading, referralValid, setReferralValid }: Step1Props) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [referrerName, setReferrerName] = useState<string>("");
  const [checkingReferral, setCheckingReferral] = useState(false);

  const passwordStrength = useMemo(() => calculatePasswordStrength(formData.password), [formData.password]);
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsDontMatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode && !formData.referralCode) {
      onChange("referralCode", refCode);
    }
  }, [searchParams]);

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
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Business Information</h3>
          <p className="text-sm text-gray-500">Tell us about your pharmacy</p>
        </div>
      </div>

      {/* Store/Company Name */}
      <div className="space-y-1.5">
        <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
          Store Name <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="companyName"
            placeholder="e.g., Fresh Pharmacy Downtown"
            value={formData.companyName}
            onChange={(e) => onChange("companyName", e.target.value)}
            disabled={isLoading}
            className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Owner Name */}
      <div className="space-y-1.5">
        <Label htmlFor="ownerName" className="text-sm font-medium text-gray-700">
          Owner Name <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="ownerName"
            placeholder="e.g., John Smith"
            value={`${formData.firstName} ${formData.lastName}`.trim()}
            onChange={(e) => {
              const parts = e.target.value.split(' ');
              onChange("firstName", parts[0] || "");
              onChange("lastName", parts.slice(1).join(' ') || "");
            }}
            disabled={isLoading}
            className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Email Address */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="contact@yourpharmacy.com"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            required
            disabled={isLoading}
            className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Phone Number */}
      <div className="space-y-1.5">
        <Label htmlFor="mobilePhone" className="text-sm font-medium text-gray-700">Phone Number *</Label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <Input
            id="mobilePhone"
            type="tel"
            placeholder="(555) 123-4567"
            value={formData.mobilePhone}
            onChange={(e) => onChange("mobilePhone", e.target.value)}
            required
            disabled={isLoading}
            className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Referral Code */}
      <div className="space-y-1.5">
        <Label htmlFor="referralCode" className="text-sm font-medium text-gray-700">
          Referral Code <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="referralCode"
            placeholder="Enter referral code"
            value={formData.referralCode || ""}
            onChange={(e) => onChange("referralCode", e.target.value.toUpperCase())}
            disabled={isLoading}
            className={`pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 uppercase ${
              referralValid === true ? "border-green-400 bg-green-50" : ""
            } ${referralValid === false ? "border-red-400 bg-red-50" : ""}`}
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
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Gift className="h-3 w-3" /> Referred by {referrerName} - You'll both get bonus points!
          </p>
        )}
        {referralValid === false && formData.referralCode && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <XCircle className="h-3 w-3" /> Invalid referral code
          </p>
        )}
      </div>
    </div>
  );
};
