import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  Loader2,
  MapPin,
  Map as MapIcon,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Droplets,
  User,
  Lock,
} from 'lucide-react';
import type {
  CivicDetectionResult,
  Complaint,
  ProblemType,
  SeverityLevel,
  SimilarComplaintSummary,
} from '../types/complaint';
import {
  analyzeCivicImage,
  createComplaint,
  getSimilarComplaints,
  uploadComplaintImage,
} from '../services/api';
import { ProblemIcon, getProblemLabel } from '../components/ProblemIcon';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LocationPicker, DEFAULT_MAP_CENTER } from '../components/LocationPicker';
import { RoadIcon, IndianFlagGraphic } from '../components/CivicEmblems';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface ReportFlowProps {
  onCancel: () => void;
  onSuccess: (complaint: Complaint) => void;
  onRequireAuth?: () => void;
}

type Step =
  | 'capture'
  | 'analyzing'
  | 'review_ai'
  | 'edit_ai'
  | 'location'
  | 'confirm'
  | 'submitting'
  | 'success';

// Pre-tested offline demonstration image pack for reliable presentation
const SAMPLE_TEST_IMAGES = [
  {
    name: 'Pothole (Road)',
    category: 'pothole',
    url: '/demo-images/pothole.jpg',
  },
  {
    name: 'Garbage Dump',
    category: 'garbage',
    url: '/demo-images/garbage.jpg',
  },
  {
    name: 'Broken Streetlight',
    category: 'streetlight',
    url: '/demo-images/streetlight.jpg',
  },
  {
    name: 'Blocked Drain',
    category: 'drain',
    url: '/demo-images/drain.jpg',
  },
  {
    name: 'Unclear Photo (Test Guard)',
    category: 'other',
    url: '/demo-images/unclear.jpg',
  },
];

