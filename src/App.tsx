import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import PublicLanding from "./pages/PublicLanding";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import CompanySelection from "./pages/CompanySelection";
import CompanyManagement from "./pages/CompanyManagement";
import Clients from "./pages/Clients";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import DropboxCallback from "./pages/DropboxCallback";

const queryClient = new QueryClient();

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/landing" element={<PublicLanding />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/company-selection" element={
                <ProtectedRoute>
                  <CompanySelection />
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="/settings/companies" element={
                <ProtectedRoute>
                  <CompanyManagement />
                </ProtectedRoute>
              } />
              <Route path="/auth/dropbox/callback" element={
                <ProtectedRoute>
                  <DropboxCallback />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
