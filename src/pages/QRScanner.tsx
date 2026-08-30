import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Camera, RotateCcw, CheckCircle, AlertTriangle } from "lucide-react";
import QrScanner from "qr-scanner";

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const checkUrlSafety = (url: string): boolean => {
    // Basic URL safety check - you can enhance this with your own logic
    const suspiciousPatterns = [
      /bit\.ly/i,
      /tinyurl/i,
      /t\.co/i,
      /goo\.gl/i,
      /ow\.ly/i,
      /short/i,
      /phishing/i,
      /malware/i,
      /virus/i
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(url));
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setIsScanning(true);
      setScanResult(null);
      setIsSafe(null);

      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          const scannedUrl = result.data;
          const safety = checkUrlSafety(scannedUrl);
          
          setScanResult(scannedUrl);
          setIsSafe(safety);
          setIsScanning(false);
          
          qrScanner.stop();
        },
        {
          onDecodeError: (error) => {
            console.log("QR decode error:", error);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      qrScannerRef.current = qrScanner;
      await qrScanner.start();
    } catch (error) {
      console.error("Error starting QR scanner:", error);
      setHasCamera(false);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    setIsScanning(false);
  };

  const resetScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    setIsScanning(false);
    setScanResult(null);
    setIsSafe(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <QrCode className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">QR Code Scanner</h1>
          <p className="text-muted-foreground">
            Scan QR codes to check for security threats
          </p>
        </div>

        {/* Camera View */}
        <div className="glass-card p-6 rounded-2xl mb-6 animate-fade-in">
          <div className="aspect-video bg-secondary/20 rounded-lg mb-6 relative overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-lg"
              style={{ display: isScanning ? 'block' : 'none' }}
            />
            
            {!isScanning && !scanResult && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {hasCamera ? "Camera preview will appear here" : "Camera access not available"}
                  </p>
                </div>
              </div>
            )}

            {scanResult && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90">
                <div className="text-center p-6">
                  {isSafe ? (
                    <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  ) : (
                    <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
                  )}
                  <h3 className={`text-xl font-semibold mb-2 ${isSafe ? 'text-success' : 'text-destructive'}`}>
                    {isSafe ? 'Safe QR Code' : 'Potentially Malicious'}
                  </h3>
                  <p className="text-sm text-muted-foreground break-all max-w-md">
                    {scanResult}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-4 justify-center">
            {!isScanning && !scanResult && (
              <Button
                onClick={startScanning}
                className="glow-button text-white px-6 py-2"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Scanning
              </Button>
            )}
            
            {isScanning && (
              <Button
                onClick={stopScanning}
                variant="destructive"
                className="px-6 py-2"
              >
                Stop Scanning
              </Button>
            )}
            
            {scanResult && (
              <Button
                onClick={resetScanner}
                className="glow-button text-white px-6 py-2"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Scan Another
              </Button>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-4 rounded-lg animate-fade-in">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Position the QR code within the scanning frame</li>
            <li>• Keep the camera steady and ensure good lighting</li>
            <li>• The scanner will automatically detect and analyze the code</li>
            <li>• Review the security assessment before proceeding</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;