export const ReportFlow: React.FC<ReportFlowProps> = ({
  onCancel,
  onSuccess,
  onRequireAuth,
}) => {
  const { t } = useLanguage();
  const { citizen, isLoggedIn, loading } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>('capture');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzingError, setAnalyzingError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);

  // Hidden file inputs for Camera and Gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // AI Detection State
  const [aiResult, setAiResult] = useState<CivicDetectionResult | null>(null);

  // Editable fields
  const [editedProblemType, setEditedProblemType] = useState<ProblemType>('pothole');
  const [editedSeverity, setEditedSeverity] = useState<SeverityLevel>('HIGH');
  const [description, setDescription] = useState<string>('');

  // Location State
  const [latitude, setLatitude] = useState<number>(DEFAULT_MAP_CENTER[0]);
  const [longitude, setLongitude] = useState<number>(DEFAULT_MAP_CENTER[1]);
  const [locationName, setLocationName] = useState<string>('Bhopal, Madhya Pradesh');

  // Submission state
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  // Pre-submission duplicate awareness state
  const [similarComplaints, setSimilarComplaints] = useState<SimilarComplaintSummary[]>([]);

  useEffect(() => {
    if (currentStep === 'confirm') {
      getSimilarComplaints({
        problem_type: editedProblemType,
        latitude,
        longitude,
        radius_km: 1.0,
      })
        .then((res) => setSimilarComplaints(res))
        .catch((err) => {
          console.warn('Similar complaint check non-fatal error:', err);
          setSimilarComplaints([]);
        });
    }
  }, [currentStep, editedProblemType, latitude, longitude]);

  // Auto-detect geolocation if possible
  const handleAutoDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationName(
            `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
          );
        },
        (error) => {
          console.warn('Geolocation unavailable:', error.message);
        },
        { timeout: 8000 }
      );
    }
  };

  // Prevent flash while auth session is restoring
  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800 mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Verifying citizen session...</p>
      </div>
    );
  }

  // If user is genuinely not logged in, enforce sign-in gate before reporting
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#0B2545] text-white flex items-center justify-center mx-auto shadow-xs">
            <Lock size={22} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              Citizen Sign In Required
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto font-sans">
              Please sign in or create a citizen account before reporting a civic issue.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={onRequireAuth || onCancel}
              className="w-full py-2.5 px-4 bg-[#0B2545] hover:bg-[#07192f] text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs font-sans"
            >
              <User size={14} />
              <span>Sign In / Register to Report</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium text-xs rounded-xl transition-colors cursor-pointer font-sans"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle local file selection with strict validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type.toLowerCase()) || file.size > 10 * 1024 * 1024) {
        setAnalyzingError('Please upload a valid image (JPG, PNG, WEBP - Max 10MB).');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalyzingError(null);
    }
  };

  // Quick-pick sample image loader for testing
  const handleSelectSample = async (sampleUrl: string, sampleName: string) => {
    try {
      setAnalyzingError(null);
      const res = await fetch(sampleUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `${sampleName.toLowerCase().replace(/[\s()]+/g, '_')}.jpg`,
        { type: 'image/jpeg' }
      );
      setSelectedFile(file);
      setPreviewUrl(sampleUrl);
    } catch (err) {
      console.error('Error loading sample image', err);
    }
  };

  // Trigger AI Analysis
  const handleStartAnalysis = async () => {
    if (isAnalyzing) return;

    // If user clicked analyze without a photo, auto-load sample or prompt
    if (!selectedFile) {
      // Pick first demo image if none selected
      if (SAMPLE_TEST_IMAGES.length > 0) {
        await handleSelectSample(SAMPLE_TEST_IMAGES[0].url, SAMPLE_TEST_IMAGES[0].name);
      }
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep('analyzing');
    setAnalyzingError(null);

    try {
      const result = await analyzeCivicImage(selectedFile);
      setAiResult(result);
      setEditedProblemType(result.problem_type);
      setEditedSeverity(result.severity);
      setCurrentStep('review_ai');
    } catch (err: any) {
      setAnalyzingError(
        err.message || 'AI analysis is temporarily unavailable. Please try again.'
      );
      setCurrentStep('capture');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit final complaint with double-click prevention
  const handleSubmitComplaint = async () => {
    if (isSubmitting || !selectedFile || !aiResult) return;

    setIsSubmitting(true);
    setCurrentStep('submitting');
    try {
      // 1. Upload image to Supabase Storage
      const uploadedUrl = await uploadComplaintImage(selectedFile);

      // 2. Create complaint in Supabase DB
      const newComplaint = await createComplaint({
        problem_type: editedProblemType,
        confidence: aiResult.confidence,
        severity: editedSeverity,
        evidence: aiResult.evidence,
        latitude,
        longitude,
        location_name: locationName,
        department: aiResult.suggested_department || 'Municipal Corporation',
        description,
        image_url: uploadedUrl,
      });

      setSubmittedComplaint(newComplaint);
      setCurrentStep('success');
    } catch (err: any) {
      const errMsg = err.message || 'Failed to submit complaint. Please try again.';
      setAnalyzingError(errMsg);
      setCurrentStep('confirm');
      if (errMsg.toLowerCase().includes('session has expired') && onRequireAuth) {
        setTimeout(() => onRequireAuth(), 1200);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator number
  const getStepNumber = () => {
    switch (currentStep) {
      case 'capture':
        return 1;
      case 'analyzing':
      case 'review_ai':
      case 'edit_ai':
        return 2;
      case 'location':
        return 3;
      case 'confirm':
      case 'submitting':
      case 'success':
        return 4;
      default:
        return 1;
    }
  };

  const stepNumber = getStepNumber();

  return (
    <div className="w-full font-sans select-none">
      {/* Hidden file inputs for Camera vs Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CENTER / MAIN CONTENT (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top row: Back button & Step progress */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (currentStep === 'capture') onCancel();
                else if (currentStep === 'review_ai') setCurrentStep('capture');
                else if (currentStep === 'edit_ai') setCurrentStep('review_ai');
                else if (currentStep === 'location') setCurrentStep('review_ai');
                else if (currentStep === 'confirm') setCurrentStep('location');
                else onCancel();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            {/* Step 1/4 + 4 Horizontal Segment Bars */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">
                Step {stepNumber}/4
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      step <= stepNumber
                        ? 'w-7 bg-[#2563EB]'
                        : 'w-7 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Heading and Subheading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Report Civic Issue
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 leading-relaxed">
              Help improve your city. Report issues like potholes, garbage, broken streetlights and more.
            </p>
          </div>

          {analyzingError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{analyzingError}</span>
              </div>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-colors shrink-0 cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* ================= STEP 1: CAPTURE / MAIN UI ================= */}
          {currentStep === 'capture' && (
            <div className="space-y-3.5">
              {/* Card 1: Upload or Snap Photo */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 text-center shadow-xs flex flex-col items-center justify-center">
                {previewUrl ? (
                  <div className="w-full space-y-4">
                    <div className="max-h-72 w-full rounded-xl overflow-hidden bg-slate-100 relative shadow-inner border border-slate-200 flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Civic Issue Preview"
                        className="max-h-72 w-auto object-contain mx-auto"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-4 py-2 bg-[#0B2545] hover:bg-[#07192f] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Camera size={14} />
                        <span>Retake Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <ImageIcon size={14} />
                        <span>Change Photo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Center Camera Circular Badge */}
                    <div className="w-14 h-14 rounded-full bg-[#F0F5FF] text-[#1D4ED8] flex items-center justify-center mb-3.5 shadow-2xs">
                      <Camera size={26} strokeWidth={2} />
                    </div>

                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Upload or Snap Photo
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Clear photos help us understand the issue better. (JPG, PNG, WEBP – Max 10MB)
                    </p>

                    {/* Action Buttons: Take Photo & Choose from Gallery */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#07192f] text-white text-xs font-medium rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Camera size={14} />
                        <span>Take Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                      >
                        <ImageIcon size={14} />
                        <span>Choose from Gallery</span>
                      </button>
                    </div>

                    {/* Quick Demo Pack Samples for convenience */}
                    <div className="mt-5 pt-4 border-t border-slate-100 w-full max-w-md">
                      <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={11} className="text-amber-500" />
                          <span>Quick Demo Samples:</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Click to test
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {SAMPLE_TEST_IMAGES.map((sample) => (
                          <button
                            key={sample.name}
                            type="button"
                            onClick={() => handleSelectSample(sample.url, sample.name)}
                            className="px-2 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 text-[11px] font-medium rounded-lg border border-slate-200/80 transition-colors text-left flex items-center gap-1.5 cursor-pointer truncate"
                          >
                            <ProblemIcon type={sample.category as ProblemType} size={12} />
                            <span className="truncate">{sample.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Location */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={handleAutoDetectLocation}
                    title="Click to auto-detect location"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 tracking-tight">
                        Location
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                        {locationName || 'Auto-detect or select on map'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
                  >
                    <MapIcon size={14} className="text-slate-600" />
                    <span>Select on Map &gt;</span>
                  </button>
                </div>

                {/* Inline Map Picker dropdown/toggle */}
                {showMapPicker && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <LocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      locationName={locationName}
                      onChange={(lat, lng, name) => {
                        setLatitude(lat);
                        setLongitude(lng);
                        setLocationName(name);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Card 3: Common Issue Types */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <LayoutGrid size={16} className="text-slate-700" />
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    Common Issue Types
                  </span>
                </div>

                {/* 6 Category Chips matching the screenshot */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {/* 1. Pothole */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('pothole')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'pothole'
                        ? 'border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RoadIcon size={14} hasCrack className="text-current shrink-0" />
                    <span className="truncate">Pothole</span>
                  </button>

                  {/* 2. Garbage Dump */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('garbage')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'garbage'
                        ? 'border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Trash2 size={14} className="text-current shrink-0" />
                    <span className="truncate">Garbage Dump</span>
                  </button>

                  {/* 3. Broken Streetlight */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('streetlight')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'streetlight'
                        ? 'border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Lightbulb size={14} className="text-current shrink-0" />
                    <span className="truncate">Broken Streetlight</span>
                  </button>

                  {/* 4. Blocked Drain */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('drain')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'drain'
                        ? 'border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Droplets size={14} className="text-current shrink-0" />
                    <span className="truncate">Blocked Drain</span>
                  </button>

                  {/* 5. Damaged Road */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('pothole')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'pothole'
                        ? 'border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RoadIcon size={14} className="text-current shrink-0" />
                    <span className="truncate">Damaged Road</span>
                  </button>

                  {/* 6. Other */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('other')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'other'
                        ? 'border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MoreHorizontal size={14} className="text-current shrink-0" />
                    <span className="truncate">Other</span>
                  </button>
                </div>
              </div>

              {/* Bottom Full-Width CTA: Analyze with AI -> */}
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="w-full py-3.5 px-6 bg-[#0B2545] hover:bg-[#07192f] text-white font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer mt-4"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Analyzing Image with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-300" />
                    <span>Analyze with AI</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ================= STEP 2: ANALYZING ================= */}
          {currentStep === 'analyzing' && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center space-y-6 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto shadow-xs">
                <Sparkles size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Analyzing Civic Issue
                </h3>
                <p className="text-xs text-slate-500">
                  Applying computer vision model to categorize issue, evaluate severity, and identify municipal routing.
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-2.5 text-xs text-left">
                <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </div>
                  <span>Image feature extraction & quality verification</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </div>
                  <span>Classification: Pothole / Waste / Streetlight / Drain</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <Loader2 size={14} className="animate-spin text-blue-600 shrink-0" />
                  <span className="text-slate-900 font-semibold">
                    Calculating civic impact & department routing
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: REVIEW AI RESULT ================= */}
          {currentStep === 'review_ai' && aiResult && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                {/* AI Header */}
                <div className="bg-[#0B2545] text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-400" />
                    <span className="font-semibold text-xs tracking-tight">AI Civic Triage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiResult.is_fallback && (
                      <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                        DEMO FALLBACK
                      </span>
                    )}
                    <span className="text-[11px] font-mono bg-white/10 px-2.5 py-0.5 rounded text-white font-medium">
                      {Math.round(aiResult.confidence * 100)}% Confidence
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  {/* Detected Problem */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                    <div>
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Detected Problem
                      </div>
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2 mt-0.5">
                        <ProblemIcon type={editedProblemType} size={16} />
                        <span>{getProblemLabel(editedProblemType, t)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('edit_ai')}
                      className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* Visual Severity */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                    <div>
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Visual Severity
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <SeverityBadge severity={editedSeverity} showSubtitle />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('edit_ai')}
                      className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* Evidence flags */}
                  <div className="pb-3.5 border-b border-slate-100">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                      Evidence Flags
                    </div>
                    {aiResult.evidence && aiResult.evidence.length > 0 ? (
                      <ul className="space-y-1 list-disc list-inside text-slate-700">
                        {aiResult.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400 italic">No specific evidence flags</span>
                    )}
                  </div>

                  {/* Routing Department */}
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Suggested Department
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">
                      {aiResult.suggested_department || 'Municipal Roads & Infrastructure'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Automated municipal dispatch recommendation
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('edit_ai')}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Edit Detection
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('location')}
                  className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#07192f] text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Confirm Location</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: EDIT RESULT OVERRIDE ================= */}
          {currentStep === 'edit_ai' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-xs">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">Edit AI Detection</h3>
                <p className="text-xs text-slate-500">
                  Citizens always have final authority to correct AI classifications before submitting.
                </p>
              </div>

              {/* Category selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Problem Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pothole', 'garbage', 'streetlight', 'drain', 'other'] as ProblemType[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditedProblemType(cat)}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                          editedProblemType === cat
                            ? 'border-[#2563EB] bg-[#EEF4FF] text-[#2563EB] font-semibold ring-1 ring-[#2563EB]/20'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <ProblemIcon type={cat} size={15} />
                        <span>{getProblemLabel(cat)}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Severity selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Visual Severity
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SeverityLevel[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setEditedSeverity(sev)}
                      className={`py-1.5 text-center rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        editedSeverity === sev
                          ? 'border-[#0B2545] bg-[#0B2545] text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Danger to pedestrians, water logging for 3 days..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-slate-400 focus:outline-hidden"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep('review_ai')}
                  className="w-full py-2.5 bg-[#0B2545] hover:bg-[#07192f] text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Done Editing
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 5: LOCATION CONFIRMATION ================= */}
          {currentStep === 'location' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  locationName={locationName}
                  onChange={(lat, lng, name) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setLocationName(name);
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('review_ai')}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('confirm')}
                  className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#07192f] text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Review &amp; Submit</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 6: FINAL CONFIRMATION ================= */}
          {currentStep === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <h3 className="text-xs font-semibold text-slate-900 pb-2 border-b border-slate-100">
                  Review Complaint Summary
                </h3>

                {/* Pre-submission duplicate awareness banner */}
                {similarComplaints.length > 0 && (
                  <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-1.5 text-xs font-sans">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-[11.5px]">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                      <span>Existing Report Nearby ({similarComplaints.length} detected within 1km)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      A similar incident was reported nearby (e.g. <span className="font-mono font-bold">{similarComplaints[0].report_id}</span> at {similarComplaints[0].location_name || 'vicinity'}, ~{Math.round(similarComplaints[0].distance_meters)}m away).
                      You can still submit your report with this photo to help municipal authorities cross-verify urgency and scope.
                    </p>
                  </div>
                )}

                {previewUrl && (
                  <div className="h-44 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={previewUrl}
                      alt="Complaint Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Problem Type
                    </span>
                    <span className="font-semibold text-slate-800">
                      {getProblemLabel(editedProblemType, t)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Visual Severity
                    </span>
                    <SeverityBadge severity={editedSeverity} size="sm" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Department
                    </span>
                    <span className="font-semibold text-slate-800">
                      {aiResult?.suggested_department || 'Municipal Corporation'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Location
                    </span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {locationName}
                    </span>
                  </div>
                </div>

                {description && (
                  <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium mb-0.5">
                      Citizen Notes:
                    </span>
                    <span className="text-slate-700">{description}</span>
                  </div>
                )}

                {/* Reporting Citizen Info */}
                {citizen && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <span>Reporting Citizen</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200/60 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Verified
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">{citizen.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{citizen.email}</div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('location')}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitComplaint}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#07192f] disabled:opacity-50 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Submit Complaint</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================= SUBMITTING STATE ================= */}
          {currentStep === 'submitting' && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4 shadow-xs">
              <Loader2 size={32} className="animate-spin text-slate-800 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  Submitting to Municipal Portal...
                </h3>
                <p className="text-xs text-slate-500">
                  Generating official tracking ID and notifying ward authorities.
                </p>
              </div>
            </div>
          )}

          {/* ================= SUCCESS STATE ================= */}
          {currentStep === 'success' && submittedComplaint && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center space-y-5 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={30} />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Complaint Filed Successfully!
                </h2>
                <p className="text-xs text-slate-500">
                  Your civic issue has been officially logged with municipal authorities.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Official Report ID
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 tracking-wider">
                  {submittedComplaint.report_id}
                </div>
                <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500">Status:</span>
                  <StatusBadge status={submittedComplaint.status} />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const c = submittedComplaint;
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setAiResult(null);
                    setSubmittedComplaint(null);
                    setCurrentStep('capture');
                    onSuccess(c);
                  }}
                  className="w-full py-2.5 bg-[#0B2545] hover:bg-[#07192f] text-white font-medium text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Track in My Reports
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setAiResult(null);
                    setSubmittedComplaint(null);
                    setCurrentStep('capture');
                  }}
                  className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  File Another Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Quick Tips */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Lightbulb size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Quick Tips</h3>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-slate-900 stroke-[2.5] shrink-0 mt-0.5" />
                <span>Use clear and focused photos</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-slate-900 stroke-[2.5] shrink-0 mt-0.5" />
                <span>Add a precise location</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-slate-900 stroke-[2.5] shrink-0 mt-0.5" />
                <span>Provide a short description</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-slate-900 stroke-[2.5] shrink-0 mt-0.5" />
                <span>Choose the correct category</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Help us build cleaner, safer cities */}
          <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-5 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950 leading-snug">
                  Help us build cleaner, safer cities
                </h3>
                <p className="text-xs text-emerald-800/80 leading-relaxed mt-2 font-normal">
                  Your report makes a difference. Together we can create better places for everyone.
                </p>
              </div>
            </div>

            {/* Indian Flag & Initiatives */}
            <div className="mt-5 pt-3.5 border-t border-emerald-200/60 flex items-center gap-3">
              <IndianFlagGraphic className="w-9 h-6 shrink-0" />
              <div className="flex flex-col text-[11px] leading-tight">
                <span className="font-bold text-slate-800">Swachh Bharat</span>
                <span className="font-medium text-slate-700">Smart Cities</span>
                <span className="font-medium text-slate-700">Viksit Bharat</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
