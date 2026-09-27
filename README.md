# NagarDrishti AI

### **AI-Powered Civic Intelligence**

> Transform Citizen Photos into Actionable Municipal Decisions  
> **Photo → AI Detection → Confidence → Visual Severity → Location → Suggested Department → Citizen Confirmation → Complaint → Authority Dashboard → Heatmap / Hotspots**

---

## 1. Project Overview

**NagarDrishti AI** is an AI-assisted civic intelligence platform built for rapid civic problem reporting and municipal decision-support. 

Citizens report municipal issues simply by uploading or capturing a photograph. The multimodal AI analyzes the image, determines category confidence, estimates visual severity, and suggests the appropriate department. Citizens have full authority to edit detections before filing. Municipal authorities track live reports, hotspot clusters, and severity heatmaps on an analytical command dashboard.

### Supported Problem Categories (MVP Scope):
1. **Pothole / Road Damage** (`pothole`)
2. **Garbage Accumulation** (`garbage`)
3. **Damaged Streetlight** (`streetlight`)
4. **Overflowing / Blocked Drain** (`drain`)
5. **Other / Unclear** (`other`)

---

## 2. Monorepo Structure

```text
nagardrishti-ai/
│
├── frontend/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/           # LocationPicker (Leaflet), Badges, Icons, Navbar, Footer
│   │   ├── pages/                # CitizenHome, ReportFlow (8-step wizard), MyReports, AuthorityDashboard
│   │   ├── services/             # API client methods
│   │   ├── types/                # TypeScript data models
│   │   ├── App.tsx               # Client router & lifecycle state
│   │   └── main.tsx
│   ├── capacitor.config.ts       # Android / Mobile runtime configuration
│   └── package.json
│
├── backend/                      # Python + FastAPI + Uvicorn
│   ├── app/
│   │   ├── api/                  # Endpoints: analyze, complaints, dashboard, departments
│   │   ├── core/                 # Config (Pydantic-Settings), Database (Supabase + fallback)
│   │   ├── schemas/              # Pydantic schemas (AI, complaints, departments, hotspots)
│   │   ├── services/             # VisionAnalyzer, GeminiVisionProvider, LocalVisionProvider,
│   │   │                         # SeverityEngine, DepartmentResolver, DuplicateDetector, StorageService
│   │   └── main.py               # FastAPI application entrypoint
│   ├── tests/                    # Pytest suite (API, rules, duplicate detection, triage)
│   └── requirements.txt
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql# PostgreSQL schema for complaints, departments & storage
│
├── docs/
│   └── ARCHITECTURE.md           # System architecture & decision-support contracts
│
├── .env.example                  # Environment configuration template
├── ATTRIBUTIONS.md               # Third-party licenses & service attributions
├── README.md
└── .gitignore
```

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet & OpenStreetMap, Recharts, Lucide React
- **Backend:** Python 3.14 / 3.10+, FastAPI, Uvicorn, Pydantic v2
- **Database & Storage:** Supabase PostgreSQL, Supabase Storage (`complaint-images` bucket)
- **AI Provider:** Google Gemini Multimodal Vision API (`gemini-2.5-flash` via `google-genai` SDK) with decoupled `VisionAnalyzer` interface
- **Mobile Foundation:** Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)

---

## 4. Quick Start Guide

### Prerequisites
- Node.js (v18+ or v20+)
- Python (v3.10+)

### 1. Environment Setup
Copy `.env.example` to `.env` in both the project root and `backend/`:
```bash
cp .env.example .env
cp .env.example backend/.env
```

Configure your credentials:
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
AI_CONFIDENCE_THRESHOLD=0.75

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
STORAGE_BUCKET=complaint-images
```

*(Note: The backend includes an automatic fallback data store so the system can run offline or during testing even before Supabase credentials are configured).*

---

### 2. Database Migration & Auth Configuration (Supabase)

#### A. Database Migration
Run the SQL migrations in your Supabase SQL editor (`>_`):
1. `supabase/migrations/001_initial_schema.sql` (complaints & departments)
2. `supabase/migrations/002_secure_storage.sql` (private bucket storage policies)
3. `supabase/migrations/003_auth_and_ownership.sql` (profiles table, auto-profile trigger, citizen complaint ownership, RLS)

#### B. Supabase Dashboard Authentication Setup (Hackathon Environment)
In your Supabase Project Dashboard (`Authentication` → `Providers`):
- **Email Provider:** **ENABLED**
- **Phone Provider:** **NOT USED / DISABLED**
- **Confirm Email:** **OFF** (Under *Email Provider Settings*, toggle *Confirm email* to **OFF** so new citizens can sign up and immediately report issues without waiting for confirmation emails or hitting free-tier email rate limits).
- **Site URL & Redirect URLs:** Ensure `http://localhost:5173` is listed under *Authentication* → *URL Configuration*.

