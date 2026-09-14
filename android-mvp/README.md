# Driver Hub — Android Mobile Application (Expo React Native)

This is the native Android MVP for **Driver Hub**, optimized specifically for drivers and candidates on mobile devices.

## Features
- **Driver-first Navigation**: Home Job Feed, Filter by Category (HMV, LMV, Bus, Delivery, Trailer), Quick Job Search
- **Job Details & 1-Tap Apply**: Apply with candidate profile & verified documents
- **Application Tracking**: Real-time stage tracker (`Applied` → `Under Review` → `Shortlisted` → `Interview` → `Hired`)
- **Document & License Management**: View and upload driving license, Aadhar, and resume
- **Driver Profile**: License number, experience history, expected salary, and verification badge

## How to Run

1. Navigate to the `android-mvp` directory:
   ```bash
   cd android-mvp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Press `a` to open in Android Emulator, or scan the QR code using the **Expo Go** app on your Android phone.

## Shared Backend
This mobile app communicates with the same Supabase database and schema as the web application.
Configure your Supabase credentials in your `.env` or app config:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
