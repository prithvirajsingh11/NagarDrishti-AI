# NagarDrishti AI: System Architecture

**AI-Powered Civic Intelligence**

---

## 1. High-Level Flow

```text
                     CITIZEN
                        │
                        ▼
                React + Vite App
                        │
                        ▼
                  FastAPI Backend
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
    VisionAnalyzer   Supabase      Location
          │             │
          ▼             ├── PostgreSQL
 GeminiVisionProvider   └── Storage
          │
          ▼
   Structured AI Result
          │
     ┌────┴─────┐
     ▼          ▼
Severity      Department
Engine        Resolver
     │          │
     └────┬─────┘
          ▼
       Complaint
          │
          ▼
   Authority Dashboard
          │
    ┌─────┴──────┐
    ▼            ▼
  Map         Analytics
    │            │
    ▼            ▼
Heatmap       Hotspots
```

---

## 2. Decoupled AI Provider Design

The system implements the **Strategy Pattern** via the abstract base class `VisionAnalyzer`. This guarantees the core application never depends directly on Gemini SDK primitives:

```text
                   VisionAnalyzer (Abstract Base Class)
                                ▲
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
GeminiVisionProvider                           LocalVisionProvider
(Google GenAI Multimodal API)                  (Offline / Edge Inference Stub)
```

Configuration switch in `.env`:
```env
AI_PROVIDER=gemini   # or "local"
```

If the Gemini API reaches quota thresholds or goes offline, switching to `AI_PROVIDER=local` requires no code alterations in the frontend, database, or API schemas.

---

## 3. Deterministic Decision Support

- **SeverityEngine**: Evaluates visual indicators and evidence keywords into 4 deterministic tiers: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Explicitly labeled in the UI as **AI-estimated visual severity**.
- **DepartmentResolver**: Maps detected categories to configurable municipal departments:
  - `pothole` → Municipal Roads
  - `garbage` → Sanitation
  - `streetlight` → Electrical / Municipal Lighting
  - `drain` → Drainage / Sanitation
  - `other` → Manual Review
- **DuplicateDetector**: Identifies potential duplicate reports within 100 meters and 48 hours. Flags items as "Possible Duplicate" without destructive auto-merging.

---

## 4. Security & Privacy Guarantees

1. **Server-Side API Key Storage**: The Gemini API key and Supabase Service Role key are stored strictly on the FastAPI server. The client bundle contains zero cloud secrets.
2. **Metadata Sanitization**: Uploaded images are validated for MIME format (JPG, PNG, WEBP) and stripped of unneeded EXIF headers upon storage.
3. **Decision-Support Boundary**: AI predictions never trigger irreversible administrative actions automatically. Human review (citizen edit & authority override) is preserved at every step.
