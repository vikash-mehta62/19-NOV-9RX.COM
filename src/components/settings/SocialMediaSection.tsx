import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { Share2, Facebook, Instagram, Twitter, Linkedin, Youtube } from "lucide-react";

interface SocialMediaSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function SocialMediaSection({ form }: SocialMediaSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Social Media Links
        </CardTitle>
        <CardDescription>
          Add your social media profiles to display on your store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="social_facebook"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                Facebook
              </FormLabel>
              <FormControl>
                <Input placeholder="https://facebook.com/yourbusiness" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="social_instagram"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-600" />
                Instagram
              </FormLabel>
              <FormControl>
                <Input placeholder="https://instagram.com/yourbusiness" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="social_twitter"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Twitter className="h-4 w-4 text-sky-500" />
                Twitter / X
              </FormLabel>
              <FormControl>
                <Input placeholder="https://twitter.com/yourbusiness" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="social_linkedin"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-blue-700" />
                LinkedIn
              </FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/company/yourbusiness" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="social_youtube"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-600" />
                YouTube
              </FormLabel>
              <FormControl>
                <Input placeholder="https://youtube.com/@yourbusiness" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="social_tiktok"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                TikTok
              </FormLabel>
              <FormControl>
                <Input placeholder="https://tiktok.com/@yourbusiness" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
