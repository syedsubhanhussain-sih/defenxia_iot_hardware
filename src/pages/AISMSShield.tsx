import { useState } from "react";
import { Send, Bot, User, MessageSquareWarning, ShieldAlert, CheckCircle, Sparkles, Shield, AlertTriangle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invokeEdgeFunction } from "@/lib/supabase-client";
import { insertWithSession } from "@/lib/supabase-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface SMSScanResult {
  text: string;
  isFraud: boolean;
  keywords: string[];
  severity: 'safe' | 'warning' | 'critical';
  analysis: string;
}

const FRAUD_KEYWORDS = [
  'kyc', 'otp', 'verify your account', 'link expired', 'update kyc',
  'your account will be blocked', 'share otp', 'click here immediately',
  'pan card', 'aadhar', 'bank account suspended', 'urgent action',
  'lottery', 'prize', 'won', 'claim now', 'act now', 'limited time',
  'pin number', 'cvv', 'card number', 'transfer money', 'upi pin',
  'send money', 'loan approved', 'credit card blocked', 'atm blocked',
  'debit card', 'account deactivated', 'reactivate', 'expire today',
  'electricity bill', 'power cut', 'recharge reward', 'free cashback',
  'part time job', 'daily 5000', 'telegram link', 'task reward'
];

export function analyzeIncomingSMS(smsText: string): SMSScanResult {
  const lowerText = smsText.toLowerCase();
  const foundKeywords = FRAUD_KEYWORDS.filter(kw => lowerText.includes(kw));
  const isFraud = foundKeywords.length > 0;

  let severity: 'safe' | 'warning' | 'critical' = 'safe';
  if (foundKeywords.length >= 3) severity = 'critical';
  else if (foundKeywords.length >= 1) severity = 'warning';

  let analysis = '';
  if (severity === 'critical') {
    analysis = '🚨 CRITICAL SCAM DETECTED! This message contains multiple high-risk fraud signatures targeting your banking credentials or personal identity. DO NOT respond or click any links.';
  } else if (severity === 'warning') {
    analysis = '⚠️ Suspicious message detected. This appears to be a deceptive phishing attempt designed to panic the user. Verify directly with your bank branch.';
  } else {
    analysis = '✅ Message appears clean. No known phishing or financial fraud indicators detected.';
  }

  return { text: smsText, isFraud, keywords: foundKeywords, severity, analysis };
}

// Intelligent Cyber Defense AI Knowledge Engine
function generateIntelligentSecurityResponse(query: string): string {
  const q = query.toLowerCase();

  if (q.includes('sms') || q.includes('message') || q.includes('text')) {
    return `### 🛡️ AI SMS Security Analysis
1. **Never Click Links in SMS**: Banks and official institutions never send short-links (\`bit.ly\`, \`tinyurl\`, \`.apk\`) asking for credentials.
2. **Beware Urgent Threats**: Messages saying *"Your account will be suspended today"* or *"Electricity will be disconnected"* are 100% scams.
3. **Verify Sender Headers**: Authentic bank SMS headers look like **VM-SBIINB**, **AD-HDFCBK**, etc. Random 10-digit mobile numbers sending bank alerts are fraudsters.
4. **Action**: Forward malicious SMS to **1909** (Do Not Disturb) and report financial fraud to **1930**.`;
  }

  if (q.includes('upi') || q.includes('pin') || q.includes('qr') || q.includes('payment')) {
    return `### 💳 UPI & QR Code Security Rules
1. **Golden Rule**: **UPI PIN is entered ONLY to SEND money, NEVER to receive money.**
2. **QR Code Fraud**: If a buyer or stranger asks you to scan a QR code to receive a refund or payment, it is a scam.
3. **Fake Collect Requests**: Reject unknown collect requests on PhonePe, Google Pay, or Paytm.
4. **Immediate Emergency**: If unauthorized money was debited, call **1930** within 2 hours (Golden Hour) to freeze the transaction.`;
  }

  if (q.includes('kyc') || q.includes('pan') || q.includes('aadhaar') || q.includes('bank')) {
    return `### 🏦 Bank Account & KYC Protection
1. **No Online KYC over Calls**: Banks will never call you asking for OTP, CVV, or NetBanking passwords to update KYC.
2. **Beware Screen-Share Apps**: Fraudsters trick users into installing **AnyDesk**, **TeamViewer**, or **QuickSupport** to read your banking OTPs.
3. **Official Portals**: Always update bank details by physically visiting your home branch or using official bank apps.`;
  }

  if (q.includes('loan') || q.includes('app') || q.includes('job') || q.includes('task')) {
    return `### ⚠️ Illegal Loan Apps & Task Scams
1. **Predatory Loan Apps**: Check if the lender is an **RBI-registered NBFC** before installing. Never grant Contacts or Photo Gallery permissions.
2. **Part-time Job / YouTube Like Scams**: Fraudsters ask you to complete tasks on Telegram, pay small profits first, then demand large deposits.
3. **Report Immediately**: Report extortion apps at [cybercrime.gov.in](https://cybercrime.gov.in).`;
  }

  return `### 🛡️ DEFENXIA AI Security Intelligence
* **National Cyber Helpline**: Call **1930** (Toll-Free 24/7) immediately to report financial fraud.
* **National Portal**: File complaints with transaction screenshots at [cybercrime.gov.in](https://cybercrime.gov.in).
* **Core Protection Principle**: Keep your UPI PIN, OTPs, and NetBanking passwords confidential under all circumstances.`;
}

