# SavdoUz

B2B SaaS platform for multi-store retail management in Uzbekistan.

## Stack
- Frontend: React Native + Expo
- Backend: Node.js + Express + MongoDB

## Setup

1. Install dependencies
```bash
   npm install
```

2. Create `.env.development`
EXPO_PUBLIC_API_URL="http://YOUR_LOCAL_IP:3000/api/v1"

3. Start the app
```bash
   npx expo start
```

## Build

Production APK:
```bash
eas build --profile production --platform android
```