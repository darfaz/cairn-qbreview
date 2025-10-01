import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import PublicLanding from "./pages/PublicLanding";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import CompanySelection from "./pages/CompanySelection";
import CompanyManagement from "./pages/CompanyManagement";
import Clients from "./pages/Clients";
import ClientHistory from "./pages/ClientHistory";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<PublicLanding />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
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
              <Route path="/history/:clientId" element={
                <ProtectedRoute>
                  <ClientHistory />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HashRouter>
  );
};

export default App;
