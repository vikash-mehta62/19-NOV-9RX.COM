import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupFormData } from "../../types/signup.types";
import { Eye, EyeOff, Lock, CheckCircle2, XCircle, FileCheck, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface Step4Props {
  formData: SignupFormData;
  onChange: (field: keyof SignupFormData, value: any) => void;
  isLoading: boolean;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
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

export const Step4Addresses = ({ formData, onChange, isLoading, termsAccepted, setTermsAccepted }: Step4Props) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = useMemo(() => calculatePasswordStrength(formData.password), [formData.password]);
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsDontMatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center">
          <Lock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Account Credentials</h3>
          <p className="text-sm text-gray-500">Secure your account with a strong password</p>
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-orange-600">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a secure password"
            value={formData.password}
            onChange={(e) => onChange("password", e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
            className="pl-10 pr-12 h-12 rounded-lg border-gray-200 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500">Must be at least 6 characters</p>
        
        {formData.password && formData.password.length < 6 && (
          <p className="text-xs text-orange-500">Password must be at least 6 characters</p>
        )}
        
        {/* Password Strength Indicator */}
        {formData.password && formData.password.length >= 8 && (
          <div className="space-y-1 mt-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    level <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs font-medium ${
              passwordStrength.label === "Weak" ? "text-red-500" :
              passwordStrength.label === "Medium" ? "text-yellow-600" : "text-green-500"
            }`}>
              {passwordStrength.label} password
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-orange-600">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            required
            disabled={isLoading}
            className={`pl-10 pr-12 h-12 rounded-lg border-gray-200 focus:border-blue-500 ${
              passwordsMatch ? "border-green-400" : ""
            } ${passwordsDontMatch ? "border-red-400" : ""}`}
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
          <p className="text-xs text-orange-500">Please confirm your password</p>
        )}
        {passwordsMatch && (
          <p className="text-xs text-green-500 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Passwords match
          </p>
        )}
      </div>

      {/* Important Payment Terms Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Important Payment Terms:</p>
            <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li>Payment due within 7 days of invoice</li>
              <li>Late payments accrue <span className="font-semibold">1.5% monthly interest</span> (18% annually)</li>
              <li>$50 fee for returned checks</li>
              <li>Legal action for non-payment in <span className="font-semibold">Atlanta, Georgia courts</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Checkbox */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="termsAccepted"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            disabled={isLoading}
            className="mt-1 data-[state=checked]:bg-blue-600"
          />
          <div className="flex-1">
            <Label
              htmlFor="termsAccepted"
              className="text-sm text-gray-700 cursor-pointer leading-relaxed"
            >
              I have read and agree to the{" "}
              <a href="/terms-of-service" target="_blank" className="text-blue-600 hover:underline font-medium">
                Terms and Conditions
              </a>{" "}
              including payment terms, late payment interest charges, and legal jurisdiction.
            </Label>
            <p className="text-xs text-gray-500 mt-2">
              By checking this box, you acknowledge that late payments will incur 1.5% monthly interest and agree to the jurisdiction of courts in Atlanta, Georgia for any disputes.
            </p>
          </div>
          {!termsAccepted && (
            <p className="text-xs text-red-500 whitespace-nowrap">
              You must agree to the<br />terms and conditions
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
