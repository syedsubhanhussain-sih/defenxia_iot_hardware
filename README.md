# 🛡️ DEFENXIA — Rural Banking Security & IoT Hardware Defense System

> **Advanced AI-Powered Cybersecurity & Hardware Authentication for Rural Digital Banking.**  
> *Created by Syed Subhan Hussain & Team*

---

## 🌟 Overview

**DEFENXIA** is an AI-driven, hardware-integrated cybersecurity platform engineered to protect rural banking customers, merchants, and digital payment users against financial fraud, phishing, malware, SIM-swap attacks, and unauthorized access.

The system features **dual-hardware authentication** combining physical **RC522 RFID Security Cards**, **Arduino UNO**, **HC-05 Bluetooth**, and **Web Serial API** to enforce physical authorization before sensitive banking apps can be accessed.

---

## 🚀 Key Modules & Flagship Features

### 🏦 1. Secure Banking Mode (BankShield)
* **Hardware-Gated Access**: Protects UPI & Banking apps (PhonePe, Google Pay, Paytm, BHIM, SBI YONO, HDFC, ICICI, Canara).
* **Dual Communication Bridges**:
  * **Laptop Demo (Web Serial API)**: Connects to Arduino UNO via USB at 9600 baud.
  * **Mobile Demo (Bluetooth HC-05)**: Connects via Web Bluetooth API.
* **05:00 Time-Limited Sessions**: Encrypted session timer with auto-lock upon expiration.
* **Active Defense Mesh**: Real-time SMS OTP shielding, QR verification, WiFi isolation, screen mirror detection, and IP encryption.

### 📰 2. CyberNews Intelligence Feed
* **Real-time Live News API**: Direct integration with **Currents API** for real-time global, national (India), and regional (Karnataka) cybersecurity threat bulletins.
* **Cyber Intelligence AI**: Location-pinpoint conversational threat advisor.

### 🛟 3. Cyber Help & Scam Protection Guides
* **National Emergency Helpline (1930)**: 1-tap emergency dialer for golden hour recovery.
* **Interactive Scam Protection Guides**: Comprehensive step-by-step guides for UPI Frauds, QR Code Swapping, OTP Scams, SIM Swaps, Fake Loan Apps, and WhatsApp Scams.

### 🌐 4. Website Security Scanner
* **Google Safe Browsing API Integration**: Real-time scanning against Google's global threat database (Malware, Social Engineering/Phishing, Unwanted Software).
* **Deep URL Inspection**: SSL/TLS encryption verification, domain reputation scoring (0–100), and deceptive lookalike detection.

---

## 🔌 Hardware Wiring Guide

### RC522 RFID Module ➔ Arduino UNO
| RC522 Pin | Arduino UNO Pin | Function |
| :--- | :--- | :--- |
| **SDA (SS)** | **Pin D10** | SPI Slave Select |
| **SCK** | **Pin D13** | SPI Clock |
| **MOSI** | **Pin D11** | SPI Master Out |
| **MISO** | **Pin D12** | SPI Master In |
| **RST** | **Pin D9** | Reset |
| **3.3V** | **3.3V Power** | *(Do NOT connect to 5V)* |
| **GND** | **GND Ground** | Ground |

### HC-05 Bluetooth Module ➔ Arduino UNO
| HC-05 Pin | Arduino UNO Pin | Function |
| :--- | :--- | :--- |
| **TX** | **Pin D2** | SoftwareSerial RX |
| **RX** | **Pin D3** | SoftwareSerial TX |
| **VCC** | **5V Power** | 5V Power |
| **GND** | **GND Ground** | Ground |

---

## 💻 Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide Icons
* **Hardware**: Arduino UNO C++, MFRC522 Library, SoftwareSerial, Web Serial API, Web Bluetooth API
* **Backend & Database**: Supabase PostgreSQL, Deno TypeScript Edge Functions
* **Security & APIs**: Google Safe Browsing API v4, Currents API

---

## 🛠️ Local Setup & Installation

```bash
# 1. Clone the repository
git clone https://github.com/syedsubhanhussain-sih/defenxia_iot_hardware.git

# 2. Navigate into the directory
cd defenxia_iot_hardware

# 3. Install dependencies
npm install

# 4. Configure .env
cp .env.example .env

# 5. Start the development server
npm run dev
```

---

## 📄 License & Attribution

Developed with ❤️ for the Smart India Hackathon (SIH) by **Syed Subhan Hussain & Team**.