---

### 3. Backend Startup
```bash
# Navigate to backend and activate virtualenv
cd backend
python -m venv .venv

# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/api/docs`
- Health check: `http://localhost:8000/api/health`

---

### 4. Frontend Startup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

- **Citizen Home & Reporting:** `http://localhost:5173` or `http://localhost:5173/#report`
- **My Reports Tracker:** `http://localhost:5173/#my-reports`
- **Authority Dashboard:** `http://localhost:5173/#authority`

---

## 5. Running Tests

Run the complete backend unit and integration test suite (31 tests across all phases):
```bash
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```
The test suite covers:
- **Phase 1 Foundations:** Root/health endpoints, SeverityEngine rules, DepartmentResolver rules, Haversine duplicate detection, complaint lifecycle flow.
- **Phase 2 AI Vision & Private Storage:** Structured Gemini response parsing, malformed JSON recovery, low-confidence safeguard (`< 0.75`), image quality validation (dark/blank/corrupt), timeout/quota handling, citizen override persistence, Supabase private storage upload and controlled retrieval streaming.
- **Phase 3 Command Center & Spatial Analytics:** Aggregated dashboard statistics, multi-criteria filtering (category, severity, status, department), spatial corridor clustering (centroids, radius, dominant issue), duplicate warning flagging, lifecycle transitions (`REPORTED` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLVED`), density-weighted heatmap points, empty-dashboard graceful handling, 16-record seeded demo dataset integrity, end-to-end citizen-to-authority flow.
- **Phase 4 Demo & Reset Protection:** `POST /api/dashboard/reset-demo` resets demo records to pristine state while strictly preserving real citizen reports.

---

## 6. Android APK Build & Workflow (Capacitor)

The citizen application is configured for native Android packaging via Capacitor:
- **Application ID:** `org.nagardrishti.ai`
- **Application Name:** `NagarDrishti AI`
- **Permissions Configured:** Camera, Fine/Coarse Location, Image Gallery / Storage, Cleartext Traffic (for local dev testing).

### Building the APK:
```bash
cd frontend

# 1. Build optimized production web bundle
npm run build

# 2. Sync web bundle into native Android project
npx cap sync android

# 3. Build debug APK using Gradle (requires Android SDK / Java JDK)
cd android
./gradlew assembleDebug

# Output APK path:
# frontend/android/app/build/outputs/apk/debug/app-debug.apk

# Alternatively, open in Android Studio:
cd ..
npx cap open android
```

---

## 7. Hackathon Demo Execution & Reset

### Pre-Tested Demo Image Pack (Offline Ready)
Located in `frontend/public/demo-images/` for instant one-click demonstration:
1. `pothole.jpg` - Asphalt road crater with lane marking
2. `garbage.jpg` - Overflowing municipal commercial waste bin
3. `streetlight.jpg` - Damaged luminaire pole with exposed wiring
4. `drain.jpg` - Clogged stormwater drain overflowing onto pavement
5. `unclear.jpg` - Low-contrast blurred photo to demonstrate the **Low-Confidence Retake Safeguard**

### Demo Dataset Reset:
To reset the demonstration dataset back to its pristine 16-report state without altering or deleting any newly created citizen reports:
- **From UI:** Click **Reset Demo** in the Authority Command Center header.
- **Via API:** Send a `POST` request to `http://localhost:8000/api/dashboard/reset-demo`:
```bash
curl -X POST http://localhost:8000/api/dashboard/reset-demo
```

---

## 8. Decision-Support & Safety Disclosure

- **Decision-Support Only:** NagarDrishti AI is an AI-assisted decision-support platform. Detections and severity assessments are visual estimates designed to aid human triage; they do not constitute official municipal orders or certified structural engineering evaluations.
- **Human-in-the-Loop:** Citizens retain full authority to override problem category, severity, and location before submission. Municipal officers retain full authority to override lifecycle status.
- **Private Data Governance:** Citizen complaint photographs are stored in a private Supabase storage bucket (`complaint-images`) and accessed exclusively through controlled backend proxy streaming (`/api/complaints/image/{filename}`). Backend service-role credentials never leave the FastAPI server.

