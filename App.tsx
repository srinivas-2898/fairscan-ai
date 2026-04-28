import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import HireFair from "./pages/HireFair.tsx";
import TalentMatch from "./pages/TalentMatch.tsx";
import ComingSoon from "./pages/ComingSoon.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import History from "./pages/History.tsx";
import Account from "./pages/Account.tsx";
import AdminControlCenter from "./pages/AdminControlCenter.tsx";
import AccessDenied from "./pages/AccessDenied.tsx";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider } from "./hooks/useAuth";
import { AdminGateProvider } from "./hooks/useAdminGate";
import { AdminKeyDialog } from "./components/AdminKeyDialog";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);
const AdminOnly = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requireAdmin><AppLayout>{children}</AppLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" position="top-right" toastOptions={{ style: { background: "hsl(222 39% 12%)", border: "1px solid hsl(222 30% 22%)", color: "hsl(210 40% 98%)" } }} />
      <BrowserRouter>
        <AuthProvider>
          <AdminGateProvider>
          <AdminKeyDialog />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/hirefair" element={<Protected><HireFair /></Protected>} />
            <Route path="/talentmatch" element={<Protected><TalentMatch /></Protected>} />
            <Route path="/coming-soon" element={<Protected><ComingSoon /></Protected>} />
            <Route path="/history" element={<Protected><History /></Protected>} />
            <Route path="/account" element={<Protected><Account /></Protected>} />
            <Route path="/admin" element={<AdminOnly><AdminControlCenter /></AdminOnly>} />
            <Route path="/access-denied" element={<Protected><AccessDenied /></Protected>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AdminGateProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
