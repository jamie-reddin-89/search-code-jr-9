import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TooltipProvider as TooltipToggleProvider } from "@/contexts/TooltipContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Suspense, lazy } from "react";
import Index from "./pages/Index";
import Favorites from "./pages/Favorites";
const Admin = lazy(() => import("./pages/Admin"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminMessages = lazy(() => import("./pages/AdminMessages"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminFixSteps = lazy(() => import("./pages/AdminFixSteps"));
const AdminAppLogs = lazy(() => import("./pages/AdminAppLogs"));
const AdminAddErrorInfo = lazy(() => import("./pages/AdminAddErrorInfo"));
const AdminAddErrorCode = lazy(() => import("./pages/AdminAddErrorCode"));
const AdminAddDevice = lazy(() => import("./pages/AdminAddDevice"));
import ButtonPage from "./components/ButtonPage";
import InstallPrompt from "./components/InstallPrompt";
import AIAssistant from "./components/AIAssistant";
import AdminRoute from "./components/AdminRoute";
import AnalyticsListener from "./components/AnalyticsListener";
import SyncBridge from "./components/SyncBridge";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const buttonRoutes = [
  "Joule Victorum",
  "Joule Samsung",
  "Joule Modular Air",
  "DeDietrich Strateo",
  "LG Thermia",
  "Hitachi Yutaki",
  "Panasonic Aquarea",
  "Grant Areona",
  "Itec Thermia",
  "Smart Control",
  "System Status",
].map((name) => ({
  path: `/${name.toLowerCase().replace(/\s+/g, "-")}`,
  element: <ButtonPage title={name} />,
}));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <TooltipToggleProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <AIAssistant />
          <ErrorBoundary>
            <HashRouter>
            <AnalyticsListener />
            <SyncBridge />
            <Suspense fallback={<div className="page-container"><div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div></div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
              <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
              <Route path="/admin/fix-steps" element={<AdminRoute><AdminFixSteps /></AdminRoute>} />
              <Route path="/admin/app-logs" element={<AdminRoute><AdminAppLogs /></AdminRoute>} />
              <Route path="/admin/add-error-info" element={<AdminRoute><AdminAddErrorInfo /></AdminRoute>} />
              <Route path="/admin/add-error-code" element={<AdminRoute><AdminAddErrorCode /></AdminRoute>} />
              <Route path="/admin/add-device" element={<AdminRoute><AdminAddDevice /></AdminRoute>} />
              <Route path="/pdf-files" element={<ButtonPage title="PDF Files" />} />
              {buttonRoutes.map((route, index) => (
                <Route key={index} path={route.path} element={route.element} />
              ))}
            </Routes>
            </Suspense>
            </HashRouter>
          </ErrorBoundary>
        </TooltipToggleProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
