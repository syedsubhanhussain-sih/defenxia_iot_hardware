/*
 * DEFENXIA — Rural Banking Security Hardware Firmware
 * Hardware: Arduino UNO + MFRC522 RFID Reader + HC-05 Bluetooth Module
 *
 * PIN CONNECTIONS:
 * -------------------------------------------------------------
 * RC522 RFID Module  ->  Arduino UNO
 * -------------------------------------------------------------
 * SDA (SS)          ->  Pin D10
 * SCK               ->  Pin D13
 * MOSI              ->  Pin D11
 * MISO              ->  Pin D12
 * IRQ               ->  Not Connected
 * GND               ->  GND
 * RST               ->  Pin D9
 * 3.3V              ->  3.3V  (IMPORTANT: Do NOT connect to 5V!)
 * -------------------------------------------------------------
 * HC-05 Bluetooth   ->  Arduino UNO
 * -------------------------------------------------------------
 * TX                ->  Pin D2 (Arduino RX via SoftwareSerial)
 * RX                ->  Pin D3 (Arduino TX via SoftwareSerial)
 * VCC               ->  5V
 * GND               ->  GND
 * -------------------------------------------------------------
 */

#include <SPI.h>
#include <MFRC522.h>
#include <SoftwareSerial.h>

#define RST_PIN   9
#define SS_PIN    10

// SoftwareSerial for HC-05 Bluetooth (RX on pin 2, TX on pin 3)
SoftwareSerial bluetooth(2, 3);

MFRC522 mfrc522(SS_PIN, RST_PIN);

// Status indicator LED pins (Optional, built-in LED 13 used by SCK)
#define BUZZER_PIN 4

// List of pre-authorized card UIDs (in uppercase HEX without spaces)
// You can add your physical RFID card UID here or register cards dynamically in DEFENXIA app
String authorizedCards[] = {
  "DEMO_CARD_001",
  "A1B2C3D4",
  "F35C8912"
};
const int numAuthorized = sizeof(authorizedCards) / sizeof(authorizedCards[0]);

unsigned long lastScanTime = 0;
const unsigned long scanCooldown = 1500; // 1.5 second cooldown between scans

void setup() {
  // Initialize USB Serial (Laptop Web Serial API Demo at 9600 baud)
  Serial.begin(9600);
  while (!Serial && millis() < 2000); // Wait for serial port to connect

  // Initialize HC-05 Bluetooth (Mobile Demo at 9600 baud)
  bluetooth.begin(9600);

  // Initialize SPI bus for RC522
  SPI.begin();
  
  // Initialize MFRC522 RFID Reader
  mfrc522.PCD_Init();
  delay(100);
  
  // Check MFRC522 status
  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Broadcast readiness to both USB and Bluetooth
  Serial.println("DEFENXIA_HARDWARE_READY:9600");
  bluetooth.println("DEFENXIA_HARDWARE_READY:9600");
  
  Serial.print("RC522_VERSION:0x");
  Serial.println(version, HEX);
}

void loop() {
  // Listen for commands from Laptop USB or Mobile Bluetooth
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    handleIncomingCommand(cmd);
  }
  
  if (bluetooth.available()) {
    String cmd = bluetooth.readStringUntil('\n');
    cmd.trim();
    handleIncomingCommand(cmd);
  }

  // Look for new RFID Cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Cooldown check to prevent repeated triggers
  if (millis() - lastScanTime < scanCooldown) {
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return;
  }
  lastScanTime = millis();

  // Read card UID and convert to uppercase Hex string
  String cardUID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      cardUID += "0";
    }
    cardUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardUID.toUpperCase();

  // Check if UID is authorized
  bool isAuthorized = checkAuthorization(cardUID);

  // Broadcast UID and verification result to both USB Serial and Bluetooth
  if (isAuthorized) {
    beepSuccess();
    Serial.println("AUTHORIZED:" + cardUID);
    bluetooth.println("AUTHORIZED:" + cardUID);
  } else {
    // Even if not in local list, broadcast as scanned card so DEFENXIA Supabase can verify or register it
    beepNotice();
    Serial.println("CARD_READ:" + cardUID);
    bluetooth.println("CARD_READ:" + cardUID);
  }

  // Halt PICC and stop encryption on PCD
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

bool checkAuthorization(String uid) {
  // Check against internal list
  for (int i = 0; i < numAuthorized; i++) {
    if (authorizedCards[i].equalsIgnoreCase(uid)) {
      return true;
    }
  }
  return false;
}

void handleIncomingCommand(String cmd) {
  if (cmd == "PING") {
    Serial.println("PONG:DEFENXIA_ARDUINO_UNO");
    bluetooth.println("PONG:DEFENXIA_ARDUINO_UNO");
  } else if (cmd.startsWith("ADD_CARD:")) {
    String newCard = cmd.substring(9);
    Serial.println("CARD_CONFIGURED:" + newCard);
    bluetooth.println("CARD_CONFIGURED:" + newCard);
  }
}

void beepSuccess() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
  delay(50);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
}

void beepNotice() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);
}
