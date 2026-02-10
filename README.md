# Leak Alert - Mobile Leak Reporting System

**Version:** 1.0.0 (Alpha)  
**Package:** com.davaowater.leakreport  
**Platform:** Android (APK)  
**Status:** Alpha Testing Release

---

## � Overview

Leak Alert is a mobile application designed for DCWD (Davao City Water District) field personnel to report water leaks efficiently. The app supports both online and offline operation, automatically syncing reports when internet connectivity is restored.

---

## ✨ Key Features

### 1. **Authentication System**
- Secure user login with employee credentials
- Automatic session persistence
- Token-based authentication with AsyncStorage
- User profile display with employee details

### 2. **Dashboard**
- Real-time leak report statistics
  - Total Reports
  - Reported
  - Dispatched
  - Repaired
  - Scheduled
  - Turnover
  - After Meter
  - Not Found
  - Already Repaired
- Dynamic greeting based on time of day
- Quick access to submitted reports with unsynced count badge
- Pull-to-refresh functionality

### 3. **Leak Reporting**
- **Meter Selection via GPS**
  - Find 3 nearest water meters to your current location
  - Customer data stored locally (SQLite database)
  - Offline-first approach with downloadable customer database
  - Interactive map view (OpenStreetMap/Offline tiles)
  
- **Report Form**
  - Leak type selection (Unidentified, Serviceline, Mainline, Others)
  - Location type (Surface, Non-Surface)
  - Contact person and phone number
  - Landmark description
  - Photo attachments:
    - Up to 2 leak photos
    - 1 landmark photo
  - GPS coordinates auto-captured

### 4. **Offline Support**
- **Offline Reporting**
  - Reports cached locally when offline
  - Automatic background sync when connection restored
  - Status tracking: Pending, Syncing, Synced, Failed
  
- **Offline Maps**
  - Download offline map tiles (davroad.zip, ~256MB)
  - Fast extraction using fflate (chunked reading to avoid OOM)
  - Works completely offline after download
  - Toggle between online/offline maps in settings

- **Customer Data**
  - Download ~200K+ customer records to local SQLite
  - Parallel downloading with progress tracking
  - Enables nearest meter search without internet

### 5. **Submitted Reports Management**
- View all cached reports (local + synced)
- Filter by status: All, Pending, Synced, Failed
- **Sync All** button for bulk submission of unsynced reports
- Individual report sync/delete actions
- Server reference number display for synced reports
- Error details for failed submissions
- Clear synced reports to free local storage

### 6. **Settings**
- **Customer Data Management**
  - Download customer database with progress indicator
  - Clear local customer data
  - Data count display
  
- **Offline Maps**
  - Download offline map tiles
  - View offline map
  - Clear map data
  - Toggle online/offline map usage
  
- **Logout** functionality

---

## 🔧 Technical Implementation

### Architecture
- **Framework:** Expo SDK 54 with React Native 0.81.5
- **Router:** expo-router ~6.0.22 (file-based routing)
- **State Management:** Zustand 5.0.10
- **Database:** expo-sqlite (SQLite local storage)
- **Networking:** Axios with automatic token injection
- **Storage:** AsyncStorage for preferences and session

### Key Libraries
- **expo-file-system/legacy** - File operations, map tiles extraction
- **fflate 0.8.2** - Fast zip decompression (chunked reading for large files)
- **expo-image-picker** - Photo capture and selection
- **expo-location** - GPS positioning and nearest meter calculation
- **react-native-webview** - Leaflet map rendering (online/offline)
- **expo-network** - Network status detection for auto-sync

### API Integration
**Base URL:** `https://dev-api.davao-water.gov.ph`

- `POST /dcwd-gis/api/v1/admin/userlogin/login` - User authentication
- `GET /dcwd-gis/api/v1/admin/GetLeakReports/mobile/user/{empId}` - Fetch user's reports
- `GET /dcwd-gis/api/v1/admin/customer/paginate` - Customer data download (parallel)
- `POST /dcwd-gis/api/v1/admin/LeakReport/MobileLeakReport` - Submit leak report (multipart/form-data)

### Data Stores (Zustand)

1. **authStore** - User authentication and session
2. **dashboardStore** - Dashboard statistics
3. **reportsStore** - Nearest meter search and customer data
4. **mobileReportStore** - Cached reports and sync queue
5. **reportFormStore** - Report form state
6. **settingsStore** - Customer data and preferences
7. **mapStore** - Offline map download/extraction

### File Structure
```
leak-report-new/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Dashboard
│   │   ├── reports.tsx        # Nearest meters & meter selection
│   │   └── settings.tsx       # Settings & data management
│   ├── screens/
│   │   ├── reportForm.tsx     # Leak report form
│   │   └── submittedReports.tsx # All submitted reports list
│   ├── login.tsx              # Login screen
│   └── _layout.tsx            # Root layout with auth guard
├── components/
│   └── ui/
│       ├── maps.tsx           # Leaflet map component
│       ├── mapOffline.tsx     # Offline map viewer
│       └── upload.tsx         # Photo upload component
├── services/
│   ├── api.ts                 # Axios instance with interceptors
│   ├── authService.ts         # Login API
│   ├── customerData.ts        # Customer data API
│   ├── leakReportsService.ts  # Fetch reports API
│   └── mobileReport.ts        # Submit report API
├── utils/
│   ├── authStore.ts           # Auth state management
│   ├── dashboardStore.ts      # Dashboard data
│   ├── reportsStore.ts        # Meter search logic
│   ├── mobileReportStore.ts   # Report caching & sync
│   ├── reportFormStore.ts     # Form state
│   ├── settingsStore.ts       # Settings & customer data
│   ├── mapStore.ts            # Offline maps management
│   └── allCustomerData.ts     # SQLite customer database
└── hooks/
    ├── mobileReportLeak.ts    # Report submission hook
    ├── downloadCustomerData.ts # Customer data downloader
    ├── nearestMeter.ts        # GPS distance calculation
    └── getLocation.ts         # GPS location access
```

