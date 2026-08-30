import { useState, useCallback, useRef, useEffect } from 'react';

export interface SerialMessage {
  text: string;
  type: 'incoming' | 'outgoing' | 'system';
  timestamp: string;
}

interface SerialPortHook {
  isConnected: boolean;
  isSimulating: boolean;
  portInfo: string | null;
  lastMessage: string | null;
  logs: SerialMessage[];
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  startListening: (onMessage: (msg: string) => void) => void;
  stopListening: () => void;
  sendData: (data: string) => Promise<boolean>;
  simulateRFID: (uid?: string, authorized?: boolean) => void;
  toggleSimulation: () => void;
  clearLogs: () => void;
}

export function useSerialPort(): SerialPortHook {
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [portInfo, setPortInfo] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<SerialMessage[]>([]);
  
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const readingFlagRef = useRef<boolean>(false);
  const callbackRef = useRef<((msg: string) => void) | null>(null);

  const addLog = useCallback((text: string, type: 'incoming' | 'outgoing' | 'system' = 'system') => {
    const newEntry: SerialMessage = {
      text,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
  }, []);

  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => {
      const next = !prev;
      addLog(`Hardware simulation mode ${next ? 'ENABLED' : 'DISABLED'}`);
      return next;
    });
  }, [addLog]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!('serial' in navigator)) {
      console.warn('Web Serial API not supported in this browser. Simulation mode enabled.');
      setIsSimulating(true);
      setIsConnected(true);
      setPortInfo('Virtual Serial Bridge (Simulation)');
      addLog('Web Serial not supported in this browser. Using Virtual Simulation Bridge.');
      return true;
    }

    try {
      if (isSimulating) {
        setIsConnected(true);
        setPortInfo('Virtual Arduino UNO (Simulated)');
        addLog('Connected to Virtual Arduino UNO simulator (9600 baud).');
        return true;
      }

      addLog('Requesting USB Serial port for Arduino UNO...');
      // Request serial port (filter for Arduino or allow user to pick)
      const port = await (navigator as any).serial.requestPort();
      
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setIsConnected(true);

      const info = port.getInfo ? port.getInfo() : {};
      const desc = info.usbVendorId ? `Arduino UNO (VID: 0x${info.usbVendorId.toString(16)})` : 'Arduino UNO USB Serial (COM Port)';
      setPortInfo(desc);
      addLog(`Connected successfully: ${desc} at 9600 baud.`);

      return true;
    } catch (error: any) {
      console.error('Error connecting to serial port:', error);
      addLog(`Serial connection failed: ${error?.message || 'User cancelled or port in use'}`);
      return false;
    }
  }, [isSimulating, addLog]);

  const disconnect = useCallback(async (): Promise<void> => {
    readingFlagRef.current = false;
    
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (err) {
        console.error('Error cancelling reader:', err);
      }
      readerRef.current = null;
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (err) {
        console.error('Error closing port:', err);
      }
      portRef.current = null;
    }
    
    setIsConnected(false);
    setPortInfo(null);
    addLog('USB Serial port disconnected.');
  }, [addLog]);

  const startListening = useCallback(async (onMessage: (msg: string) => void) => {
    callbackRef.current = onMessage;
    
    if (isSimulating || !portRef.current) {
      return;
    }

    readingFlagRef.current = true;
    
    try {
      while (portRef.current.readable && readingFlagRef.current) {
        const textDecoder = new TextDecoderStream();
        portRef.current.readable.pipeTo(textDecoder.writable).catch(() => {});
        const reader = textDecoder.readable.getReader();
        readerRef.current = reader;

        try {
          let buffer = '';
          while (readingFlagRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += value;
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (let line of lines) {
                line = line.trim();
                if (line) {
                  setLastMessage(line);
                  addLog(line, 'incoming');
                  if (callbackRef.current) {
                    callbackRef.current(line);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error reading from serial port:', error);
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
    }
  }, [isSimulating, addLog]);

  const stopListening = useCallback(() => {
    readingFlagRef.current = false;
    callbackRef.current = null;
  }, []);

  const sendData = useCallback(async (data: string): Promise<boolean> => {
    if (isSimulating) {
      addLog(data, 'outgoing');
      return true;
    }

    if (!portRef.current || !portRef.current.writable) {
      addLog('Cannot send: USB port is not writable.', 'system');
      return false;
    }

    try {
      const textEncoder = new TextEncoder();
      const writer = portRef.current.writable.getWriter();
      await writer.write(textEncoder.encode(data + '\n'));
      writer.releaseLock();
      addLog(data, 'outgoing');
      return true;
    } catch (err: any) {
      console.error('Send error:', err);
      addLog(`Send failed: ${err.message}`, 'system');
      return false;
    }
  }, [isSimulating, addLog]);

  const simulateRFID = useCallback((uid: string = 'DEMO_CARD_001', authorized: boolean = true) => {
    const cleanUid = uid.trim().toUpperCase();
    const msg = authorized ? `AUTHORIZED:${cleanUid}` : `DENIED:${cleanUid}`;
    setLastMessage(msg);
    addLog(`[SIMULATED TAP] -> ${msg}`, 'incoming');
    if (callbackRef.current) {
      callbackRef.current(msg);
    }
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isSimulating,
    portInfo,
    lastMessage,
    logs,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendData,
    simulateRFID,
    toggleSimulation,
    clearLogs
  };
}