const AISMSShield = () => {
  // AI Chatbot state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your DEFENXIA AI Security Analyst. I can help analyze suspicious SMS messages, detect banking fraud patterns, and provide cybersecurity guidance. How can I protect you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // SMS Scanner state
  const [smsText, setSmsText] = useState("");
  const [scanResults, setScanResults] = useState<SMSScanResult[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SMSScanResult | null>(null);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    const currentQuery = inputMessage;
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Try edge function first
      const { data, error } = await invokeEdgeFunction('ai-analysis', {
        message: currentQuery
      });

      let aiResponse = data?.response;

      if (!aiResponse || error) {
        // Use smart intelligent cyber defense engine
        aiResponse = generateIntelligentSecurityResponse(currentQuery);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch {
      const fallbackResponse = generateIntelligentSecurityResponse(currentQuery);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: fallbackResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSMSScan = async () => {
    if (!smsText.trim()) return;

    const result = analyzeIncomingSMS(smsText);
    setScanResults(prev => [result, ...prev]);

    if (result.isFraud) {
      setCurrentAlert(result);
      setShowAlert(true);

      // Push to Supabase
      try {
        await insertWithSession('security_threats' as any, {
          type: 'sms_fraud',
          content: smsText,
          severity: result.severity,
        } as any);
      } catch (err) {
        console.error('Failed to log threat:', err);
      }

      toast.error('⚠️ Scam SMS Detected!', {
        description: `Found ${result.keywords.length} fraud keyword(s)`
      });
    } else {
      toast.success('✅ SMS appears safe');
    }

    setSmsText("");
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse -z-10" />

      <div className="container mx-auto max-w-3xl flex flex-col p-4 animate-fade-in">
        <div className="p-4 mb-4 glass-card rounded-2xl border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <MessageSquareWarning className="h-7 w-7 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent">
                AI SMS Shield
              </h1>
              <p className="text-xs text-muted-foreground">AI-powered SMS fraud detection & security analyst for rural banking</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="sms-scan" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/10 p-1 rounded-xl mb-4">
            <TabsTrigger value="sms-scan" className="rounded-lg text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              📱 SMS Fraud Scanner
            </TabsTrigger>
            <TabsTrigger value="ai-chat" className="rounded-lg text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              🤖 AI Security Chatbot
            </TabsTrigger>
          </TabsList>

          {/* SMS Scan Tab */}
          <TabsContent value="sms-scan" className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border-white/10 space-y-3">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-300" /> Paste SMS to Scan for Phishing & Fraud
              </h3>
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="Paste a suspicious SMS message here...&#10;&#10;Example: 'Dear Customer, your SBI account KYC has expired. Update immediately at link or account will be blocked within 24 hours.'"
                className="w-full h-32 bg-black/40 border border-white/15 rounded-xl p-3.5 text-xs text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => setSmsText("Dear SBI User, your account has been deactivated due to pending PAN KYC. Click http://sbi-kyc-verify.xyz/update to reactivate immediately.")}
                  variant="outline" 
                  className="border-white/15 text-[11px] h-9 text-muted-foreground"
                >
                  Load Example Scam SMS
                </Button>
                <Button 
                  onClick={handleSMSScan} 
                  disabled={!smsText.trim()} 
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-xs h-9 rounded-xl shadow-lg shadow-purple-600/20"
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Scan with AI Shield
                </Button>
              </div>
            </div>

            {/* Scan Results */}
            <div className="space-y-3">
              {scanResults.map((result, index) => (
                <div
                  key={index}
                  className={`glass-card rounded-2xl p-4 border transition-all ${
                    result.severity === 'critical' ? 'border-red-500/40 bg-red-950/20' :
                    result.severity === 'warning' ? 'border-amber-500/40 bg-amber-950/20' :
                    'border-emerald-500/40 bg-emerald-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      result.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      result.severity === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {result.severity.toUpperCase()} THREAT
                    </span>
                    {result.isFraud ? (
                      <ShieldAlert className="h-5 w-5 text-red-400" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 italic">"{result.text}"</p>
                  <p className="text-xs font-medium text-white">{result.analysis}</p>
                  {result.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {result.keywords.map((kw, i) => (
                        <span key={i} className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-md font-mono border border-red-500/30">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* AI Chatbot Tab */}
          <TabsContent value="ai-chat" className="flex-1 flex flex-col glass-card rounded-2xl border-white/10 p-4">
            <ScrollArea className="flex-1 max-h-[420px] pr-2">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2.5 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="flex-shrink-0">
                        {message.sender === 'ai' ? (
                          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                            <Bot size={16} className="text-cyan-300" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                            <User size={16} className="text-blue-300" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                          message.sender === 'ai'
                            ? 'bg-black/60 text-slate-100 border border-white/10'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium shadow-md'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <p className="text-[10px] opacity-60 mt-1 font-mono">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                      <Bot size={16} className="text-cyan-300 animate-pulse" />
                    </div>
                    <div className="bg-black/60 border border-white/10 rounded-2xl p-3.5">
                      <div className="flex gap-1.5 items-center">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Suggested Question Chips */}
            <div className="flex flex-wrap gap-1.5 my-3 pt-2 border-t border-white/10">
              {['How to spot fake KYC SMS?', 'Someone sent a QR code to pay me', 'Fake loan app harassment', 'How to contact 1930?'].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputMessage(chip);
                  }}
                  className="text-[10px] bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white px-2.5 py-1 rounded-full border border-white/10 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask AI about SMS fraud, UPI scams, banking safety..."
                disabled={isLoading}
                className="flex-1 bg-black/50 border-white/15 text-xs text-white rounded-xl py-5"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-5"
              >
                <Send size={16} />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Scam Alert Modal */}
        <Dialog open={showAlert} onOpenChange={setShowAlert}>
          <DialogContent className="border-red-500/40 bg-slate-950/95 backdrop-blur-2xl text-white max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2 text-lg">
                <ShieldAlert className="h-6 w-6 text-red-400" />
                🚨 SCAM SMS DETECTED!
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2 text-left">
                {currentAlert && (
                  <>
                    <p className="text-white font-medium text-xs leading-relaxed">{currentAlert.analysis}</p>
                    <div className="bg-black/60 border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground italic">"{currentAlert.text}"</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentAlert.keywords.map((kw, i) => (
                        <span key={i} className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-mono">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-amber-300 font-semibold flex items-center gap-1.5 pt-1">
                      <AlertTriangle size={14} className="shrink-0 text-amber-400" /> Never share OTP, UPI PIN, or KYC links over SMS.
                    </p>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setShowAlert(false)} className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl py-5 mt-2">
              I Understand - Dismiss Alert
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AISMSShield;