---

## 🚀 Build Information

### EAS Build Configuration
- **Build Profile:** Preview (APK)
- **Build Tool:** EAS (Expo Application Services)
- **Keystore:** Generated and managed by Expo
- **Build Command:**
  ```bash
  npx eas-cli build --platform android --profile preview
  ```

### App Configuration
- **App Name:** Leak Alert
- **Bundle ID (iOS):** com.davaowater.leakreport
- **Package Name (Android):** com.davaowater.leakreport
- **Icon & Splash:** DCWD Logo (`logo-hdcwd-1.png`)

### Android Permissions
- `ACCESS_FINE_LOCATION` - GPS for nearest meter search
- `ACCESS_COARSE_LOCATION` - Location services
- `CAMERA` - Photo capture
- `READ_EXTERNAL_STORAGE` - Photo selection
- `WRITE_EXTERNAL_STORAGE` - Map tiles storage
- `INTERNET` - API communication

---

## 📋 Testing Guide

### Prerequisites
1. Android device or emulator (Android 6.0+)
2. Test credentials (employee login)
3. Internet connection for initial setup
4. GPS/Location services enabled

### Installation
1. Download the APK from EAS Build dashboard
2. Enable "Install from Unknown Sources" on Android device
3. Install the APK
4. Launch "Leak Alert"

### Test Scenarios

#### **1. Login & Authentication**
- [ ] Login with valid credentials
- [ ] Session persists after app restart
- [ ] Logout clears session

#### **2. Dashboard**
- [ ] Statistics load correctly
- [ ] Refresh button updates data
- [ ] Navigate to submitted reports

#### **3. Customer Data Download**
- [ ] Download customer data from settings
- [ ] Progress indicator shows correctly
- [ ] Data count displays after download
- [ ] Clear data removes records

#### **4. Nearest Meter Search**
- [ ] Enable GPS location
- [ ] Find 3 nearest meters
- [ ] View meters on map
- [ ] Select meter for reporting

#### **5. Leak Report Submission (Online)**
- [ ] Fill all required fields
- [ ] Add leak photos (1-2)
- [ ] Add landmark photo
- [ ] Submit report online
- [ ] Verify report appears in submitted reports as "Synced"

#### **6. Offline Reporting**
- [ ] Turn on airplane mode
- [ ] Submit a leak report
- [ ] Verify report saved as "Pending"
- [ ] Turn off airplane mode
- [ ] Verify automatic sync to "Synced"

#### **7. Offline Maps**
- [ ] Download offline map tiles
- [ ] Monitor download progress
- [ ] Switch to offline maps in settings
- [ ] Verify map works without internet

#### **8. Submitted Reports**
- [ ] View all cached reports
- [ ] Filter by status (All, Pending, Synced, Failed)
- [ ] Sync individual pending report
- [ ] Sync all unsynced reports at once
- [ ] Delete report
- [ ] Clear synced reports

#### **9. Error Handling**
- [ ] Network timeout handling
- [ ] GPS unavailable message
- [ ] Missing customer data prompt
- [ ] Failed sync retry

---

## 🐛 Known Issues (Alpha)

1. **Map Extraction Performance**
   - Initial offline map extraction takes 2-3 minutes for ~256MB file
   - Uses chunked reading to prevent OOM, but still CPU-intensive
   - **Workaround:** Download once, then toggle online/offline as needed

2. **Customer Data Download**
   - Downloading 200K+ records takes 3-5 minutes
   - Progress updates in batches of 2000 records
   - **Recommendation:** Download during setup, refresh periodically

3. **Photo Size**
   - Large photo files (>5MB) may slow down sync
   - **Recommendation:** Photos compressed to ~2MB before submission

4. **Network Detection**
   - Auto-sync checks every 10 seconds when online
   - May have slight delay in detecting connectivity changes

---

## 📝 Release Notes - Alpha v1.0.0

### New Features
- Initial release with complete leak reporting workflow
- Offline-first architecture with automatic sync
- Customer database with nearest meter search
- Offline map tiles support
- Report status tracking and management
- Dashboard with real-time statistics

### Changes from Previous Versions
- Migrated from JSZip to fflate for faster map extraction
- Added chunked reading to prevent OOM on large zip files
- Implemented session persistence across app restarts
- Added submitted reports screen with bulk sync
- Updated dashboard to use real API data instead of mock data

### Bug Fixes
- Fixed 404 error in leak reports API (added /dcwd-gis prefix)
- Fixed OOM crash when extracting large offline maps
- Fixed session not restoring after app restart
- Fixed missing download button when customer data is empty

---

## 🔐 Security Notes

- User credentials never stored locally (only auth token)
- API token stored in AsyncStorage (encrypted by OS)
- HTTPS-only API communication
- Keystore managed securely by Expo

### Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the development server

   ```bash
   npx expo start
   ```

3. Run on device/simulator
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go app

### Building APK

```bash
# Preview build (APK for distribution)
npx eas-cli build --platform android --profile preview

# Production build (AAB for Play Store)
npx eas-cli build --platform android --profile production
```

---

## 📄 License & Copyright

© 2025 Davao City Water District. All rights reserved.

This application is proprietary software developed for internal use by DCWD personnel.

---

**Build Date:** February 2025  
**Built with:** Expo SDK 54, React Native 0.81.5  
**Build Platform:** EAS Cloud Build  
**Target Platform:** Android 6.0+ (API Level 23+)
