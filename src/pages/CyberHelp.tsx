import { 
  ShieldCheck, Phone, FileWarning, Globe, ShieldAlert, 
  ExternalLink, Smartphone, QrCode, KeyRound, PhoneOff, 
  BadgeDollarSign, MessageCircle 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CyberHelp() {
  const navigate = useNavigate();

  const openUrl = (url: string) => {
    window.open(url, "_blank");
  };

  const callHelpline = () => {
    window.open("tel:1930");
  };

  const scamGuides = [
    {
      id: "upi-fraud",
      title: "UPI Fraud",
      icon: Smartphone,
      description: "Fake UPI requests and payment link scams",
    },
    {
      id: "qr-scam",
      title: "QR Code Scam",
      icon: QrCode,
      description: "Malicious QR codes that steal money",
    },
    {
      id: "otp-scam",
      title: "OTP Scam",
      icon: KeyRound,
      description: "Social engineering to steal one-time passwords",
    },
    {
      id: "sim-swap",
      title: "SIM Swap",
      icon: PhoneOff,
      description: "Fraudsters duplicate your SIM card",
    },
    {
      id: "fake-loan-apps",
      title: "Fake Loan Apps",
      icon: BadgeDollarSign,
      description: "Predatory loan apps with hidden charges",
    },
    {
      id: "whatsapp-scam",
      title: "WhatsApp Banking Scam",
      icon: MessageCircle,
      description: "Fake banking messages on WhatsApp",
    },
  ];

  const govResources = [
    {
      title: "RBI Banking Safety (Sachet)",
      url: "https://sachet.rbi.org.in",
      description: "RBI customer awareness and complaint platform",
    },
    {
      title: "CERT-In",
      url: "https://www.cert-in.org.in",
      description: "Indian Computer Emergency Response Team",
    },
    {
      title: "National Cyber Crime Portal",
      url: "https://cybercrime.gov.in",
      description: "Report all categories of cyber crime",
    },
    {
      title: "Digital Payment Safety (NPCI)",
      url: "https://www.npci.org.in/what-we-do/upi/dispute-redressal-mechanism",
      description: "UPI dispute redressal",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Background blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10 animate-fade-in">
        {/* SECTION 1: Emergency Hero Card */}
        <Card className="glass-card mb-8 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] overflow-hidden relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-semibold text-red-500">24/7 Emergency</span>
          </div>
          
          <div className="p-8 flex flex-col items-center text-center">
            <ShieldCheck className="h-20 w-20 text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            <h1 className="text-3xl md:text-4xl font-bold mb-2">National Cyber Helpline 1930</h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              Report cyber fraud within the golden hour for maximum recovery
            </p>
            <Button 
              size="lg" 
              className="bg-red-600 hover:bg-red-700 text-white gap-2 text-lg px-8 py-6 h-auto shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              onClick={callHelpline}
            >
              <Phone className="h-6 w-6" />
              Call 1930
            </Button>
          </div>
        </Card>

        {/* SECTION 2: Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          <Card className="glass-card p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={callHelpline}>
            <div className="bg-primary/20 p-3 rounded-full">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Call 1930</h3>
              <p className="text-sm text-muted-foreground">Immediate assistance</p>
            </div>
          </Card>
          
          <Card className="glass-card p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => openUrl("https://cybercrime.gov.in")}>
            <div className="bg-orange-500/20 p-3 rounded-full">
              <FileWarning className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Report Fraud</h3>
              <p className="text-sm text-muted-foreground">File an official complaint</p>
            </div>
          </Card>
          
          <Card className="glass-card p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => openUrl("https://cybercrime.gov.in")}>
            <div className="bg-blue-500/20 p-3 rounded-full">
              <Globe className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Cyber Crime Portal</h3>
              <p className="text-sm text-muted-foreground">National reporting platform</p>
            </div>
          </Card>
          
          <Card className="glass-card p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => openUrl("https://www.cert-in.org.in")}>
            <div className="bg-green-500/20 p-3 rounded-full">
              <ShieldAlert className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg">CERT-In</h3>
              <p className="text-sm text-muted-foreground">Cyber incident response</p>
            </div>
          </Card>
        </div>

        {/* SECTION 3: Government Resources */}
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Official Government Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {govResources.map((resource, idx) => (
            <Card 
              key={idx} 
              className="glass-card p-5 cursor-pointer hover:bg-white/5 transition-all group flex justify-between items-center"
              onClick={() => openUrl(resource.url)}
            >
              <div>
                <h3 className="font-bold mb-1 group-hover:text-primary transition-colors">{resource.title}</h3>
                <p className="text-sm text-muted-foreground">{resource.description}</p>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
            </Card>
          ))}
        </div>

        {/* SECTION 4: Scam Guide Cards */}
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <FileWarning className="h-6 w-6 text-primary" />
          Know Your Scams - Protection Guides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {scamGuides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Card 
                key={guide.id} 
                className="glass-card p-6 cursor-pointer hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all flex flex-col items-center text-center group"
                onClick={() => navigate(`/cyber-help/guide/${guide.id}`)}
              >
                <div className="bg-primary/10 p-4 rounded-full mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{guide.title}</h3>
                <p className="text-sm text-muted-foreground">{guide.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
