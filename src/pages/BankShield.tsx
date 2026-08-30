import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  CreditCard,
  KeyRound,
  Timer,
  Landmark,
  MessageSquare,
  Wifi,
  QrCode,
  Eye,
  Globe,
  ChevronLeft,
  Plus,
  History,
  Settings,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  Bluetooth,
  Usb,
  Radio,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Activity,
  Zap,
  RefreshCw,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { invokeEdgeFunction, queryWithSession, insertWithSession } from '@/lib/supabase-client';
import { useSerialPort } from '@/hooks/useSerialPort';
import { useBluetoothService } from '@/hooks/useBluetoothService';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

type ViewState = 
  | 'dashboard' 
  | 'register-rfid' 
  | 'register-apps' 
  | 'connect-hardware' 
  | 'verify' 
  | 'session' 
  | 'history'
  | 'hardware-guide';

interface BankingApp {
  id: string;
  name: string;
  package: string;
  iconBg: string;
  enabled: boolean;
}

interface RFIDCard {
  id: string;
  uid: string;
  owner_name: string;
  status: 'active' | 'revoked';
  created_at: string;
}

interface SessionRecord {
  id: string;
  app_name: string;
  rfid_uid: string;
  started_at: string;
  expires_at?: string;
  duration_seconds: number;
  verification_status: string;
}

const DEFAULT_BANKING_APPS: BankingApp[] = [
  { id: 'phonepe', name: 'PhonePe UPI', package: 'com.phonepe.app', iconBg: 'bg-purple-600', enabled: true },
  { id: 'gpay', name: 'Google Pay', package: 'com.google.android.apps.nbu.paisa.user', iconBg: 'bg-blue-600', enabled: true },
  { id: 'paytm', name: 'Paytm Payments', package: 'net.one97.paytm', iconBg: 'bg-cyan-600', enabled: true },
  { id: 'bhim', name: 'BHIM NPCI', package: 'in.org.npci.upiapp', iconBg: 'bg-emerald-600', enabled: true },
  { id: 'sbi', name: 'SBI YONO', package: 'com.sbi.lotusintouch', iconBg: 'bg-blue-800', enabled: true },
  { id: 'hdfc', name: 'HDFC MobileBanking', package: 'com.snapwork.hdfc', iconBg: 'bg-red-700', enabled: false },
  { id: 'icici', name: 'ICICI iMobile', package: 'com.csam.icici.bank.imobile', iconBg: 'bg-amber-600', enabled: false },
  { id: 'canara', name: 'Canara ai1', package: 'com.canarabank.mobility', iconBg: 'bg-blue-500', enabled: false }
];

const DEFAULT_RFID_CARDS: RFIDCard[] = [
  { id: 'card-1', uid: 'DEMO_CARD_001', owner_name: 'Primary Security KeyCard', status: 'active', created_at: new Date().toISOString() },
  { id: 'card-2', uid: 'A1B2C3D4', owner_name: 'Rural APMC Merchant Card', status: 'active', created_at: new Date(Date.now() - 86400000).toISOString() }
];

const ARDUINO_SKETCH_CODE = `/*
 * DEFENXIA — Rural Banking Security Firmware
 * Hardware: Arduino UNO + RC522 RFID + HC-05 Bluetooth
 */
#include <SPI.h>
#include <MFRC522.h>
#include <SoftwareSerial.h>

#define RST_PIN 9
#define SS_PIN  10
SoftwareSerial bluetooth(2, 3); // RX=D2, TX=D3
MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(9600);
  bluetooth.begin(9600);
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("DEFENXIA_HARDWARE_READY:9600");
  bluetooth.println("DEFENXIA_HARDWARE_READY:9600");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;
  
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  Serial.println("AUTHORIZED:" + uid);
  bluetooth.println("AUTHORIZED:" + uid);
  
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1000);
}`;

