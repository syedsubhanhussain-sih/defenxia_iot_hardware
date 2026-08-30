import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, ShieldCheck, AlertTriangle, Phone, 
  ExternalLink, Info, ShieldAlert, Smartphone, 
  QrCode, KeyRound, PhoneOff, BadgeDollarSign, MessageCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ScamGuideType = {
  title: string;
  icon: any;
  whatIsIt: string;
  symptoms: string[];
  prevention: string[];
  immediateAction: string[];
  reporting: { name: string; action: string; url?: string }[];
};

const SCAM_GUIDES: Record<string, ScamGuideType> = {
  "upi-fraud": {
    title: "UPI Fraud",
    icon: Smartphone,
    whatIsIt: "Scammers send fake UPI collect requests or share malicious payment links. Victims approve payments thinking they are receiving money.",
    symptoms: [
      "Unexpected collect requests",
      "Pressure to approve quickly",
      "Unknown sender IDs",
      "Requests for small 'verification' amounts"
    ],
    prevention: [
      "Never approve unknown collect requests",
      "Verify sender before paying",
      "Use UPI PIN only to send money never to receive",
      "Enable transaction notifications"
    ],
    immediateAction: [
      "Report to bank within 24 hours",
      "Call 1930 helpline",
      "File complaint on cybercrime.gov.in",
      "Note transaction ID and screenshot"
    ],
    reporting: [
      { name: "National Helpline", action: "Call 1930", url: "tel:1930" },
      { name: "Cyber Crime Portal", action: "Visit cybercrime.gov.in", url: "https://cybercrime.gov.in" },
      { name: "Bank Support", action: "Contact Customer Care" },
      { name: "RBI Sachet", action: "Visit Portal", url: "https://sachet.rbi.org.in" }
    ]
  },
  "qr-scam": {
    title: "QR Code Scam",
    icon: QrCode,
    whatIsIt: "Fraudsters share QR codes claiming you will receive money, but scanning and entering PIN actually debits your account.",
    symptoms: [
      "Stranger shares QR code for receiving money",
      "Asks you to enter PIN after scanning",
      "QR received via WhatsApp from unknown",
      "Pressure to scan quickly"
    ],
    prevention: [
      "QR codes are ONLY for paying not receiving",
      "Never enter PIN to receive money",
      "Verify QR source",
      "Use only official app QR scanners"
    ],
    immediateAction: [
      "Do not enter PIN",
      "Block sender",
      "Report to bank",
      "Call 1930",
      "Screenshot the QR and chat"
    ],
    reporting: [
      { name: "National Helpline", action: "Call 1930", url: "tel:1930" },
      { name: "Cyber Crime Portal", action: "Visit cybercrime.gov.in", url: "https://cybercrime.gov.in" },
      { name: "Bank Support", action: "Call Bank Helpline" }
    ]
  },
  "otp-scam": {
    title: "OTP Scam",
    icon: KeyRound,
    whatIsIt: "Scammers pose as bank officials, delivery agents, or customer support and trick victims into sharing OTPs to access their accounts.",
    symptoms: [
      "Calls claiming to be from bank asking for OTP",
      "SMS with links asking to verify OTP",
      "Urgency about account being blocked",
      "Requests to install remote access apps"
    ],
    prevention: [
      "Banks never ask for OTP over phone",
      "Never share OTP with anyone",
      "Enable OTP alerts",
      "Verify caller by calling bank directly"
    ],
    immediateAction: [
      "Change passwords immediately",
      "Call bank to freeze account",
      "Report to 1930",
      "Check for unauthorized transactions"
    ],
    reporting: [
      { name: "National Helpline", action: "Call 1930", url: "tel:1930" },
      { name: "Bank Fraud Dept", action: "Contact Bank" },
      { name: "Cyber Crime Portal", action: "Visit cybercrime.gov.in", url: "https://cybercrime.gov.in" }
    ]
  },
  "sim-swap": {
    title: "SIM Swap",
    icon: PhoneOff,
    whatIsIt: "Fraudsters convince your telecom provider to transfer your number to a new SIM, gaining access to all OTPs and banking notifications.",
    symptoms: [
      "Sudden loss of network signal",
      "Unable to make calls",
      "Unexpected SIM deactivation SMS",
      "Unrecognized bank transactions"
    ],
    prevention: [
      "Set SIM lock PIN",
      "Register for SIM swap alerts",
      "Use app-based 2FA instead of SMS",
      "Keep telecom customer ID private"
    ],
    immediateAction: [
      "Contact telecom provider immediately",
      "Freeze bank accounts",
      "Change all passwords",
      "File FIR at police station"
    ],
    reporting: [
      { name: "Telecom Provider", action: "Contact Support" },
      { name: "National Helpline", action: "Call 1930", url: "tel:1930" },
      { name: "Police", action: "File FIR" },
      { name: "Cyber Crime Portal", action: "Visit cybercrime.gov.in", url: "https://cybercrime.gov.in" }
    ]
  },
  "fake-loan-apps": {
    title: "Fake Loan Apps",
    icon: BadgeDollarSign,
    whatIsIt: "Predatory apps offer instant loans but charge hidden fees, access your contacts, and harass borrowers with threatening calls to contacts.",
    symptoms: [
      "Unsolicited loan offers via SMS",
      "Apps requesting access to contacts and photos",
      "Extremely high interest rates",
      "Harassment calls to contacts"
    ],
    prevention: [
      "Only use RBI-registered NBFCs",
      "Check app reviews",
      "Never grant contact/gallery permissions to loan apps",
      "Verify lender on RBI website"
    ],
    immediateAction: [
      "Uninstall the app",
      "Report to cybercrime.gov.in",
      "File complaint with RBI",
      "Document all harassment evidence"
    ],
    reporting: [
      { name: "RBI Complaints", action: "File Complaint", url: "https://cms.rbi.org.in" },
      { name: "Cyber Crime Portal", action: "Visit cybercrime.gov.in", url: "https://cybercrime.gov.in" },
      { name: "National Helpline", action: "Call 1930", url: "tel:1930" },
      { name: "Local Police", action: "File Complaint" }
    ]
  },
  "whatsapp-scam": {
    title: "WhatsApp Banking Scam",
    icon: MessageCircle,
    whatIsIt: "Scammers impersonate bank officials on WhatsApp, sending fake KYC update links or account verification messages to steal credentials.",
    symptoms: [
      "WhatsApp messages from unknown numbers with bank logos",
      "Links to update KYC",
      "Threats of account closure",
      "Requests to share card details"
    ],
    prevention: [
      "Banks never contact via WhatsApp for KYC",
      "Never click links in WhatsApp messages",
      "Verify by calling bank directly",
      "Report and block sender"
    ],
    immediateAction: [
      "Do not click any links",
      "Block and report sender",
      "Change banking passwords",
      "Inform bank about impersonation"
    ],
    reporting: [
      { name: "WhatsApp", action: "In-app Report" },
      { name: "National Helpline", action: "Call 1930", url: "tel:1930" },
      { name: "Cyber Crime Portal", action: "Visit cybercrime.gov.in", url: "https://cybercrime.gov.in" },
      { name: "Bank Fraud Dept", action: "Contact Bank" }
    ]
  }
};

