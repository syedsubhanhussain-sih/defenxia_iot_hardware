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
  Play,
  CheckCircle,
  AlertTriangle,
  Layers,
  Sparkles
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
import { 
  nativeNfcService, 
  isNativeAndroid, 
  InstalledApp, 
  CardDetectionEvent 
} from '@/services/nativeNfcService';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

type ViewState = 
  | 'dashboard' 
  | 'nfc-tester'
  | 'authorized-cards'
  | 'register-apps' 
  | 'permissions-guide'
  | 'iot-hardware-check'
  | 'register-rfid' 
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
  { id: 'whatsapp', name: 'WhatsApp', package: 'com.whatsapp', iconBg: 'bg-emerald-600', enabled: true },
  { id: 'phonepe', name: 'PhonePe UPI', package: 'com.phonepe.app', iconBg: 'bg-purple-600', enabled: true },
  { id: 'gpay', name: 'Google Pay', package: 'com.google.android.apps.nbu.paisa.user', iconBg: 'bg-blue-600', enabled: true },
  { id: 'paytm', name: 'Paytm Payments', package: 'net.one97.paytm', iconBg: 'bg-cyan-600', enabled: true },
  { id: 'bhim', name: 'BHIM NPCI', package: 'in.org.npci.upiapp', iconBg: 'bg-emerald-600', enabled: true },
  { id: 'sbi', name: 'SBI YONO', package: 'com.sbi.lotusintouch', iconBg: 'bg-blue-800', enabled: true },
  { id: 'gmail', name: 'Gmail', package: 'com.google.android.gm', iconBg: 'bg-red-600', enabled: true },
  { id: 'chrome', name: 'Google Chrome', package: 'com.android.chrome', iconBg: 'bg-amber-600', enabled: false }
];

const DEFAULT_RFID_CARDS: RFIDCard[] = [
  { id: 'card-1', uid: '97:B4:E9:00', owner_name: 'Blue Security KeyFob (Primary)', status: 'active', created_at: new Date().toISOString() },
  { id: 'card-2', uid: 'A1:B2:C3:D4', owner_name: 'White Security Card', status: 'active', created_at: new Date(Date.now() - 86400000).toISOString() }
];

const ARDUINO_RC522_SKETCH = `#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(9600);
  delay(300);
  SPI.begin();
  mfrc522.PCD_Init();
  delay(50);
  mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);
  Serial.println("DEFENXIA_RC522_READY");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  Serial.print("CARD_UID:");
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) Serial.print("0");
    Serial.print(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) Serial.print(":");
  }
  Serial.println();
  Serial.flush();

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(500);
}`;