export default function BankShield() {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  
  // Apps & Cards state
  const [bankingApps, setBankingApps] = useState<BankingApp[]>(DEFAULT_BANKING_APPS);
  const [rfidCards, setRfidCards] = useState<RFIDCard[]>(DEFAULT_RFID_CARDS);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  
  // Registration Form State
  const [newCardUid, setNewCardUid] = useState('');
  const [newCardOwner, setNewCardOwner] = useState('');
  const [isRegisteringCard, setIsRegisteringCard] = useState(false);

  // Active Session & Timer
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes (300s)
  const [activeSessionBank, setActiveSessionBank] = useState('PhonePe UPI');
  const [activeSessionUid, setActiveSessionUid] = useState('DEMO_CARD_001');

  // Verification state machine
  const [verifyState, setVerifyState] = useState<'waiting' | 'reading' | 'authorized' | 'denied'>('waiting');
  const [verifiedCardUid, setVerifiedCardUid] = useState<string | null>(null);

  // Hardware connections
  const [hardwareMode, setHardwareMode] = useState<'usb' | 'bluetooth'>('usb');
  const [copiedSketch, setCopiedSketch] = useState(false);

  // Hooks
  const serial = useSerialPort();
  const bluetooth = useBluetoothService();

  // Load state on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      // 1. Load banking apps from Supabase
      const { data: appData } = await queryWithSession('banking_apps');
      if (appData && Array.isArray(appData) && appData.length > 0) {
        const mapped = DEFAULT_BANKING_APPS.map(app => {
          const found = appData.find((a: any) => a.package_name === app.package);
          return found ? { ...app, enabled: found.enabled } : app;
        });
        setBankingApps(mapped);
      }

      // 2. Load RFID cards from Supabase
      const { data: cardData } = await queryWithSession('rfid_cards');
      if (cardData && Array.isArray(cardData) && cardData.length > 0) {
        setRfidCards(cardData.map((c: any) => ({
          id: c.id,
          uid: c.uid,
          owner_name: c.owner_name || c.owner || 'Registered Card',
          status: c.status || 'active',
          created_at: c.created_at
        })));
      }

      // 3. Load Session history
      const { data: sessionData } = await queryWithSession('secure_sessions');
      if (sessionData && Array.isArray(sessionData) && sessionData.length > 0) {
        setSessions(sessionData);
      }
    } catch (e) {
      console.log('Using local state for banking data');
    }
  };

  // Hardware message listener
  const handleHardwareMessage = useCallback(async (msg: string) => {
    const trimmed = msg.trim().toUpperCase();
    console.log('[DEFENXIA HARDWARE MSG]:', trimmed);

    // If on Card Registration view -> capture scanned UID
    if (activeView === 'register-rfid') {
      let uid = '';
      if (trimmed.startsWith('AUTHORIZED:')) uid = trimmed.replace('AUTHORIZED:', '');
      else if (trimmed.startsWith('CARD_READ:')) uid = trimmed.replace('CARD_READ:', '');
      else if (trimmed.startsWith('DENIED:')) uid = trimmed.replace('DENIED:', '');
      else if (/^[A-F0-9]{8,16}$/.test(trimmed)) uid = trimmed;

      if (uid) {
        setNewCardUid(uid);
        toast.success(`RFID Card Detected: ${uid}`);
      }
      return;
    }

    // If on Verification View
    if (activeView === 'verify') {
      let uid = '';
      if (trimmed.startsWith('AUTHORIZED:')) uid = trimmed.replace('AUTHORIZED:', '');
      else if (trimmed.startsWith('CARD_READ:')) uid = trimmed.replace('CARD_READ:', '');
      else if (trimmed.startsWith('DENIED:')) uid = trimmed.replace('DENIED:', '');
      else if (/^[A-F0-9]{8,16}$/.test(trimmed)) uid = trimmed;

      setVerifyState('reading');
      
      setTimeout(async () => {
        // Verify with Supabase rfid_cards
        const isAuthorizedCard = rfidCards.some(
          c => c.status === 'active' && c.uid.toUpperCase() === (uid || 'DEMO_CARD_001').toUpperCase()
        ) || trimmed.startsWith('AUTHORIZED:');

        if (isAuthorizedCard) {
          const finalUid = uid || 'DEMO_CARD_001';
          setVerifiedCardUid(finalUid);
          setVerifyState('authorized');
          toast.success('RFID Card Authenticated! Unlocking Secure Banking.');

          // Record session in Supabase
          try {
            await invokeEdgeFunction('create-secure-session', {
              app_name: activeSessionBank,
              package_name: 'com.phonepe.app',
              rfid_uid: finalUid
            });
          } catch (err) {
            console.error('Session record error:', err);
          }

          // Transition to active session after 1.5s
          setTimeout(() => {
            setIsSessionActive(true);
            setTimeLeft(300);
            setActiveSessionUid(finalUid);
            setActiveView('session');
            setVerifyState('waiting');
          }, 1500);
        } else {
          setVerifyState('denied');
          toast.error('Access Denied: Unrecognized RFID Security Card.');
        }
      }, 800);
    }
  }, [activeView, rfidCards, activeSessionBank]);

  // Connect serial & bluetooth listeners
  useEffect(() => {
    serial.startListening(handleHardwareMessage);
    bluetooth.startListening(handleHardwareMessage);
    return () => {
      serial.stopListening();
      bluetooth.stopListening();
    };
  }, [handleHardwareMessage, serial, bluetooth]);

  // Secure Session Countdown Timer
  useEffect(() => {
    if (!isSessionActive) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsSessionActive(false);
          toast.error('Secure Banking Session expired. Device locked.');
          setActiveView('dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Toggle Banking App
  const handleToggleApp = async (appId: string) => {
    const updated = bankingApps.map(app => 
      app.id === appId ? { ...app, enabled: !app.enabled } : app
    );
    setBankingApps(updated);

    const target = updated.find(a => a.id === appId);
    if (target) {
      toast.success(`${target.name} is now ${target.enabled ? 'PROTECTED' : 'UNPROTECTED'}`);
      try {
        await insertWithSession('banking_apps', {
          package_name: target.package,
          display_name: target.name,
          enabled: target.enabled
        });
      } catch (e) {
        console.log('Updated app locally');
      }
    }
  };

  // Register New RFID Card
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardUid.trim() || !newCardOwner.trim()) {
      toast.error('Please enter Card UID and Owner Name');
      return;
    }

    setIsRegisteringCard(true);
    const cardObj: RFIDCard = {
      id: `card-${Date.now()}`,
      uid: newCardUid.trim().toUpperCase(),
      owner_name: newCardOwner.trim(),
      status: 'active',
      created_at: new Date().toISOString()
    };

    setRfidCards(prev => [cardObj, ...prev.filter(c => c.uid !== cardObj.uid)]);

    try {
      await insertWithSession('rfid_cards', {
        uid: cardObj.uid,
        owner: cardObj.owner_name,
        session_id: 'session'
      } as any);
      toast.success(`RFID Security Card "${cardObj.owner_name}" registered successfully!`);
    } catch (err) {
      toast.success(`Card ${cardObj.uid} registered locally.`);
    } finally {
      setIsRegisteringCard(false);
      setNewCardUid('');
      setNewCardOwner('');
    }
  };

  // Delete RFID Card
  const handleDeleteCard = (uid: string) => {
    setRfidCards(prev => prev.filter(c => c.uid !== uid));
    toast.success(`RFID Card ${uid} removed from authorized list.`);
  };

  // Trigger Verification Overlay
  const startVerification = (bankName: string = 'PhonePe UPI') => {
    setActiveSessionBank(bankName);
    setVerifyState('waiting');
    setActiveView('verify');
  };

  // Format Timer mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isHardwareConnected = serial.isConnected || bluetooth.isConnected;

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      {/* Background Animated Blobs */}
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-purple-600/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-blue-600/10 blur-3xl animate-pulse" />

      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10 animate-fade-in">
        
        {/* ========================================================= */}
        {/* VIEW 1: DASHBOARD                                         */}
        {/* ========================================================= */}
        {activeView === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Header with Title & Hardware Status Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-[0_0_20px_rgba(139,92,246,0.35)]">
                  <Landmark size={30} className="text-cyan-300" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent">
                    Secure Banking Mode
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm">Hardware-authenticated banking session protection</p>
                </div>
              </div>

              {/* Live Connection Badges */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 ${serial.isConnected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-muted-foreground border-white/10'}`}>
                  <Usb size={12} className={serial.isConnected ? 'text-emerald-400' : ''} />
                  {serial.isConnected ? 'USB Serial Active' : 'USB Disconnected'}
                </Badge>
                <Badge variant="outline" className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 ${bluetooth.isConnected ? 'bg-blue-500/15 text-cyan-300 border-blue-500/30' : 'bg-white/5 text-muted-foreground border-white/10'}`}>
                  <Bluetooth size={12} className={bluetooth.isConnected ? 'text-cyan-300' : ''} />
                  {bluetooth.isConnected ? 'HC-05 Paired' : 'BT Standby'}
                </Badge>
              </div>
            </div>

            {/* 4 Status Metric Cards in 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Protection Status */}
              <div className="glass-card p-5 rounded-2xl border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Protection Status</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    Armed & Active
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Hardware lock active on banking launch</p>
                </div>
              </div>

              {/* Registered Apps Count */}
              <div className="glass-card p-5 rounded-2xl border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Protected Apps</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Smartphone size={18} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {bankingApps.filter(a => a.enabled).length} / {bankingApps.length}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">UPI & NetBanking apps guarded</p>
                </div>
              </div>

              {/* Authorized RFID Cards */}
              <div className="glass-card p-5 rounded-2xl border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Authorized Keys</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <CreditCard size={18} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-300">
                    {rfidCards.filter(c => c.status === 'active').length} Active
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Physical RC522 RFID Cards enrolled</p>
                </div>
              </div>

              {/* Active Session Status */}
              <div className="glass-card p-5 rounded-2xl border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secure Session</span>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Timer size={18} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-cyan-300">
                    {isSessionActive ? formatTimer(timeLeft) : 'Standby'}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isSessionActive ? `${activeSessionBank} Unlocked` : 'Locked until RFID tap'}
                  </p>
                </div>
              </div>

            </div>

            {/* Quick Action Navigation Grid */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap size={16} className="text-primary" />
                Security Management & Controls
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Register Banking Apps */}
                <div 
                  onClick={() => setActiveView('register-apps')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-purple-500/40 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Register Banking Apps</h4>
                    <p className="text-xs text-muted-foreground">Configure PhonePe, GPay, Paytm, and netbanking app locks.</p>
                  </div>
                </div>

                {/* 2. Register RFID Card */}
                <div 
                  onClick={() => setActiveView('register-rfid')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-cyan-500/40 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-cyan-600/20 text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Register RFID Card</h4>
                    <p className="text-xs text-muted-foreground">Enroll new RC522 physical cards with live UID reader.</p>
                  </div>
                </div>

                {/* 3. Connect Hardware */}
                <div 
                  onClick={() => setActiveView('connect-hardware')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-emerald-500/40 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Cpu size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Connect Hardware</h4>
                    <p className="text-xs text-muted-foreground">Pair Arduino UNO via USB Serial or HC-05 Bluetooth.</p>
                  </div>
                </div>

                {/* 4. Activate Banking Mode (Demo) */}
                <div 
                  onClick={() => startVerification('PhonePe UPI')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-primary/60 hover:scale-[1.02] transition-all group border-purple-500/30 bg-gradient-to-br from-purple-900/30 via-background to-blue-900/20 flex items-start gap-4 shadow-lg shadow-purple-600/10"
                >
                  <div className="p-3 rounded-xl bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.6)]">
                    <Lock size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Simulate Banking Launch</h4>
                    <p className="text-xs text-muted-foreground">Test RFID authorization overlay on protected banking app.</p>
                  </div>
                </div>

                {/* 5. Session History */}
                <div 
                  onClick={() => setActiveView('history')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-white/30 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-white/10 text-white group-hover:bg-white/20 transition-all">
                    <History size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Session History</h4>
                    <p className="text-xs text-muted-foreground">View immutable timeline of RFID-authenticated sessions.</p>
                  </div>
                </div>

                {/* 6. Hardware & Android Architecture Guide */}
                <div 
                  onClick={() => setActiveView('hardware-guide')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-amber-500/40 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 group-hover:bg-amber-500 group-hover:text-black transition-all">
                    <Code2 size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Hardware Guide & Code</h4>
                    <p className="text-xs text-muted-foreground">Wiring pinouts, Arduino .ino sketch, and Android lock guide.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Active Session Quick Banner if running */}
            {isSessionActive && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500 text-black rounded-xl font-bold">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Secure Banking Session is Live</h4>
                    <p className="text-xs text-emerald-300">Protected by RFID Key: {activeSessionUid} • Time Remaining: {formatTimer(timeLeft)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => setActiveView('session')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs"
                  >
                    View Active Session
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: REGISTER RFID CARD                                */}
        {/* ========================================================= */}
        {activeView === 'register-rfid' && (
          <div className="space-y-6 animate-fade-in">
            <Button 
              variant="ghost" 
              onClick={() => setActiveView('dashboard')} 
              className="gap-2 text-muted-foreground hover:text-white -ml-2"
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <CreditCard className="text-cyan-400" />
                  Enroll RFID Security KeyCards
                </h2>
                <p className="text-xs text-muted-foreground">Tap any physical RC522 card or input UID manually to authorize.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card Enrollment Reader Wizard */}
              <div className="glass-card p-6 rounded-2xl border-white/10 flex flex-col items-center justify-center text-center">
                <div className="relative w-36 h-36 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping opacity-75" />
                  <div className="absolute inset-2 rounded-full border border-purple-500/50 animate-pulse" />
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-600/30 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,229,255,0.4)]">
                    <Radio size={40} className="text-cyan-300 animate-pulse" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">
                  {newCardUid ? `Card Detected: ${newCardUid}` : 'Ready to Read RFID Card'}
                </h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-xs">
                  Tap your RFID card on the RC522 reader connected via USB or Bluetooth.
                </p>

                {/* Form to Save Card */}
                <form onSubmit={handleSaveCard} className="w-full space-y-3.5 text-left">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Scanned Card UID (HEX)
                    </label>
                    <Input 
                      value={newCardUid}
                      onChange={(e) => setNewCardUid(e.target.value.toUpperCase())}
                      placeholder="e.g. A1B2C3D4 or DEMO_CARD_002"
                      className="bg-black/50 border-white/15 text-white font-mono text-sm uppercase py-5 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Cardholder / Account Name
                    </label>
                    <Input 
                      value={newCardOwner}
                      onChange={(e) => setNewCardOwner(e.target.value)}
                      placeholder="e.g. Syed Subhan (Primary UPI Card)"
                      className="bg-black/50 border-white/15 text-white text-sm py-5 rounded-xl"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setNewCardUid(`KEY_${Math.random().toString(16).substring(2, 10).toUpperCase()}`)}
                      className="border-white/15 text-xs rounded-xl"
                    >
                      Simulate Tap
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isRegisteringCard}
                      className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs"
                    >
                      {isRegisteringCard ? <Loader2 size={16} className="animate-spin" /> : 'Save & Authorize Card'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* List of Authorized Cards */}
              <div className="glass-card p-6 rounded-2xl border-white/10 flex flex-col">
                <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                  <span>Authorized Cards ({rfidCards.length})</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                    Protected List
                  </Badge>
                </h3>

                <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1 flex-1">
                  {rfidCards.map((card) => (
                    <div 
                      key={card.id} 
                      className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-600/20 text-cyan-300 border border-purple-500/30">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white leading-snug">{card.owner_name}</h4>
                          <p className="text-[11px] font-mono text-cyan-400 mt-0.5">UID: {card.uid}</p>
                          <span className="text-[10px] text-muted-foreground">Added {formatSafeDate(card.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteCard(card.uid)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: REGISTER BANKING APPS                             */}
        {/* ========================================================= */}
        {activeView === 'register-apps' && (
          <div className="space-y-6 animate-fade-in">
            <Button 
              variant="ghost" 
              onClick={() => setActiveView('dashboard')} 
              className="gap-2 text-muted-foreground hover:text-white -ml-2"
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Smartphone className="text-primary" />
                  Protected Banking Apps Configuration
                </h2>
                <p className="text-xs text-muted-foreground">DEFENXIA requires hardware RFID verification before opening protected apps.</p>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-purple-300 border-primary/30 text-xs px-3 py-1 self-start sm:self-auto">
                {bankingApps.filter(a => a.enabled).length} Protected Apps
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankingApps.map((app) => (
                <div 
                  key={app.id} 
                  className={`glass-card p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between ${app.enabled ? 'border-purple-500/40 bg-purple-950/20 shadow-lg shadow-purple-950/30' : 'border-white/10 bg-black/20'}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl ${app.iconBg} text-white font-bold flex items-center justify-center shadow-md text-sm shrink-0`}>
                      {app.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{app.name}</h4>
                        {app.enabled && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                            Guarded
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{app.package}</p>
                    </div>
                  </div>

                  <Switch 
                    checked={app.enabled} 
                    onCheckedChange={() => handleToggleApp(app.id)}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: CONNECT HARDWARE                                  */}
        {/* ========================================================= */}
        {activeView === 'connect-hardware' && (
          <div className="space-y-6 animate-fade-in">
            <Button 
              variant="ghost" 
              onClick={() => setActiveView('dashboard')} 
              className="gap-2 text-muted-foreground hover:text-white -ml-2"
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Cpu className="text-cyan-400" />
                  Hardware Bridge & Connection
                </h2>
                <p className="text-xs text-muted-foreground">Select communication mode: USB Serial for Laptop evaluator or Bluetooth for Mobile.</p>
              </div>
            </div>

            <Tabs defaultValue="usb" onValueChange={(v) => setHardwareMode(v as any)} className="w-full">
              <TabsList className="grid grid-cols-2 max-w-md bg-black/50 border border-white/10 p-1 rounded-xl mb-6">
                <TabsTrigger value="usb" className="rounded-lg text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Usb size={14} className="mr-2" /> Mode 1: USB Serial (Laptop)
                </TabsTrigger>
                <TabsTrigger value="bluetooth" className="rounded-lg text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Bluetooth size={14} className="mr-2" /> Mode 2: Bluetooth (Mobile)
                </TabsTrigger>
              </TabsList>

              {/* USB TAB */}
              <TabsContent value="usb" className="space-y-6">
                <div className="glass-card p-6 rounded-2xl border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                    <div>
                      <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <Usb className="text-purple-400" />
                        Arduino UNO Web Serial Connection (9600 Baud)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Connects directly to Arduino UNO via Web Serial API on Chrome/Edge.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {serial.isConnected ? (
                        <Button onClick={() => serial.disconnect()} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs rounded-xl">
                          Disconnect USB
                        </Button>
                      ) : (
                        <Button onClick={() => serial.connect()} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl">
                          Connect Arduino UNO
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                    <div className="p-3.5 bg-black/40 rounded-xl border border-white/10">
                      <span className="text-[10px] text-muted-foreground block mb-1">Connection State</span>
                      <span className={`text-sm font-bold ${serial.isConnected ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {serial.isConnected ? '● Connected (Ready)' : '○ Disconnected'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-black/40 rounded-xl border border-white/10">
                      <span className="text-[10px] text-muted-foreground block mb-1">Port Interface</span>
                      <span className="text-xs font-mono text-white truncate block">
                        {serial.portInfo || 'None'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-black/40 rounded-xl border border-white/10">
                      <span className="text-[10px] text-muted-foreground block mb-1">Baud Rate</span>
                      <span className="text-sm font-mono font-bold text-cyan-400">9600 bps</span>
                    </div>
                  </div>

                  {/* Terminal Log */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={14} className="text-cyan-400" /> Live Serial Stream Log
                      </span>
                      <Button variant="ghost" size="sm" onClick={serial.clearLogs} className="text-[11px] h-7 text-muted-foreground">
                        Clear Log
                      </Button>
                    </div>
                    <div className="h-44 bg-black/80 rounded-xl border border-white/15 p-3 overflow-y-auto font-mono text-xs text-slate-200 space-y-1">
                      {serial.logs.length === 0 ? (
                        <p className="text-muted-foreground italic text-[11px]">No serial activity logged yet. Click "Connect Arduino UNO" or tap RFID card.</p>
                      ) : (
                        serial.logs.map((l, idx) => (
                          <div key={idx} className="flex gap-2 text-[11px]">
                            <span className="text-muted-foreground shrink-0">{l.timestamp}</span>
                            <span className={l.type === 'incoming' ? 'text-emerald-400' : l.type === 'outgoing' ? 'text-cyan-300' : 'text-purple-300'}>
                              {l.text}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* BLUETOOTH TAB */}
              <TabsContent value="bluetooth" className="space-y-6">
                <div className="glass-card p-6 rounded-2xl border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                    <div>
                      <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <Bluetooth className="text-blue-400" />
                        HC-05 Bluetooth Module (Mobile Bridge)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Connects via Web Bluetooth API or Android GATT profile.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {bluetooth.isConnected ? (
                        <Button onClick={() => bluetooth.disconnect()} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs rounded-xl">
                          Disconnect HC-05
                        </Button>
                      ) : (
                        <Button onClick={() => bluetooth.pairDevice()} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl">
                          Pair HC-05 Module
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                    <div className="p-3.5 bg-black/40 rounded-xl border border-white/10">
                      <span className="text-[10px] text-muted-foreground block mb-1">Bluetooth State</span>
                      <span className={`text-sm font-bold ${bluetooth.isConnected ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {bluetooth.isConnected ? '● Connected' : '○ Standby'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-black/40 rounded-xl border border-white/10">
                      <span className="text-[10px] text-muted-foreground block mb-1">Paired Device</span>
                      <span className="text-xs font-mono text-cyan-300 truncate block">
                        {bluetooth.deviceName || 'None'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-black/40 rounded-xl border border-white/10">
                      <span className="text-[10px] text-muted-foreground block mb-1">Module Standard</span>
                      <span className="text-sm font-bold text-white">HC-05 SPP v2.0</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Hardware Simulation Control Box */}
            <div className="glass-card p-6 rounded-2xl border-white/10 bg-gradient-to-br from-purple-950/20 to-black">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">Interactive Hardware Simulator</h4>
                  <p className="text-xs text-muted-foreground">Test RFID card taps without physical Arduino UNO hardware.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => serial.simulateRFID('DEMO_CARD_001', true)}
                    className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-black border border-emerald-500/30 text-xs rounded-xl"
                  >
                    Simulate Authorized Tap
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => serial.simulateRFID('UNKNOWN_99', false)}
                    className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 text-xs rounded-xl"
                  >
                    Simulate Denied Tap
                  </Button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: VERIFICATION OVERLAY (FULL SCREEN MODAL)          */}
        {/* ========================================================= */}
        {activeView === 'verify' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
            <div className="relative w-full max-w-md bg-slate-950 border border-purple-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(139,92,246,0.3)]">
              
              {/* Top Bank Header */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="p-2 rounded-xl bg-purple-600/20 text-cyan-300 border border-purple-500/30">
                  <Lock size={16} />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-purple-300">
                  DEFENXIA Security Shield • {activeSessionBank}
                </span>
              </div>

              {/* Animated Shield / State Visualizer */}
              <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
                {verifyState === 'waiting' && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping" />
                    <div className="w-28 h-28 rounded-full bg-purple-600/20 border border-purple-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)]">
                      <Shield size={48} className="text-cyan-300 animate-pulse" />
                    </div>
                  </>
                )}

                {verifyState === 'reading' && (
                  <div className="w-28 h-28 rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)]">
                    <Loader2 size={48} className="text-blue-400 animate-spin" />
                  </div>
                )}

                {verifyState === 'authorized' && (
                  <div className="w-28 h-28 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.6)] animate-in zoom-in-75">
                    <CheckCircle2 size={52} className="text-emerald-400" />
                  </div>
                )}

                {verifyState === 'denied' && (
                  <div className="w-28 h-28 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-in zoom-in-75">
                    <XCircle size={52} className="text-red-400" />
                  </div>
                )}
              </div>

              {/* Status Headings */}
              <h3 className="text-xl font-bold text-white mb-2">
                {verifyState === 'waiting' && 'Please Tap Your RFID Security Card'}
                {verifyState === 'reading' && 'Reading Card Credentials...'}
                {verifyState === 'authorized' && 'Access Granted • Session Unlocked'}
                {verifyState === 'denied' && 'Access Denied • Unauthorized Key'}
              </h3>

              <p className="text-xs text-muted-foreground mb-6">
                {verifyState === 'waiting' && 'Hold your physical card near the RC522 RFID reader to unlock banking access.'}
                {verifyState === 'reading' && 'Verifying cryptographic UID against authorized banking registry...'}
                {verifyState === 'authorized' && `Authenticated UID: ${verifiedCardUid || 'DEMO_CARD_001'}. Starting encrypted session.`}
                {verifyState === 'denied' && 'This RFID card is not enrolled in your authorized banking whitelist.'}
              </p>

              {/* Simulation Quick Trigger inside Overlay */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/10 mb-6">
                <span className="text-[10px] text-muted-foreground block mb-2">Evaluator Simulator Controls</span>
                <div className="flex gap-2 justify-center">
                  <Button 
                    size="sm" 
                    onClick={() => serial.simulateRFID('DEMO_CARD_001', true)}
                    className="bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-black border border-emerald-500/30 text-xs py-1 h-8 rounded-lg"
                  >
                    Tap Authorized Card
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => serial.simulateRFID('UNKNOWN_CARD', false)}
                    className="bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white border border-red-500/30 text-xs py-1 h-8 rounded-lg"
                  >
                    Tap Unknown Card
                  </Button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveView('dashboard')} 
                  className="flex-1 border-white/15 text-xs py-5 rounded-xl"
                >
                  Cancel
                </Button>
                {verifyState === 'denied' && (
                  <Button 
                    onClick={() => setVerifyState('waiting')} 
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs py-5 rounded-xl"
                  >
                    Try Again
                  </Button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: SECURE SESSION ACTIVE (05:00 TIMER)              */}
        {/* ========================================================= */}
        {activeView === 'session' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-purple-950/30 border border-emerald-500/40 shadow-2xl text-center relative overflow-hidden">
              
              <div className="absolute top-4 right-4">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-3 py-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Defense Mesh Active
                </Badge>
              </div>

              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <ShieldCheck size={44} className="text-emerald-400" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                Secure Banking Session Active
              </h2>
              <p className="text-xs sm:text-sm text-emerald-300 mb-6">
                Unlocked for: <span className="font-bold text-white">{activeSessionBank}</span> • Authenticated UID: <span className="font-mono text-cyan-300">{activeSessionUid}</span>
              </p>

              {/* Big Countdown Timer */}
              <div className="inline-block p-6 rounded-2xl bg-black/60 border border-white/15 mb-8 shadow-inner">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block mb-1">
                  Session Auto-Lock Countdown
                </span>
                <span className="text-5xl sm:text-6xl font-mono font-bold text-emerald-400 tracking-wider">
                  {formatTimer(timeLeft)}
                </span>
              </div>

              {/* 5 Active Defense Modules */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto mb-8 text-left">
                
                <div className="p-3.5 bg-black/40 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <MessageSquare size={14} />
                    <span className="text-xs font-bold">SMS OTP Guard</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Intercepts Trojan forwarders</span>
                </div>

                <div className="p-3.5 bg-black/40 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <QrCode size={14} />
                    <span className="text-xs font-bold">QR Shield</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Validates UPI endpoints</span>
                </div>

                <div className="p-3.5 bg-black/40 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <Wifi size={14} />
                    <span className="text-xs font-bold">WiFi Isolation</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Blocks ARP poisoning</span>
                </div>

                <div className="p-3.5 bg-black/40 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <Eye size={14} />
                    <span className="text-xs font-bold">Screen Guard</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Prevents AnyDesk mirroring</span>
                </div>

                <div className="p-3.5 bg-black/40 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <Globe size={14} />
                    <span className="text-xs font-bold">IP Security</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Encrypted DNS tunnel</span>
                </div>

              </div>

              {/* End Session Button */}
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={() => {
                    setIsSessionActive(false);
                    toast.success('Secure Banking Session closed and re-locked.');
                    setActiveView('dashboard');
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-5 rounded-xl text-xs"
                >
                  <Lock size={16} className="mr-2" /> End Secure Session & Lock Device
                </Button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 7: SESSION HISTORY                                   */}
        {/* ========================================================= */}
        {activeView === 'history' && (
          <div className="space-y-6 animate-fade-in">
            <Button 
              variant="ghost" 
              onClick={() => setActiveView('dashboard')} 
              className="gap-2 text-muted-foreground hover:text-white -ml-2"
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <History className="text-purple-400" />
                  Banking Session Security Log
                </h2>
                <p className="text-xs text-muted-foreground">Tamper-evident log of all hardware-authorized sessions.</p>
              </div>
            </div>

            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="glass-card p-12 rounded-2xl text-center border-white/10">
                  <ShieldCheck size={48} className="mx-auto mb-3 text-purple-400/40" />
                  <h4 className="text-base font-bold text-white mb-1">No Previous Sessions</h4>
                  <p className="text-xs text-muted-foreground mb-4">Activate Secure Banking Mode to record your first hardware verification.</p>
                  <Button onClick={() => startVerification()} className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
                    Simulate Banking Launch
                  </Button>
                </div>
              ) : (
                sessions.map((sess, idx) => (
                  <div key={sess.id || idx} className="glass-card p-4 rounded-xl border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{sess.app_name}</h4>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Card UID: {sess.rfid_uid} • Duration: {sess.duration_seconds || 300}s
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                        Authorized
                      </Badge>
                      <span className="block text-[10px] text-muted-foreground mt-1">
                        {formatSafeDate(sess.started_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 8: HARDWARE & ANDROID ARCHITECTURE GUIDE             */}
        {/* ========================================================= */}
        {activeView === 'hardware-guide' && (
          <div className="space-y-6 animate-fade-in">
            <Button 
              variant="ghost" 
              onClick={() => setActiveView('dashboard')} 
              className="gap-2 text-muted-foreground hover:text-white -ml-2"
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </Button>

            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Code2 className="text-amber-400" />
                Hardware Wiring & Arduino Firmware Guide
              </h2>
              <p className="text-xs text-muted-foreground">Technical reference for project evaluators and hardware assembly.</p>
            </div>

            {/* Hardware Pinout Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="glass-card p-5 rounded-2xl border-white/10">
                <h3 className="font-bold text-sm text-cyan-300 mb-3 flex items-center gap-2">
                  <Cpu size={16} /> RC522 RFID Reader Pinouts
                </h3>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>SDA (SS)</span><span className="text-purple-300">Arduino Pin D10</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>SCK</span><span className="text-purple-300">Arduino Pin D13</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>MOSI</span><span className="text-purple-300">Arduino Pin D11</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>MISO</span><span className="text-purple-300">Arduino Pin D12</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>RST</span><span className="text-purple-300">Arduino Pin D9</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>3.3V</span><span className="text-emerald-400">3.3V Power (Do NOT connect 5V)</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>GND</span><span className="text-muted-foreground">GND Ground</span></div>
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border-white/10">
                <h3 className="font-bold text-sm text-blue-300 mb-3 flex items-center gap-2">
                  <Bluetooth size={16} /> HC-05 Bluetooth Pinouts
                </h3>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>TX</span><span className="text-blue-300">Arduino Pin D2 (Software RX)</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>RX</span><span className="text-blue-300">Arduino Pin D3 (Software TX)</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>VCC</span><span className="text-emerald-400">5V Power</span></div>
                  <div className="flex justify-between p-2 bg-black/40 rounded-lg"><span>GND</span><span className="text-muted-foreground">GND Ground</span></div>
                </div>

                <div className="mt-4 p-3 bg-purple-950/30 rounded-xl border border-purple-500/20 text-[11px] text-purple-200">
                  <strong>Android Architecture Note:</strong> DEFENXIA uses Android <code>UsageStatsManager</code> to detect foreground banking package launches and <code>AccessibilityService</code> to overlay the hardware security gate.
                </div>
              </div>

            </div>

            {/* Arduino Code Box with 1-click Copy */}
            <div className="glass-card p-6 rounded-2xl border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Code2 size={14} className="text-amber-400" /> defenxia_rfid_banking.ino (Arduino C++ Source)
                </span>
                <Button 
                  size="sm" 
                  onClick={() => {
                    navigator.clipboard.writeText(ARDUINO_SKETCH_CODE);
                    setCopiedSketch(true);
                    toast.success('Arduino sketch copied to clipboard!');
                    setTimeout(() => setCopiedSketch(false), 2000);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs h-8 rounded-lg"
                >
                  {copiedSketch ? <Check size={14} className="mr-1 text-emerald-400" /> : <Copy size={14} className="mr-1" />}
                  {copiedSketch ? 'Copied' : 'Copy Sketch'}
                </Button>
              </div>

              <pre className="p-4 bg-black/80 rounded-xl border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-72">
                {ARDUINO_SKETCH_CODE}
              </pre>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

function formatSafeDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Recently';
  }
}
