# 🎙️ VoiceTask AI — Intelligent Voice-to-Action Mobile Platform

[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

An intelligent, production-ready mobile platform engineered to capture natural spoken commands, process them through high-performance multimodal AI pipelines, and automatically extract structured, prioritized task items with offline-first persistence.

---

## 🌟 Key Highlights & Innovations

- **⚡ End-to-End Multimodal Processing**: Directly ingests raw audio binaries into Gemini's high-speed multimodal vision/audio endpoints, combining transcription and natural language semantic extraction into a **single low-latency inference cycle**.
- **📊 Real-Time Audio Metering**: Dynamic waveform visualizer powered by `expo-av` audio metering, providing visual audio-level feedback during recording.
- **🛡️ Resilient Model Fallback Architecture**: Built-in self-healing pipeline with automated fallback routing across active Gemini model generations (`gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-2.5-flash`, `gemini-3.7-flash`).
- **💾 Offline-First Local Sync**: Zero-latency UI response with `@react-native-async-storage/async-storage` keeping all extracted tasks cached directly on the client.
- **✏️ Interactive Task Management**: Instant inline editing, date/time adjustments, and task deletion with responsive bottom-sheet modals.

---

## 🏗️ System Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                     Mobile Client (Expo)                    │
 │                                                             │
 │   [ 🎙️ Start Mic ] ──► [ Audio Metering Waveform ]          │
 │                                  │                          │
 │                          [ ⏹️ Stop Mic ]                    │
 │                                  │                          │
 │                   [ Multipart/Form-Data Payload ]           │
 └──────────────────────────────────┬──────────────────────────┘
                                    │ HTTP POST /transcribe
                                    ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                   Backend Service (Express)                 │
 │                                                             │
 │   1. Multer In-Memory Buffer Stream (50MB Limit)            │
 │   2. Base64 Audio Serialization                             │
 │   3. Structured System Schema Injection                     │
 └──────────────────────────────────┬──────────────────────────┘
                                    │ HTTPS (API Key Auth)
                                    ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                Google Gemini Multimodal AI                  │
 │                                                             │
 │   • Zero-Shot Audio Waveform Analysis                       │
 │   • Automatic Speech Transcription                          │
 │   • Semantic NLP Entity & Deadline Extraction               │
 │   • Strict JSON Schema Formatting                           │
 └──────────────────────────────────┬──────────────────────────┘
                                    │ Validated JSON Response
                                    ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                     Client State Sync                       │
 │                                                             │
 │   • Display Clean Transcript Card                           │
 │   • Mount Tasks in Local State                              │
 │   • Persist Atomically to AsyncStorage                     │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale & Performance Impact |
| :--- | :--- | :--- |
| **Mobile Runtime** | **React Native & Expo (SDK 54)** | Cross-platform native performance with rapid over-the-air development via Expo Go. |
| **Audio Engine** | **`expo-av`** | Native cross-platform microphone lifecycle control and decibel metering. |
| **Backend Framework** | **Node.js & Express.js** | Non-blocking asynchronous I/O optimized for concurrent binary audio uploads. |
| **AI & NLP Engine** | **Google Gemini Multimodal API** | Consolidates STT and semantic parsing into a single API roundtrip, slashing latency. |
| **Persistence** | **AsyncStorage** | Instant local caching allowing full offline task reading and editing without remote DB latency. |
| **Networking** | **Axios & Multer** | Streamlined multipart binary uploads with explicit timeout and payload limit controls. |

---

## 📁 Repository Structure

```
├── Backend/
│   ├── index.js                  # Express application setup & middleware
│   ├── transcriptionService.js   # Multimodal Gemini integration & fallback logic
│   ├── package.json              # Backend dependencies and scripts
│   ├── .env.example              # Template for environment configuration
│   └── .gitignore                # Backend-specific ignore rules
├── Frontend/
│   ├── App.js                    # Core React Native application logic & state
│   ├── styles.js                 # Unified stylesheet & design tokens
│   ├── app.json                  # Expo project metadata & configuration
│   ├── index.js                  # Expo entrypoint
│   └── package.json              # Mobile client dependencies
├── .gitignore                    # Global repository ignore rules
└── README.md                     # Project documentation
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 20+ LTS recommended)
- A free **[Gemini API Key](https://aistudio.google.com/app/apikey)** from Google AI Studio
- [Expo Go](https://expo.dev/go) app installed on your iOS or Android device

---

### 2. Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
4. Add your Gemini API key inside `Backend/.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   PORT=3000
   ```
5. Start the backend server:
   ```bash
   npm start
   ```
   > The server will start listening at `http://localhost:3000`.

---

### 3. Frontend Configuration

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your host IP:
   * Run `ipconfig` (Windows) or `ifconfig` (macOS/Linux) to find your local IPv4 address (e.g. `192.168.1.103`).
   * Verify line 29 of `Frontend/App.js`:
     ```javascript
     const myip = "192.168.1.103";
     ```
4. Start the Expo development server:
   ```bash
   npx expo start
   ```

---

### 4. Running on Your Mobile Device

1. Ensure your computer and smartphone are connected to the **same Wi-Fi network**.
2. Open the **Expo Go** application:
   * **Android**: Tap **Scan QR code** and point your camera at the terminal QR code.
   * **iOS**: Open your default **Camera** app, point at the QR code, and tap the notification banner.
3. The application will bundle and launch instantly on your device!

---

## 📡 API Reference

### `POST /transcribe`
Uploads raw audio for transcription and structured task parsing.

* **Headers**: `Content-Type: multipart/form-data`
* **Body**: `audio` (File binary: `.m4a`, `.mp3`, or `.webm`)

#### Sample Response:
```json
{
  "status": "success",
  "transcript": "Schedule project review with the design team tomorrow at 4 PM and send meeting notes",
  "tasks": [
    {
      "id": "1739553600000abc123",
      "task": "Schedule project review with design team",
      "date": "tomorrow",
      "time": "4 PM",
      "status": "pending"
    },
    {
      "id": "1739553600001def456",
      "task": "Send meeting notes",
      "date": "No date",
      "time": "No time",
      "status": "pending"
    }
  ]
}
```

### `GET /`
Health check endpoint verifying server availability.

#### Sample Response:
```json
{
  "status": "healthy",
  "message": "Voice-to-Action Backend is running",
  "version": "1.0.0"
}
```

---

## 🛡️ Security & Best Practices

- **Zero API Key Leakage**: API credentials remain strictly confined to the backend `.env`, never exposed on the mobile client bundle.
- **Strict Payload Guards**: Multer is locked to a 50MB payload cap with memory-storage serialization to protect against disk exhaustion attacks.
- **Deterministic Schema Enforcement**: Uses strict JSON response mode (`responseMimeType: "application/json"`) and regex boundary validation to prevent UI deserialization crashes.

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use and adapt it for personal or commercial applications.