export default function ScamGuide() {
  const { scamType } = useParams<{ scamType: string }>();
  const navigate = useNavigate();

  const guide = scamType ? SCAM_GUIDES[scamType] : null;

  if (!guide) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Guide not found</h1>
        <Button onClick={() => navigate("/cyber-help")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Cyber Help
        </Button>
      </div>
    );
  }

  const Icon = guide.icon;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Background blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/cyber-help")}
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cyber Help
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary/20 p-4 rounded-full">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">{guide.title}</h1>
        </div>

        <div className="space-y-6">
          {/* Section: What is it? */}
          <Card className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Info className="h-6 w-6 text-blue-400" />
              What is it?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {guide.whatIsIt}
            </p>
          </Card>

          {/* Section: Warning Signs */}
          <Card className="glass-card p-6 border-l-4 border-l-yellow-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              Warning Signs
            </h2>
            <ul className="space-y-3">
              {guide.symptoms.map((symptom, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-yellow-500/70 mt-0.5 flex-shrink-0" />
                  <span>{symptom}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Section: How to Prevent */}
          <Card className="glass-card p-6 border-l-4 border-l-green-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-green-500" />
              How to Prevent
            </h2>
            <ul className="space-y-3">
              {guide.prevention.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-green-500/70 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Section: Immediate Action */}
          <Card className="glass-card p-6 border-l-4 border-l-red-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              Immediate Action
            </h2>
            <div className="space-y-4">
              {guide.immediateAction.map((action, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center p-0 flex-shrink-0 border-red-500 text-red-500">
                    {idx + 1}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{action}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Section: Official Reporting Channels */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 mt-8">
              <Phone className="h-6 w-6 text-primary" />
              Official Reporting Channels
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {guide.reporting.map((channel, idx) => (
                <Card key={idx} className="glass-card p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold mb-1">{channel.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{channel.action}</p>
                  </div>
                  {channel.url && (
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary"
                      onClick={() => window.open(channel.url, channel.url.startsWith("tel:") ? "_self" : "_blank")}
                    >
                      {channel.url.startsWith("tel:") ? <Phone className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                      {channel.url.startsWith("tel:") ? "Call Now" : "Visit Website"}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
