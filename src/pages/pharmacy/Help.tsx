import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, Search, MessageCircle, Phone, Mail, 
  FileText, ChevronRight, ExternalLink, Clock
} from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    { q: "How do I track my order?", a: "Go to 'My Orders' from your profile menu. Click on any order to see real-time tracking information and delivery status." },
    { q: "What payment methods do you accept?", a: "We accept all major credit cards, ACH bank transfers, and offer Net 30 credit terms for qualified accounts." },
    { q: "How do I return a product?", a: "Contact our support team within 30 days of delivery. We'll provide a return label and process your refund once received." },
    { q: "Can I modify my order after placing it?", a: "Orders can be modified within 2 hours of placement. Contact support immediately for any changes needed." },
    { q: "How does the rewards program work?", a: "Earn 1 point per $1 spent. Points can be redeemed for discounts, free shipping, and store credit." },
  ];

  const quickLinks = [
    { title: "Shipping Policy", icon: FileText, href: "#" },
    { title: "Return Policy", icon: FileText, href: "#" },
    { title: "Terms of Service", icon: FileText, href: "#" },
    { title: "Privacy Policy", icon: FileText, href: "#" },
  ];

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-cyan-600" />
              Help & Support
            </h1>
            <p className="text-gray-500 mt-1">Find answers or contact our support team</p>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">How can we help you?</h2>
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-white text-gray-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Live Chat</h3>
              <p className="text-sm text-gray-500 mt-1">Chat with our support team</p>
              <Badge className="mt-3 bg-green-100 text-green-700">Available Now</Badge>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Call Us</h3>
              <p className="text-sm text-gray-500 mt-1">1-800-9RX-HELP</p>
              <p className="text-xs text-gray-400 mt-2">Mon-Fri 9AM-6PM EST</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Email Support</h3>
              <p className="text-sm text-gray-500 mt-1">support@9rx.com</p>
              <p className="text-xs text-gray-400 mt-2">Response within 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-gray-600">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickLinks.map((link, index) => (
                <Button key={index} variant="outline" className="justify-between h-auto py-3">
                  <span className="flex items-center gap-2">
                    <link.icon className="w-4 h-4" />
                    {link.title}
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Help;