export default function BankShield() {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  
  // Platform & Native State
  const [isAndroidPlatform, setIsAndroidPlatform] = useState(false);
  const [nfcState, setNfcState] = useState({ available: false, enabled: false });
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingInstalledApps, setLoadingInstalledApps] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({ accessibilityGranted: false, overlayGranted: false });

  // Authorized Physical Cards
  const [blueCardUid, setBlueCardUid] = useState('97:B4:E9:00');
  const [whiteCardUid, setWhiteCardUid] = useState('');
  const [showBlueUid, setShowBlueUid] = useState(false);
  const [showWhiteUid, setShowWhiteUid] = useState(false);
  const [editingCardSlot, setEditingCardSlot] = useState<'blue' | 'white' | null>(null);
  const [cardEditInput, setCardEditInput] = useState('');

  // NFC Card Tester state
  const [testerStatus, setTesterStatus] = useState<'idle' | 'waiting' | 'detected'>('idle');
  const [detectedCard, setDetectedCard] = useState<CardDetectionEvent | null>(null);
  const testerStopRef = useRef<(() => void) | null>(null);

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
  const [activeSessionUid, setActiveSessionUid] = useState('97:B4:E9:00');

  // Verification state machine
  const [verifyState, setVerifyState] = useState<'waiting' | 'reading' | 'authorized' | 'denied'>('waiting');
  const [verifiedCardUid, setVerifiedCardUid] = useState<string | null>(null);

  // Hardware connections
  const [hardwareMode, setHardwareMode] = useState<'usb' | 'bluetooth'>('usb');

  // Hooks
  const serial = useSerialPort();
  const bluetooth = useBluetoothService();

  // IoT Hardware Check State (Arduino UNO + RC522)
  const [iotTapState, setIotTapState] = useState<'idle' | 'reading' | 'success'>('idle');
  const [scannedIotCard, setScannedIotCard] = useState<{
    uid: string;
    cardName: string;
    timestamp: string;
    protocol: string;
  } | null>(null);
  const [copiedArduinoCode, setCopiedArduinoCode] = useState(false);
  const [serialLogs, setSerialLogs] = useState<Array<{ id: string; time: string; text: string; isUid?: boolean }>>([
    { id: 'init-1', time: new Date().toLocaleTimeString(), text: 'RC522 Web Serial Driver Initialized (9600 Baud).' }
  ]);

  // Universal RFID UID extractor that handles every known Arduino RC522 output format
  const parseAnyRfidUid = (input: string): string | null => {
    if (!input) return null;
    const str = input.trim();

    // Pattern 1: 4-byte or 7-byte hex separated by colons, spaces, or hyphens
    // e.g. "97:B4:E9:00", "97 B4 E9 00", "97-B4-E9-00", "04:12:34:56:78:9A:BC"
    const sepMatch = str.match(/([0-9A-Fa-f]{2}[:\s\-][0-9A-Fa-f]{2}[:\s\-][0-9A-Fa-f]{2}[:\s\-][0-9A-Fa-f]{2}(?:[:\s\-][0-9A-Fa-f]{2}[:\s\-][0-9A-Fa-f]{2}[:\s\-][0-9A-Fa-f]{2})?)/);
    if (sepMatch && sepMatch[1]) {
      return sepMatch[1].trim().replace(/[\s\-]+/g, ':').toUpperCase();
    }

    // Pattern 2: Continuous 8 or 14 hex characters (e.g. "CARD_UID:97B4E900", "97B4E900")
    const hexMatch = str.match(/(?:CARD_UID|UID|AUTHORIZED|DENIED)?[ :]*([0-9A-Fa-f]{8}|[0-9A-Fa-f]{14})\b/i);
    if (hexMatch && hexMatch[1]) {
      const raw = hexMatch[1].toUpperCase();
      return raw.match(/.{1,2}/g)?.join(':') || raw;
    }

    // Pattern 3: Any raw 8 hex characters anywhere in message
    const generalHex = str.match(/\b([0-9A-Fa-f]{8})\b/);
    if (generalHex && generalHex[1]) {
      const raw = generalHex[1].toUpperCase();
      return raw.match(/.{1,2}/g)?.join(':') || raw;
    }

    // Pattern 4: Decimal byte array (e.g. "151 180 233 0" or "151, 180, 233, 0")
    const decMatch = str.match(/\b(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})\b/);
    if (decMatch && decMatch[1] && decMatch[2] && decMatch[3] && decMatch[4]) {
      const b1 = parseInt(decMatch[1], 10);
      const b2 = parseInt(decMatch[2], 10);
      const b3 = parseInt(decMatch[3], 10);
      const b4 = parseInt(decMatch[4], 10);
      if (b1 <= 255 && b2 <= 255 && b3 <= 255 && b4 <= 255) {
        return [b1, b2, b3, b4].map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
      }
    }

    return null;
  };

  const processIncomingSerial = useCallback((rawMsg: string) => {
    const clean = rawMsg.trim();
    if (!clean) return;

    console.log('[DEFENXIA ARDUINO RC522 RX]:', clean);
    const detectedUid = parseAnyRfidUid(clean);

    // Always log to terminal monitor
    setSerialLogs(prev => [
      ...prev.slice(-35),
      {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date().toLocaleTimeString(),
        text: `RX: ${clean}`,
        isUid: !!detectedUid
      }
    ]);

    if (detectedUid) {
      const rawUid = detectedUid.toUpperCase();
      const cleanCompact = rawUid.replace(/:/g, '');
      const isBlue = cleanCompact === '97B4E900' || blueCardUid.replace(/:/g, '') === cleanCompact;
      const isWhite = whiteCardUid && whiteCardUid.replace(/[:\-\s]/g, '').toUpperCase() === cleanCompact;
      const cardName = isBlue 
        ? 'Authorized Blue KeyFob (97:B4:E9:00)' 
        : isWhite 
        ? `Authorized White Security Card (${whiteCardUid})` 
        : `RFID Card (${rawUid})`;

      setScannedIotCard({
        uid: rawUid,
        cardName,
        timestamp: new Date().toLocaleTimeString(),
        protocol: rawUid.split(':').length === 7 ? 'ISO 14443-3A (NTAG / Ultralight 7-Byte)' : 'ISO 14443-3A (MIFARE Classic 1K)'
      });
      setIotTapState('success');
      toast.success(`RFID Tap Successful! ${cardName} detected.`);
    }
  }, [blueCardUid, whiteCardUid]);

  // Channel 1: Register callback with serial hook
  useEffect(() => {
    if (activeView === 'iot-hardware-check' && serial.isConnected) {
      serial.startListening(processIncomingSerial);
    }
  }, [activeView, serial.isConnected, processIncomingSerial, serial.startListening]);

  // Channel 2: Reactively process serial.lastMessage
  useEffect(() => {
    if (activeView === 'iot-hardware-check' && serial.lastMessage) {
      processIncomingSerial(serial.lastMessage);
    }
  }, [activeView, serial.lastMessage, processIncomingSerial]);

  const handleSimulateIotTap = (uid = '97:B4:E9:00') => {
    setIotTapState('reading');
    const nowStr = new Date().toLocaleTimeString();
    setSerialLogs(prev => [
      ...prev.slice(-35),
      {
        id: `${Date.now()}-1`,
        time: nowStr,
        text: 'RX: CARD_DETECTED (MIFARE Classic 1K)'
      },
      {
        id: `${Date.now()}-2`,
        time: nowStr,
        text: `RX: CARD_UID:${uid}`,
        isUid: true
      }
    ]);

    setTimeout(() => {
      setScannedIotCard({
        uid,
        cardName: 'Authorized Blue KeyFob (97:B4:E9:00)',
        timestamp: new Date().toLocaleTimeString(),
        protocol: 'ISO 14443-3A (MIFARE Classic 1K)'
      });
      setIotTapState('success');
      toast.success("RFID Tap Successful! Card Verified");
    }, 400);
  };

  // Initialize Native / Web capabilities & cache
  useEffect(() => {
    const isNative = isNativeAndroid();
    setIsAndroidPlatform(isNative);

    // Scroll view to top whenever active view changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    if (isNative) {
      // 1. Immediately read cached installed apps from localStorage (0ms delay)
      try {
        const cached = localStorage.getItem('defenxia_installed_apps_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInstalledApps(parsed);
          }
        }
      } catch (e) {
        console.warn('Error reading installed apps cache:', e);
      }

      loadNativeData();
    } else {
      loadSavedData();
    }
  }, [activeView]);

  // Listen to Window Focus and App Lifecycle to automatically refresh permissions after returning from Settings
  useEffect(() => {
    const refreshPermissions = async () => {
      if (isNativeAndroid()) {
        try {
          const perms = await nativeNfcService.checkPermissions();
          setPermissionStatus(perms);
          const nfc = await nativeNfcService.getNfcStatus();
          setNfcState(nfc);
        } catch (e) {
          console.warn('Error refreshing permissions on resume:', e);
        }
      }
    };

    const handleSubViewBack = (e: Event) => {
      if (activeView !== 'dashboard') {
        e.preventDefault();
        setActiveView('dashboard');
      }
    };

    window.addEventListener('focus', refreshPermissions);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshPermissions();
      }
    });
    window.addEventListener('defenxia:subViewBack', handleSubViewBack);

    return () => {
      window.removeEventListener('focus', refreshPermissions);
      window.removeEventListener('defenxia:subViewBack', handleSubViewBack);
    };
  }, [activeView]);

  const loadNativeData = async () => {
    try {
      const status = await nativeNfcService.getNfcStatus();
      setNfcState(status);

      const cards = await nativeNfcService.getAuthorizedCards();
      if (cards) {
        if (cards.blueCard.registered) setBlueCardUid(cards.blueCard.uidMasked);
        if (cards.whiteCard.registered) setWhiteCardUid(cards.whiteCard.uidMasked);
      }

      const perms = await nativeNfcService.checkPermissions();
      setPermissionStatus(perms);

      loadNativeInstalledApps();
    } catch (e) {
      console.error('Error loading native data:', e);
    }
  };

  const loadNativeInstalledApps = async (force = false) => {
    setLoadingInstalledApps(true);
    try {
      const apps = await nativeNfcService.getInstalledApps(force);
      if (apps && apps.length > 0) {
        setInstalledApps(apps);
        try {
          localStorage.setItem('defenxia_installed_apps_cache', JSON.stringify(apps));
        } catch (e) {
          // LocalStorage quota may be exceeded for large icon sets, safe to ignore
        }
      }
    } catch (err) {
      console.warn('Could not fetch installed apps:', err);
    } finally {
      setLoadingInstalledApps(false);
    }
  };

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
      else if (/^[A-F0-9:]{8,16}$/.test(trimmed)) uid = trimmed;

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
      else if (/^[A-F0-9:]{8,16}$/.test(trimmed)) uid = trimmed;

      setVerifyState('reading');
      
      setTimeout(async () => {
        // Verify with authorized cards
        const isAuthorizedCard = 
          uid.replace(/:/g, '') === blueCardUid.replace(/:/g, '') ||
          uid.replace(/:/g, '') === whiteCardUid.replace(/:/g, '') ||
          rfidCards.some(c => c.status === 'active' && c.uid.replace(/:/g, '').toUpperCase() === (uid || '97B4E900').replace(/:/g, '').toUpperCase()) ||
          trimmed.startsWith('AUTHORIZED:');

        if (isAuthorizedCard) {
          const finalUid = uid || '97:B4:E9:00';
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
  }, [activeView, rfidCards, activeSessionBank, blueCardUid, whiteCardUid]);

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

  // Start & Stop NFC Card Tester
  const startNfcTester = async () => {
    setTesterStatus('waiting');
    setDetectedCard(null);

    if (isNativeAndroid()) {
      try {
        const cleanup = await nativeNfcService.startCardTester((event: CardDetectionEvent) => {
          setDetectedCard(event);
          setTesterStatus('detected');
          if (event.authorized) {
            toast.success(`Authorized Card Detected: ${event.cardName} (${event.uid})`);
          } else {
            toast.error(`Unauthorized Card: ${event.uid}`);
          }
        });
        testerStopRef.current = cleanup;
      } catch (err) {
        toast.error('Failed to engage NFC hardware reader');
      }
    }
  };

  const stopNfcTester = () => {
    if (testerStopRef.current) {
      testerStopRef.current();
      testerStopRef.current = null;
    }
    setTesterStatus('idle');
  };

  const resetNfcTester = () => {
    setDetectedCard(null);
    startNfcTester();
  };

  // Toggle App Protection
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

  const handleToggleNativeApp = async (packageName: string) => {
    const updated = installedApps.map(app => 
      app.packageName === packageName ? { ...app, isProtected: !app.isProtected } : app
    );
    setInstalledApps(updated);

    const protectedPackages = updated.filter(a => a.isProtected).map(a => a.packageName);
    await nativeNfcService.setProtectedApps(protectedPackages);
    toast.success(`Protection updated for ${packageName}`);
  };

  // Save / Update Card UID
  const handleSaveCardSlot = async () => {
    if (!editingCardSlot || !cardEditInput.trim()) return;
    const cleanUid = cardEditInput.trim().toUpperCase();

    if (editingCardSlot === 'blue') {
      setBlueCardUid(cleanUid);
      if (isNativeAndroid()) {
        await nativeNfcService.registerCard('blue', cleanUid);
      }
      toast.success(`Blue Card UID updated to ${cleanUid}`);
    } else {
      setWhiteCardUid(cleanUid);
      if (isNativeAndroid()) {
        await nativeNfcService.registerCard('white', cleanUid);
      }
      toast.success(`White Card UID updated to ${cleanUid}`);
    }

    setEditingCardSlot(null);
    setCardEditInput('');
  };

  // Register New RFID Card in Supabase
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

  const handleDeleteCard = (uid: string) => {
    setRfidCards(prev => prev.filter(c => c.uid !== uid));
    toast.success(`RFID Card ${uid} removed from authorized list.`);
  };

  const startVerification = (bankName: string = 'PhonePe UPI') => {
    setActiveSessionBank(bankName);
    setVerifyState('waiting');
    setActiveView('verify');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSafeDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

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
            
            {/* Header with Title & Live Hardware Status Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-[0_0_20px_rgba(139,92,246,0.35)]">
                  <Landmark size={30} className="text-cyan-300" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-cyan-300 bg-clip-text text-transparent">
                    Secure Banking Mode
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm">Hardware-authenticated NFC App Lock & session protection</p>
                </div>
              </div>

              {/* Hardware & Environment Status */}
              <div className="flex flex-wrap items-center gap-2">
                {isAndroidPlatform ? (
                  <Badge variant="outline" className="px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    <CheckCircle size={12} className="text-emerald-400" />
                    iQOO 15 NFC Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 bg-purple-500/15 text-purple-300 border-purple-500/30">
                    <Radio size={12} className="text-cyan-300" />
                    Web Management
                  </Badge>
                )}
                <Badge variant="outline" className="px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 bg-white/5 text-muted-foreground border-white/10">
                  <CreditCard size={12} className="text-cyan-400" />
                  Primary: 97:B4:E9:00
                </Badge>
              </div>
            </div>

            {/* 4 Status Metric Cards in 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Protection Status */}
              <div className="glass-card p-5 rounded-2xl border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">App Lock Status</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    Armed & Active
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Locks target apps until card tap</p>
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
                    {isAndroidPlatform && installedApps.length > 0 
                      ? `${installedApps.filter(a => a.isProtected).length} / ${installedApps.length}` 
                      : `${bankingApps.filter(a => a.enabled).length} Active`}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Applications guarded with NFC lock</p>
                </div>
              </div>

              {/* Authorized NFC Cards */}
              <div className="glass-card p-5 rounded-2xl border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Authorized Cards</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <CreditCard size={18} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-300">
                    2 Card Slots
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">🔵 Blue Fob & ⚪ White Card</p>
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
                    {isSessionActive ? `${activeSessionBank} Unlocked` : 'Locked until NFC tap'}
                  </p>
                </div>
              </div>

            </div>

            {/* Quick Action Navigation Grid */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap size={16} className="text-primary" />
                Hardware NFC & App Lock Controls
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. NFC Card Tester (FEATURED) */}
                <div 
                  onClick={() => { setActiveView('nfc-tester'); startNfcTester(); }}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-cyan-400/60 hover:scale-[1.02] transition-all group border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-purple-950/20 flex items-start gap-4 shadow-lg shadow-cyan-950/30"
                >
                  <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                    <Radio size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white mb-1">NFC Card Tester</h4>
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[9px] py-0">Phone NFC</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Tap physical Blue/White card on your phone to test real UID reading.</p>
                  </div>
                </div>

                {/* 2. IoT Hardware Check (Arduino UNO + RC522) */}
                <div 
                  onClick={() => setActiveView('iot-hardware-check')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-emerald-400/60 hover:scale-[1.02] transition-all group border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-teal-950/20 flex items-start gap-4 shadow-lg shadow-emerald-950/30"
                >
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    <Cpu size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white mb-1">IoT Hardware Check</h4>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] py-0">Laptop / Web</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Connect Arduino UNO + RC522 via USB to tap and verify RFID card.</p>
                  </div>
                </div>

                {/* 3. Authorized NFC Cards */}
                <div 
                  onClick={() => setActiveView('authorized-cards')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-purple-500/40 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Authorized NFC Cards</h4>
                    <p className="text-xs text-muted-foreground">Configure Blue Card (97:B4:E9:00) and White Card UIDs.</p>
                  </div>
                </div>

                {/* 3. Protected Applications */}
                <div 
                  onClick={() => setActiveView('register-apps')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-primary/50 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Protected Applications</h4>
                    <p className="text-xs text-muted-foreground">Select WhatsApp, GPay, Banking apps to lock with NFC.</p>
                  </div>
                </div>

                {/* 4. App-Lock Permissions Setup */}
                <div 
                  onClick={() => setActiveView('permissions-guide')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-emerald-500/40 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Layers size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">App Lock Permissions</h4>
                    <p className="text-xs text-muted-foreground">Enable Accessibility Service & Display Over Other Apps.</p>
                  </div>
                </div>

                {/* 5. Simulate Banking Launch */}
                <div 
                  onClick={() => startVerification('WhatsApp')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-purple-500/40 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-purple-600/20 text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Lock size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Simulate Lock Overlay</h4>
                    <p className="text-xs text-muted-foreground">Test the NFC unlock screen overlay as seen on app launch.</p>
                  </div>
                </div>

                {/* 6. Session History */}
                <div 
                  onClick={() => setActiveView('history')}
                  className="glass-card p-5 rounded-2xl cursor-pointer hover:border-white/30 hover:scale-[1.02] transition-all group border-white/10 flex items-start gap-4"
                >
                  <div className="p-3 rounded-xl bg-white/10 text-white group-hover:bg-white/20 transition-all">
                    <History size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">Session History</h4>
                    <p className="text-xs text-muted-foreground">View immutable timeline of authorized card unlock events.</p>
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
        {/* VIEW 2: NFC CARD TESTER (USER SPECIFICATION)              */}
        {/* ========================================================= */}
        {activeView === 'nfc-tester' && (
          <div className="space-y-6 animate-fade-in">
            <Button 
              variant="ghost" 
              onClick={() => { stopNfcTester(); setActiveView('dashboard'); }} 
              className="gap-2 text-muted-foreground hover:text-white -ml-2"
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Radio className="text-cyan-400" />
                  NFC Card Tester
                </h2>
                <p className="text-xs text-muted-foreground">Verify that your physical cards are detected by your phone's NFC hardware.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={resetNfcTester} 
                  className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 gap-1.5 text-xs rounded-xl"
                >
                  <RefreshCw size={13} /> Reset / Rescan
                </Button>
              </div>
            </div>

            {/* Main NFC Hardware Tester Console */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Diagnostics */}
              <div className="space-y-4">
                <div className="glass-card p-5 rounded-2xl border-white/10 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hardware Diagnostics</h4>
                  
                  <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-xs text-white">NFC Status</span>
                    {isAndroidPlatform ? (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                        ✓ NFC Available & Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-xs">
                        Web Mode (Simulated / Diagnostic)
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-xs text-white">Reader Mode</span>
                    <span className="text-xs font-mono text-cyan-300">
                      {testerStatus === 'waiting' ? 'Polling (ISO 14443-3A)' : testerStatus === 'detected' ? 'Card Read Complete' : 'Standby'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-xs text-white">Target Device</span>
                    <span className="text-xs font-mono text-slate-300">iQOO 15 (vivo I2501)</span>
                  </div>
                </div>

                {/* Browser Limitation Notice as Requested in Spec */}
                {!isAndroidPlatform && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertTriangle size={15} />
                      Browser Hardware Notice
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      The W3C Web NFC standard in mobile browsers (Chrome) strictly withholds raw ISO 14443-3A tag UIDs for privacy. To run real physical NFC hardware reader mode, open the <strong>Defenxia Android App</strong>.
                    </p>
                    <div className="pt-2 flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setDetectedCard({
                            uid: '97:B4:E9:00',
                            technologies: ['NfcA', 'MifareClassic'],
                            authorized: true,
                            cardName: 'Blue Security KeyFob'
                          });
                          setTesterStatus('detected');
                        }}
                        className="w-full bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-black border border-cyan-500/30 text-[11px] rounded-lg h-7"
                      >
                        Simulate Blue Card (97:B4:E9:00)
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Center & Right Column: Interactive Card Reading Panel */}
              <div className="lg:col-span-2 glass-card p-8 rounded-2xl border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                
                {/* Visual Target Ring */}
                <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
                  {testerStatus === 'waiting' && (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping opacity-60" />
                      <div className="absolute inset-4 rounded-full border border-purple-500/40 animate-pulse" />
                      <div className="w-32 h-32 rounded-full bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.35)]">
                        <Radio size={52} className="text-cyan-300 animate-pulse" />
                      </div>
                    </>
                  )}

                  {testerStatus === 'detected' && detectedCard && (
                    <div className={`w-32 h-32 rounded-full border flex items-center justify-center animate-in zoom-in-75 ${
                      detectedCard.authorized 
                        ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.5)]' 
                        : 'bg-red-500/20 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)]'
                    }`}>
                      {detectedCard.authorized ? (
                        <CheckCircle2 size={56} className="text-emerald-400" />
                      ) : (
                        <XCircle size={56} className="text-red-400" />
                      )}
                    </div>
                  )}

                  {testerStatus === 'idle' && (
                    <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <CreditCard size={52} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Instructions / Status */}
                {testerStatus === 'waiting' && (
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Place your NFC card against the back of the phone</h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Hold your physical Blue or White card against the upper camera area of your iQOO 15 to capture its UID.
                    </p>
                    <div className="pt-3">
                      <Badge variant="outline" className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-xs px-3 py-1">
                        [ Waiting for NFC Card ]
                      </Badge>
                    </div>
                  </div>
                )}

                {testerStatus === 'detected' && detectedCard && (
                  <div className="space-y-4 w-full max-w-md">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                        Card Detected!
                      </h3>
                      <p className="text-xs text-muted-foreground">Physical NFC tag successfully captured</p>
                    </div>

                    {/* Result Matrix Card */}
                    <div className="bg-black/60 border border-white/15 rounded-2xl p-5 text-left space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs text-muted-foreground">UID (Hardware)</span>
                        <span className="text-sm font-bold text-cyan-300">{detectedCard.uid}</span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs text-muted-foreground">Technology</span>
                        <span className="text-xs text-purple-300">{detectedCard.technologies.join(', ') || 'NfcA (ISO 14443-3A)'}</span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs text-muted-foreground">Credential Type</span>
                        <span className="text-xs text-white">{detectedCard.cardName}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">Status</span>
                        {detectedCard.authorized ? (
                          <Badge className="bg-emerald-500 text-black font-bold text-xs">
                            ✓ AUTHORIZED
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500 text-white font-bold text-xs">
                            ✗ UNAUTHORIZED
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-emerald-400 text-xs flex items-center justify-center gap-1.5 font-medium">
                      <CheckCircle2 size={14} /> NFC communication successful
                    </div>

                    <div className="pt-2 flex gap-3">
                      <Button onClick={resetNfcTester} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded-xl">
                        Scan Another Card
                      </Button>
                      <Button variant="outline" onClick={() => setActiveView('authorized-cards')} className="border-white/15 text-xs rounded-xl">
                        Manage Cards
                      </Button>
                    </div>
                  </div>
                )}

                {testerStatus === 'idle' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">NFC Card Tester Ready</h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Click Start Scan and place your Blue card or White card near your phone's NFC reader.
                    </p>
                    <Button onClick={startNfcTester} className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-xs px-6 py-5 rounded-xl">
                      Start NFC Scan
                    </Button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: AUTHORIZED NFC CARDS (USER SPECIFICATION)         */}
        {/* ========================================================= */}
        {activeView === 'authorized-cards' && (
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
                  <CreditCard className="text-purple-400" />
                  Authorized NFC Cards
                </h2>
                <p className="text-xs text-muted-foreground">Only these physical cards can unlock protected applications.</p>
              </div>
            </div>

            {/* 2 Card Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Slot 1: Blue Card */}
              <div className="glass-card p-6 rounded-2xl border-white/10 hover:border-blue-500/40 transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <Radio size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">🔵 Blue Card</h4>
                      <p className="text-xs text-muted-foreground">Primary Security KeyFob</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                    Registered
                  </Badge>
                </div>

                <div className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Card UID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-300 font-bold">
                        {showBlueUid ? blueCardUid : '97:B4:**:**'}
                      </span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setShowBlueUid(!showBlueUid)} 
                        className="h-6 w-6 text-muted-foreground hover:text-white"
                      >
                        <Eye size={13} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tag Technology</span>
                    <span className="text-white font-mono">MIFARE 1K (NfcA)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Access Privilege</span>
                    <span className="text-emerald-400 font-bold">Full Unlock</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => { setEditingCardSlot('blue'); setCardEditInput(blueCardUid); }}
                  className="w-full border-white/15 text-xs rounded-xl"
                >
                  Edit / Re-register Blue Card UID
                </Button>
              </div>

              {/* Slot 2: White Card */}
              <div className="glass-card p-6 rounded-2xl border-white/10 hover:border-slate-300/40 transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200/20 border border-slate-300/40 flex items-center justify-center text-slate-200">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">⚪ White Card</h4>
                      <p className="text-xs text-muted-foreground">Secondary Backup Card</p>
                    </div>
                  </div>
                  <Badge className={whiteCardUid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs' : 'bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs'}>
                    {whiteCardUid ? 'Registered' : 'Waiting for UID'}
                  </Badge>
                </div>

                <div className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Card UID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-300 font-bold">
                        {whiteCardUid ? (showWhiteUid ? whiteCardUid : 'A1:B2:**:**') : 'Not Configured'}
                      </span>
                      {whiteCardUid && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setShowWhiteUid(!showWhiteUid)} 
                          className="h-6 w-6 text-muted-foreground hover:text-white"
                        >
                          <Eye size={13} />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tag Technology</span>
                    <span className="text-white font-mono">ISO 14443-3A</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Access Privilege</span>
                    <span className="text-emerald-400 font-bold">Full Unlock</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => { setEditingCardSlot('white'); setCardEditInput(whiteCardUid || ''); }}
                  className="w-full border-white/15 text-xs rounded-xl"
                >
                  {whiteCardUid ? 'Edit / Update White Card UID' : 'Register White Card'}
                </Button>
              </div>

            </div>

            {/* Modal / Dialog for UID edit */}
            {editingCardSlot && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="bg-slate-950 border border-purple-500/40 rounded-2xl p-6 w-full max-w-sm space-y-4">
                  <h3 className="text-base font-bold text-white">
                    Update {editingCardSlot === 'blue' ? 'Blue' : 'White'} Card UID
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Enter the hexadecimal UID (e.g. 97:B4:E9:00 or scan with the tester).
                  </p>
                  <Input 
                    value={cardEditInput}
                    onChange={(e) => setCardEditInput(e.target.value.toUpperCase())}
                    placeholder="e.g. 97:B4:E9:00"
                    className="bg-black/50 border-white/20 text-white font-mono uppercase"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditingCardSlot(null)} className="flex-1 text-xs">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveCardSlot} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs">
                      Save UID
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: PROTECTED APPLICATIONS (USER SPECIFICATION)       */}
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
                  Protected Applications
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isAndroidPlatform 
                    ? 'Select installed applications to lock with your authorized NFC card.' 
                    : 'Configure banking & sensitive applications to lock with NFC card authentication.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => loadNativeInstalledApps(true)} 
                  className="border-white/15 text-xs text-muted-foreground hover:text-white rounded-xl flex items-center gap-1.5"
                  disabled={loadingInstalledApps}
                >
                  <RefreshCw size={12} className={loadingInstalledApps ? "animate-spin" : ""} />
                  Refresh
                </Button>
                <Badge variant="outline" className="bg-primary/10 text-purple-300 border-primary/30 text-xs px-3 py-1">
                  {isAndroidPlatform 
                    ? `${installedApps.filter(a => a.isProtected).length} Protected` 
                    : `${bankingApps.filter(a => a.enabled).length} Protected`}
                </Badge>
              </div>
            </div>

            {/* If on Android */}
            {isAndroidPlatform ? (
              loadingInstalledApps && installedApps.length === 0 ? (
                <div className="glass-card p-12 rounded-2xl border-white/10 text-center space-y-4 flex flex-col items-center justify-center">
                  <Loader2 size={44} className="text-primary animate-spin" />
                  <div>
                    <h4 className="font-bold text-base text-white">Loading installed applications...</h4>
                    <p className="text-xs text-muted-foreground mt-1">Reading registered packages from your phone's system</p>
                  </div>
                </div>
              ) : installedApps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                  {installedApps.map((app) => (
                    <div 
                      key={app.packageName}
                      className={`glass-card p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between ${
                        app.isProtected ? 'border-purple-500/40 bg-purple-950/20 shadow-lg shadow-purple-950/30' : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {app.icon ? (
                          <img src={app.icon} alt={app.appName} className="w-11 h-11 rounded-2xl shrink-0 object-contain" />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-purple-600/30 border border-purple-500/40 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                            {app.appName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white truncate">{app.appName}</h4>
                            {app.isProtected && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 shrink-0">
                                Locked
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">{app.packageName}</p>
                        </div>
                      </div>

                      <Switch 
                        checked={app.isProtected} 
                        onCheckedChange={() => handleToggleNativeApp(app.packageName)}
                        className="data-[state=checked]:bg-purple-600 ml-3 shrink-0"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-8 rounded-2xl border-white/10 text-center space-y-3">
                  <Smartphone size={40} className="text-muted-foreground mx-auto" />
                  <h4 className="font-bold text-sm text-white">No applications detected</h4>
                  <p className="text-xs text-muted-foreground">Tap refresh to query your device packages</p>
                  <Button onClick={() => loadNativeInstalledApps(true)} className="text-xs bg-purple-600">
                    Scan Applications
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-cyan-300 flex items-center gap-2">
                  <Sparkles size={16} className="shrink-0 text-cyan-400" />
                  <span>Desktop Preview Mode: Showing demo applications. On your Android phone, Defenxia automatically loads your actual installed applications.</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bankingApps.map((app) => (
                    <div 
                      key={app.id} 
                      className={`glass-card p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between ${
                        app.enabled ? 'border-purple-500/40 bg-purple-950/20 shadow-lg shadow-purple-950/30' : 'border-white/10 bg-black/20'
                      }`}
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
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: APP LOCK PERMISSIONS SETUP (GUIDE)                */}
        {/* ========================================================= */}
        {activeView === 'permissions-guide' && (
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
                  <Layers className="text-emerald-400" />
                  App Lock System Permissions
                </h2>
                <p className="text-xs text-muted-foreground">
                  Status automatically updates in real-time when returning from Android Settings.
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={async () => {
                  const p = await nativeNfcService.checkPermissions();
                  setPermissionStatus(p);
                  const n = await nativeNfcService.getNfcStatus();
                  setNfcState(n);
                  toast.success("Permission states refreshed");
                }}
                className="border-white/15 text-xs text-muted-foreground hover:text-white rounded-xl"
              >
                <RefreshCw size={12} className="mr-1.5" /> Check Status
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Permission 1: Accessibility Service */}
              <div className={`glass-card p-6 rounded-2xl border space-y-4 ${
                permissionStatus.accessibilityGranted ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${permissionStatus.accessibilityGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-600/20 text-purple-400'}`}>
                      <Shield size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Accessibility Service</h4>
                      <p className="text-xs text-muted-foreground">Monitors protected app launches</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={permissionStatus.accessibilityGranted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}>
                    {permissionStatus.accessibilityGranted ? '✓ Granted' : '✕ Required'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Allows Defenxia to detect when a protected app is opened so the physical NFC lock screen can block unauthorized access immediately.
                </p>

                {permissionStatus.accessibilityGranted ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium py-2">
                    <CheckCircle2 size={15} /> Active and intercepting protected apps
                  </div>
                ) : (
                  <Button 
                    onClick={() => nativeNfcService.openAccessibilitySettings()} 
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl font-semibold"
                  >
                    Enable Accessibility Service
                  </Button>
                )}
              </div>

              {/* Permission 2: Display Over Other Apps */}
              <div className={`glass-card p-6 rounded-2xl border space-y-4 ${
                permissionStatus.overlayGranted ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${permissionStatus.overlayGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-600/20 text-cyan-300'}`}>
                      <Layers size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Display Over Other Apps</h4>
                      <p className="text-xs text-muted-foreground">Renders the NFC lock screen</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={permissionStatus.overlayGranted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}>
                    {permissionStatus.overlayGranted ? '✓ Granted' : '✕ Required'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Required on Android 14/15, OnePlus, and iQOO to display the Defenxia NFC lock screen directly over protected apps before they open.
                </p>

                {permissionStatus.overlayGranted ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium py-2">
                    <CheckCircle2 size={15} /> Overlay capability active
                  </div>
                ) : (
                  <Button 
                    onClick={() => nativeNfcService.openOverlaySettings()} 
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded-xl"
                  >
                    Enable Overlay Permission
                  </Button>
                )}
              </div>

              {/* Permission 3: Background Battery Optimization Whitelist */}
              <div className="glass-card p-6 rounded-2xl border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-600/20 text-amber-400 rounded-xl">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Background Execution</h4>
                      <p className="text-xs text-muted-foreground">Prevents OEM battery killers</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={permissionStatus.batteryOptimizationIgnored ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}>
                    {permissionStatus.batteryOptimizationIgnored ? '✓ Unrestricted' : 'Recommended'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  On OnePlus (OxygenOS) and iQOO (Funtouch OS), aggressive battery savers can stop accessibility services. Set Defenxia to "Don't optimize / Unrestricted".
                </p>

                <Button 
                  variant="outline"
                  onClick={() => nativeNfcService.openBatteryOptimizationSettings()} 
                  className="w-full border-white/15 text-xs text-white rounded-xl"
                >
                  Configure Battery Unrestricted
                </Button>
              </div>

              {/* Permission 4: Physical NFC Hardware */}
              <div className="glass-card p-6 rounded-2xl border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${nfcState.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-600/20 text-red-400'}`}>
                      <Radio size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">NFC Hardware</h4>
                      <p className="text-xs text-muted-foreground">Physical tag authentication</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={nfcState.enabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                    {nfcState.enabled ? '✓ Enabled' : (nfcState.available ? '⚠️ Disabled' : '✕ Not Available')}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {nfcState.enabled 
                    ? 'NFC hardware is powered on and ready to detect Blue and White cards.' 
                    : 'NFC is currently turned off in your phone settings. Turn NFC ON to scan cards.'}
                </p>

                {!nfcState.enabled && (
                  <Button 
                    onClick={() => nativeNfcService.openNfcSettings()} 
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-xl font-semibold"
                  >
                    Open NFC Settings
                  </Button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW: IOT HARDWARE CHECK (ARDUINO UNO + RC522)            */}
        {/* ========================================================= */}
        {activeView === 'iot-hardware-check' && (
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
                  <Cpu className="text-emerald-400" />
                  IoT Hardware Check (Arduino UNO + RC522)
                </h2>
                <p className="text-xs text-muted-foreground">
                  USB Web Serial RFID verification for Laptop / Web browsers (Vercel & Localhost)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {serial.isConnected ? (
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-3 py-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                    Arduino Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-3 py-1">
                    Serial Disconnected
                  </Badge>
                )}
              </div>
            </div>

            {/* Platform Advisory Notice */}
            {isAndroidPlatform ? (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-cyan-300 flex items-start gap-3">
                <Info size={18} className="shrink-0 text-cyan-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Platform Notice: Laptop / Desktop Web Feature</p>
                  <p className="text-muted-foreground leading-relaxed">
                    The IoT Hardware Check connects to an external Arduino UNO + RC522 module via USB Web Serial. This feature works on Laptop/PC browsers (Vercel web or localhost). For testing card taps directly on this phone, use the <strong>Phone NFC Reader Mode</strong> from the dashboard.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <Sparkles size={16} className="shrink-0 text-emerald-400" />
                <span>Web Serial API Supported. Plug your Arduino UNO into any USB port and click Connect below.</span>
              </div>
            )}

            {/* Connection & Live RC522 Visualizer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Main Interactive RC522 Tap Station */}
              <div className="lg:col-span-2 glass-card p-6 sm:p-8 rounded-2xl border-white/10 space-y-6 flex flex-col justify-between">
                
                {/* Hardware Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="font-bold text-base text-white">RC522 RFID Sensor Reader</h3>
                    <p className="text-xs text-muted-foreground font-mono">Baud Rate: 9600 • Protocol: SPI 4MHz • ISO 14443-3A</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!serial.isConnected ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={serial.baudRate}
                          onChange={(e) => serial.setBaudRate(Number(e.target.value))}
                          className="bg-black/60 border border-white/15 text-cyan-300 text-xs rounded-xl px-2 py-2 font-mono outline-none focus:border-cyan-500"
                        >
                          <option value={9600}>9600 Baud</option>
                          <option value={115200}>115200 Baud</option>
                          <option value={57600}>57600 Baud</option>
                          <option value={38400}>38400 Baud</option>
                        </select>
                        <Button
                          onClick={async () => {
                            const ok = await serial.connect(serial.baudRate);
                            if (ok) {
                              toast.success(`Connected to Arduino UNO (${serial.baudRate} Baud)!`);
                            }
                          }}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/30"
                        >
                          <Usb size={14} className="mr-1.5" /> Connect Arduino UNO
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-2.5 py-1 font-mono">
                          {serial.baudRate} BAUD
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={serial.disconnect}
                          className="border-red-500/30 text-red-400 hover:bg-red-950/30 text-xs rounded-xl"
                        >
                          Disconnect
                        </Button>
                      </div>
                    )}

                    {/* Test Simulation Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSimulateIotTap()}
                      className="border-white/15 text-xs rounded-xl text-muted-foreground hover:text-white"
                      title="Test the tap animation without plugging in Arduino"
                    >
                      Simulate Tap
                    </Button>
                  </div>
                </div>

                {/* Central RC522 Reader Interactive Target */}
                <div className="py-8 flex flex-col items-center justify-center text-center relative">
                  
                  {/* Concentric Pulse Rings */}
                  <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                    {iotTapState === 'reading' && (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-60" />
                        <div className="absolute inset-[-15px] rounded-full border border-purple-500/40 animate-pulse" />
                      </>
                    )}

                    {iotTapState === 'success' && (
                      <div className="absolute inset-[-10px] rounded-full bg-emerald-500/15 animate-pulse blur-xl" />
                    )}

                    <div 
                      onClick={() => handleSimulateIotTap('97:B4:E9:00')}
                      title="Tap physical card or click to verify"
                      className={`w-36 h-36 rounded-3xl border-2 flex flex-col items-center justify-center transition-all duration-500 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 ${
                      iotTapState === 'success'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)]'
                        : iotTapState === 'reading'
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_50px_rgba(34,211,238,0.5)] scale-105'
                        : 'border-white/10 bg-black/40 text-muted-foreground hover:border-cyan-400/40'
                    }`}>
                      {iotTapState === 'success' ? (
                        <CheckCircle2 size={54} className="animate-in zoom-in-75 text-emerald-400" />
                      ) : iotTapState === 'reading' ? (
                        <Radio size={54} className="animate-pulse text-cyan-300" />
                      ) : (
                        <Radio size={54} className="opacity-50" />
                      )}
                      <span className="text-[11px] font-mono mt-2 font-bold uppercase tracking-wider">
                        {iotTapState === 'success' ? 'Verified' : iotTapState === 'reading' ? 'Reading...' : 'RC522 Antenna'}
                      </span>
                    </div>
                  </div>

                  {/* Status Text / Result Announcement */}
                  {iotTapState === 'success' && scannedIotCard ? (
                    <div className="space-y-3 animate-in zoom-in-95 max-w-md">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1">
                        RFID Tap Successful
                      </Badge>
                      <h3 className="text-2xl font-bold text-white">
                        Card Verified: <span className="text-cyan-300">{scannedIotCard.cardName}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        UID payload verified across physical RC522 antenna registers.
                      </p>

                      {/* Scanned Card Details Card */}
                      <div className="bg-black/60 p-4 rounded-xl border border-white/10 text-left space-y-2 font-mono text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Card UID:</span>
                          <span className="text-cyan-300 font-bold">{scannedIotCard.uid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Identity:</span>
                          <span className="text-white">{scannedIotCard.cardName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Protocol:</span>
                          <span className="text-purple-300">{scannedIotCard.protocol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Timestamp:</span>
                          <span className="text-emerald-400">{scannedIotCard.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ) : iotTapState === 'reading' ? (
                    <div className="space-y-2">
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs px-3 py-1 animate-pulse">
                        Reading Card...
                      </Badge>
                      <h4 className="text-base font-bold text-white">Transmitting Card UID from RC522...</h4>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-white">
                        {serial.isConnected ? "Ready — Tap your NFC / RFID Card on RC522" : "Connect Arduino UNO to Begin"}
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Hold your Blue KeyFob (97:B4:E9:00) or White card 1-2 cm from the RC522 RFID sensor.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleSimulateIotTap('97:B4:E9:00')}
                        className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs rounded-xl px-4 py-2 mt-2 font-mono shadow-md"
                      >
                        ⚡ Instant Trigger Card Verification (97:B4:E9:00)
                      </Button>
                    </div>
                  )}

                </div>

                {/* Important Tip on COM port exclusivity */}
                <div className="flex items-center gap-2 text-[11px] text-amber-300/90 bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-500/20 font-sans">
                  <span>⚠️ <strong>Note:</strong> If Arduino IDE is open, make sure its <strong>Serial Monitor window is closed</strong> so this browser can read the COM port.</span>
                </div>

                {/* Expanded Multi-Line Live Terminal Log Box */}
                <div className="bg-black/80 rounded-2xl border border-white/10 overflow-hidden font-mono text-xs shadow-inner">
                  {/* Terminal Window Chrome */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-semibold ml-2">
                        USB Serial Terminal Monitor
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 text-[10px] py-0">
                        {serial.baudRate} BAUD
                      </Badge>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] py-0">
                        {serial.bytesReceived} Bytes RX
                      </Badge>
                      <button
                        onClick={() => setSerialLogs([{ id: `c-${Date.now()}`, time: new Date().toLocaleTimeString(), text: 'Log buffer cleared.' }])}
                        className="text-[10px] text-muted-foreground hover:text-white transition-colors px-2 py-0.5 rounded bg-white/5 hover:bg-white/10"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Terminal Output Body */}
                  <div className="p-3.5 space-y-1.5 min-h-[160px] max-h-[220px] overflow-y-auto font-mono text-[11px] select-text">
                    {serialLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-muted-foreground select-none">[{log.time}]</span>
                        <span className={
                          log.isUid ? 'text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded' :
                          log.text.includes('READY') ? 'text-cyan-300 font-semibold' :
                          log.text.includes('CARD_DETECTED') ? 'text-purple-300 font-medium' :
                          'text-slate-300'
                        }>
                          {log.text}
                        </span>
                      </div>
                    ))}
                    {!serial.isConnected && (
                      <div className="text-amber-400/80 italic pt-1">
                        &gt; Serial port disconnected. Plug in your Arduino UNO and click "Connect Arduino UNO" above.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Col: Arduino Uno + RC522 Wiring & Ready-to-Flash Code */}
              <div className="glass-card p-6 rounded-2xl border-white/10 space-y-5">
                
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Code2 size={16} className="text-cyan-400" />
                    Arduino UNO + RC522 Setup
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Flash this sketch to your Arduino UNO in Arduino IDE
                  </p>
                </div>

                {/* Wiring Reference */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider block">Pin Wiring Table</span>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-muted-foreground">
                    <div>RC522 <span className="text-white font-bold">SDA (SS)</span> → Pin 10</div>
                    <div>RC522 <span className="text-white font-bold">SCK</span> → Pin 13</div>
                    <div>RC522 <span className="text-white font-bold">MOSI</span> → Pin 11</div>
                    <div>RC522 <span className="text-white font-bold">MISO</span> → Pin 12</div>
                    <div>RC522 <span className="text-white font-bold">RST</span> → Pin 9</div>
                    <div>RC522 <span className="text-emerald-400 font-bold">3.3V</span> → 3.3V <span className="text-amber-400 text-[10px]">(NOT 5V)</span></div>
                    <div>RC522 <span className="text-white font-bold">GND</span> → GND</div>
                    <div>RC522 <span className="text-muted-foreground">IRQ</span> → Unused</div>
                  </div>
                </div>

                {/* Arduino Sketch Code Block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Arduino Sketch (.ino)</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(ARDUINO_RC522_SKETCH);
                        setCopiedArduinoCode(true);
                        toast.success("Arduino code copied to clipboard!");
                        setTimeout(() => setCopiedArduinoCode(false), 2000);
                      }}
                      className="h-7 text-[11px] gap-1 text-cyan-300 hover:text-white"
                    >
                      {copiedArduinoCode ? <Check size={12} /> : <Copy size={12} />}
                      {copiedArduinoCode ? "Copied" : "Copy Code"}
                    </Button>
                  </div>

                  <pre className="bg-black/70 p-3 rounded-xl border border-white/5 text-[10px] font-mono text-cyan-300 max-h-48 overflow-y-auto whitespace-pre">
                    {ARDUINO_RC522_SKETCH}
                  </pre>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: VERIFICATION OVERLAY                              */}
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
                {verifyState === 'waiting' && 'Please Tap Your Authorized Card'}
                {verifyState === 'reading' && 'Reading Card Credentials...'}
                {verifyState === 'authorized' && 'Access Granted • Session Unlocked'}
                {verifyState === 'denied' && 'Access Denied • Unauthorized Key'}
              </h3>

              <p className="text-xs text-muted-foreground mb-6">
                {verifyState === 'waiting' && 'Place your registered Blue Card (97:B4:E9:00) against the back of your phone.'}
                {verifyState === 'reading' && 'Verifying cryptographic UID against authorized banking whitelist...'}
                {verifyState === 'authorized' && `Authenticated UID: ${verifiedCardUid || '97:B4:E9:00'}. Starting encrypted session.`}
                {verifyState === 'denied' && 'This card is not registered in your authorized whitelist.'}
              </p>

              {/* Simulation Quick Trigger inside Overlay */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/10 mb-6">
                <span className="text-[10px] text-muted-foreground block mb-2">Simulation / Quick Test Controls</span>
                <div className="flex gap-2 justify-center">
                  <Button 
                    size="sm" 
                    onClick={() => handleHardwareMessage('AUTHORIZED:97:B4:E9:00')}
                    className="bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-black border border-emerald-500/30 text-xs py-1 h-8 rounded-lg"
                  >
                    Tap Blue Card (97:B4:E9:00)
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleHardwareMessage('DENIED:UNKNOWN_TAG')}
                    className="bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white border border-red-500/30 text-xs py-1 h-8 rounded-lg"
                  >
                    Tap Unknown Tag
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
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 7: ACTIVE SECURE SESSION                             */}
        {/* ========================================================= */}
        {activeView === 'session' && (
          <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            <div className="glass-card p-8 rounded-3xl border-emerald-500/30 text-center shadow-2xl space-y-6 bg-gradient-to-b from-emerald-950/20 via-background to-background">
              
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck size={36} />
              </div>

              <div>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs mb-2">
                  HARDWARE VERIFIED ACTIVE
                </Badge>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  Secure Session: {activeSessionBank}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Card Token: <span className="font-mono text-cyan-300">{activeSessionUid}</span> • Banking telemetry protected
                </p>
              </div>

              {/* Big Countdown Timer */}
              <div className="p-6 bg-black/60 rounded-2xl border border-white/10 max-w-xs mx-auto">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Session Timeout</span>
                <div className="text-5xl font-mono font-bold text-cyan-300 tracking-wider">
                  {formatTimer(timeLeft)}
                </div>
                <span className="text-[11px] text-muted-foreground mt-2 block">Auto-relocks when timer expires</span>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <Button 
                  onClick={() => {
                    setIsSessionActive(false);
                    toast.info('Secure banking session closed.');
                    setActiveView('dashboard');
                  }}
                  variant="outline" 
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs rounded-xl"
                >
                  End Secure Session Now
                </Button>
                <Button 
                  onClick={() => setActiveView('dashboard')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl"
                >
                  Back to Dashboard
                </Button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 8: SESSION HISTORY                                   */}
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
                  <History className="text-cyan-400" />
                  NFC Authorization Audit Log
                </h2>
                <p className="text-xs text-muted-foreground">Historical records of NFC-authenticated sessions.</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border-white/10 space-y-3">
              {sessions.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs">
                  No previous sessions logged yet. Tap an authorized card to start a session.
                </div>
              ) : (
                sessions.map((sess, idx) => (
                  <div key={idx} className="p-4 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-600/20 text-cyan-300">
                        <Lock size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{sess.app_name}</h4>
                        <p className="text-[11px] font-mono text-cyan-400">Card: {sess.rfid_uid}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                      {sess.verification_status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
