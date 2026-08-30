import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/layout/header";
import { Footer } from "./components/layout/footer";
import { SimulationProvider, useSimulation } from "./contexts/SimulationContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthModal } from "./components/AuthModal";
import Homepage from "./pages/Homepage";
import Scanning from "./pages/Scanning";
import QRScanner from "./pages/QRScanner";
import WebsiteScanner from "./pages/WebsiteScanner";
import Settings from "./pages/Settings";
import WiFiSecurity from "./pages/WiFiSecurity";
import ReportAnalysis from "./pages/ReportAnalysis";
import DataBreach from "./pages/DataBreach";
import AppPermissions from "./pages/AppPermissions";
import AISMSShield from "./pages/AISMSShield";
import AntiScamKillSwitch from "./pages/AntiScamKillSwitch";
import CyberSanchaarShield from "./pages/CyberSanchaarShield";
import VirusScanner from "./pages/VirusScanner";
import IPSecurityCheck from "./pages/IPSecurityCheck";
import CyberNews from "./pages/CyberNews";
import CyberHelp from "./pages/CyberHelp";
import ScamGuide from "./pages/ScamGuide";
import BankShield from "./pages/BankShield";
import NotFound from "./pages/NotFound";
import { SimulateAttackPanel } from "./components/SimulateAttackPanel";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isSimulating } = useSimulation();

  return (
    <div className="min-h-screen bg-background pb-16">
      <AuthModal />
      {isSimulating && <SimulateAttackPanel />}
      <Routes>
        <Route path="/" element={<><Header /><Homepage /><Footer /></>} />
        <Route path="/scanning" element={<><Header /><Scanning /><Footer /></>} />
        <Route path="/qr-scanner" element={<><Header /><QRScanner /><Footer /></>} />
        <Route path="/website-scanner" element={<><Header /><WebsiteScanner /><Footer /></>} />
        <Route path="/settings" element={<><Header /><Settings /><Footer /></>} />
        <Route path="/wifi-security" element={<><Header /><WiFiSecurity /><Footer /></>} />
        <Route path="/report-analysis" element={<><Header /><ReportAnalysis /><Footer /></>} />
        <Route path="/data-breach" element={<><Header /><DataBreach /><Footer /></>} />
        <Route path="/app-permissions" element={<><Header /><AppPermissions /><Footer /></>} />
        <Route path="/ai-sms-shield" element={<><Header /><AISMSShield /><Footer /></>} />
        <Route path="/anti-scam-kill-switch" element={<><Header /><AntiScamKillSwitch /><Footer /></>} />
        <Route path="/cyber-sanchaar-shield" element={<><Header /><CyberSanchaarShield /><Footer /></>} />
        <Route path="/virus-scanner" element={<><Header /><VirusScanner /><Footer /></>} />
        <Route path="/ip-security-check" element={<><Header /><IPSecurityCheck /><Footer /></>} />
        <Route path="/cyber-news" element={<><Header /><CyberNews /><Footer /></>} />
        <Route path="/cyber-help" element={<><Header /><CyberHelp /><Footer /></>} />
        <Route path="/cyber-help/guide/:scamType" element={<><Header /><ScamGuide /><Footer /></>} />
        <Route path="/bank-shield" element={<><Header /><BankShield /><Footer /></>} />
        {/* Legacy routes kept for backward compat */}
        <Route path="/ai-analysis" element={<><Header /><AISMSShield /><Footer /></>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <SimulationProvider>
            <AppContent />
          </SimulationProvider>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
