import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CompanySettingsProvider } from "@/contexts/CompanySettingsContext";
import Login from "./pages/Login";
import SetupSuperUser from "./pages/SetupSuperUser";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";

// SuperUser pages
import SuperUserDashboard from "./pages/superuser/Dashboard";
import Companies from "./pages/superuser/Companies";
import Subscriptions from "./pages/superuser/Subscriptions";
import Billing from "./pages/superuser/Billing";
import Tokens from "./pages/superuser/Tokens";
import SuperUserSettings from "./pages/superuser/Settings";
import SuperUserSupport from "./pages/superuser/Support";
import CompanyZAPISettings from "./pages/superuser/CompanyZAPISettings";
import AISettings from "./pages/superuser/AISettings";
import SuperUserAffiliates from "./pages/superuser/Affiliates";
import SuperuserAuditLogs from "./pages/superuser/AuditLogs";

// Company pages
import CompanyDashboard from "./pages/company/Dashboard";
import Schedule from "./pages/company/Schedule";
import LiveChat from "./pages/company/LiveChat";
import AIUsage from "./pages/company/AIUsage";
import WhatsAppContacts from "./pages/company/contacts/WhatsApp";
import Patients from "./pages/company/contacts/Patients";
import CRM from "./pages/company/CRM";
import Reports from "./pages/company/Reports";
import Professionals from "./pages/company/settings/Professionals";
import Services from "./pages/company/settings/Services";
import Availability from "./pages/company/settings/Availability";
import CompanyData from "./pages/company/settings/CompanyData";
import AutoMessages from "./pages/company/settings/AutoMessages";
import Visual from "./pages/company/settings/Visual";
import SchedulingRules from "./pages/company/settings/SchedulingRules";
import Users from "./pages/company/settings/Users";
import Tags from "./pages/company/settings/Tags";
import CompanySupport from "./pages/company/settings/CompanySupport";
import WhatsAppConnection from "./pages/company/settings/WhatsAppConnection";
import FAQ from "./pages/company/settings/FAQ";
import CompanyAuditLogs from "./pages/company/settings/AuditLogs";
import Payment from "./pages/company/setup/Payment";

// Affiliate pages
import AffiliateDashboard from "./pages/affiliate/Dashboard";
import AffiliateCompanies from "./pages/affiliate/Companies";
import AffiliatePayouts from "./pages/affiliate/Payouts";
import AffiliateSettings from "./pages/affiliate/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanySettingsProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/reset" element={<ResetPassword />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/setup-superuser" element={<SetupSuperUser />} />
              
              {/* SuperUser routes */}
              <Route path="/superuser/dashboard" element={<ProtectedRoute requiredRole="superuser"><SuperUserDashboard /></ProtectedRoute>} />
              <Route path="/superuser/companies" element={<ProtectedRoute requiredRole="superuser"><Companies /></ProtectedRoute>} />
              <Route path="/superuser/subscriptions" element={<ProtectedRoute requiredRole="superuser"><Subscriptions /></ProtectedRoute>} />
              <Route path="/superuser/billing" element={<ProtectedRoute requiredRole="superuser"><Billing /></ProtectedRoute>} />
              <Route path="/superuser/tokens" element={<ProtectedRoute requiredRole="superuser"><Tokens /></ProtectedRoute>} />
              <Route path="/superuser/settings" element={<ProtectedRoute requiredRole="superuser"><SuperUserSettings /></ProtectedRoute>} />
              <Route path="/superuser/support" element={<ProtectedRoute requiredRole="superuser"><SuperUserSupport /></ProtectedRoute>} />
              <Route path="/superuser/affiliates" element={<ProtectedRoute requiredRole="superuser"><SuperUserAffiliates /></ProtectedRoute>} />
              <Route path="/superuser/audit-logs" element={<ProtectedRoute requiredRole="superuser"><SuperuserAuditLogs /></ProtectedRoute>} />
              
              <Route path="/superuser/ai-settings" element={<ProtectedRoute requiredRole="superuser"><AISettings /></ProtectedRoute>} />
              
              <Route path="/superuser/companies/:companyId/zapi" element={<ProtectedRoute requiredRole="superuser"><CompanyZAPISettings /></ProtectedRoute>} />
              
              {/* Company routes */}
              <Route path="/company/setup/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
              <Route path="/company/dashboard" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
              <Route path="/company/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
              <Route path="/company/live-chat" element={<ProtectedRoute><LiveChat /></ProtectedRoute>} />
              <Route path="/company/ai-usage" element={<ProtectedRoute><AIUsage /></ProtectedRoute>} />
              <Route path="/company/contacts/whatsapp" element={<ProtectedRoute><WhatsAppContacts /></ProtectedRoute>} />
              <Route path="/company/contacts/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
              <Route path="/company/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
              <Route path="/company/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/company/settings/professionals" element={<ProtectedRoute><Professionals /></ProtectedRoute>} />
              <Route path="/company/settings/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
              <Route path="/company/settings/availability" element={<ProtectedRoute><Availability /></ProtectedRoute>} />
              <Route path="/company/settings/company-data" element={<ProtectedRoute><CompanyData /></ProtectedRoute>} />
              <Route path="/company/settings/auto-messages" element={<ProtectedRoute><AutoMessages /></ProtectedRoute>} />
              <Route path="/company/settings/visual" element={<ProtectedRoute><Visual /></ProtectedRoute>} />
              <Route path="/company/settings/scheduling-rules" element={<ProtectedRoute><SchedulingRules /></ProtectedRoute>} />
              <Route path="/company/settings/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/company/settings/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />
              <Route path="/company/settings/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} />
              <Route path="/company/settings/audit-logs" element={<ProtectedRoute><CompanyAuditLogs /></ProtectedRoute>} />
              <Route path="/company/settings/support" element={<ProtectedRoute><CompanySupport /></ProtectedRoute>} />
              <Route path="/company/settings/whatsapp" element={<ProtectedRoute><WhatsAppConnection /></ProtectedRoute>} />

              {/* Affiliate routes */}
              <Route path="/affiliate/dashboard" element={<ProtectedRoute requiredRole="affiliate"><AffiliateDashboard /></ProtectedRoute>} />
              <Route path="/affiliate/companies" element={<ProtectedRoute requiredRole="affiliate"><AffiliateCompanies /></ProtectedRoute>} />
              <Route path="/affiliate/payouts" element={<ProtectedRoute requiredRole="affiliate"><AffiliatePayouts /></ProtectedRoute>} />
              <Route path="/affiliate/settings" element={<ProtectedRoute requiredRole="affiliate"><AffiliateSettings /></ProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CompanySettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );

export default App;
