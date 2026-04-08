import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { LoadingSpinner } from "@/components/loading-spinner";

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import("@/pages/login"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const UserDashboard = lazy(() => import("@/pages/dashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const CreateTicketPage = lazy(() => import("@/pages/create-ticket"));
const TicketDetailsPage = lazy(() => import("@/pages/ticket-details"));
const AllTicketsPage = lazy(() => import("@/pages/all-tickets"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin-analytics"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const LandingPage = lazy(() => import("@/pages/Index"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === "admin" ? "/admin/dashboard" : "/dashboard"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute><AllTicketsPage /></ProtectedRoute>} />
              <Route path="/tickets/create" element={<ProtectedRoute><CreateTicketPage /></ProtectedRoute>} />
              <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetailsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsersPage /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
