import React, { useRef, useState } from 'react';
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
} from '../types/complaint';
import {
  analyzeCivicImage,
  createComplaint,
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

// Pre-tested offline demonstration image pack
const SAMPLE_TEST_IMAGES = [
  {
    nameKey: 'problems.pothole',
    defaultName: 'Pothole (Road)',
    category: 'pothole',
    url: '/demo-images/pothole.jpg',
  },
  {
    nameKey: 'problems.garbage',
    defaultName: 'Garbage Dump',
    category: 'garbage',
    url: '/demo-images/garbage.jpg',
  },
  {
    nameKey: 'problems.streetlight',
    defaultName: 'Broken Streetlight',
    category: 'streetlight',
    url: '/demo-images/streetlight.jpg',
  },
  {
    nameKey: 'problems.drain',
    defaultName: 'Blocked Drain',
    category: 'drain',
    url: '/demo-images/drain.jpg',
  },
  {
    nameKey: 'problems.other',
    defaultName: 'Unclear Photo (Test Guard)',
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
        <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200 mx-auto mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Verifying citizen session...
        </p>
      </div>
    );
  }

  // If user is genuinely not logged in, enforce sign-in gate before reporting
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 text-center space-y-5 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#0B2545] dark:bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xs">
            <Lock size={22} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-sans">
              {t('auth.report_gate_title', 'Citizen Sign In Required')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto font-sans">
              {t('auth.report_gate_desc', 'Please sign in or create a citizen account before reporting a civic issue.')}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={onRequireAuth || onCancel}
              className="w-full py-2.5 px-4 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs font-sans"
            >
              <User size={14} />
              <span>{t('auth.login', 'Sign In / Register to Report')}</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs rounded-xl transition-colors cursor-pointer font-sans"
            >
              {t('report.back', 'Back to Home')}
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
    if (!selectedFile) {
      if (SAMPLE_TEST_IMAGES.length > 0) {
        await handleSelectSample(SAMPLE_TEST_IMAGES[0].url, SAMPLE_TEST_IMAGES[0].defaultName);
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

  // Submit final complaint
  const handleSubmitComplaint = async () => {
    if (!selectedFile || !aiResult) return;

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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>{t('report.back', 'Back')}</span>
            </button>

            {/* Step 1/4 + 4 Horizontal Segment Bars */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('report.step', 'Step')} {stepNumber}/4
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      step <= stepNumber
                        ? 'w-7 bg-[#2563EB] dark:bg-blue-500'
                        : 'w-7 bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Heading and Subheading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('report.header_title', 'Report Civic Issue')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-1 leading-relaxed">
              {t('report.header_subtitle', 'Help improve your city. Report issues like potholes, garbage, broken streetlights and more.')}
            </p>
          </div>

          {analyzingError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 text-center shadow-xs flex flex-col items-center justify-center transition-colors">
                {previewUrl ? (
                  <div className="w-full space-y-4">
                    <div className="max-h-72 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative shadow-inner border border-slate-200 dark:border-slate-700 flex items-center justify-center">
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
                        className="px-4 py-2 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Camera size={14} />
                        <span>{t('report.retake', 'Retake Photo')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <ImageIcon size={14} />
                        <span>{t('report.change_gallery', 'Change Photo')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Center Camera Circular Badge */}
                    <div className="w-14 h-14 rounded-full bg-[#F0F5FF] dark:bg-blue-950/60 text-[#1D4ED8] dark:text-blue-400 flex items-center justify-center mb-3.5 shadow-2xs">
                      <Camera size={26} strokeWidth={2} />
                    </div>

                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      {t('report.upload_title', 'Upload or Snap Photo')}
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      {t('report.upload_desc', 'Clear photos help us understand the issue better. (JPG, PNG, WEBP – Max 10MB)')}
                    </p>

                    {/* Action Buttons: Take Photo & Choose from Gallery */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-medium rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Camera size={14} />
                        <span>{t('report.take_photo', 'Take Photo')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                      >
                        <ImageIcon size={14} />
                        <span>{t('report.choose_gallery', 'Choose from Gallery')}</span>
                      </button>
                    </div>

                    {/* Quick Demo Pack Samples */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 w-full max-w-md">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={11} className="text-amber-500" />
                          <span>{t('report.demo_pack', 'Quick Demo Samples')}:</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {t('report.click_to_load', 'Click to test')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {SAMPLE_TEST_IMAGES.map((sample) => (
                          <button
                            key={sample.category}
                            type="button"
                            onClick={() => handleSelectSample(sample.url, sample.defaultName)}
                            className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 text-[11px] font-medium rounded-lg border border-slate-200/80 dark:border-slate-700 transition-colors text-left flex items-center gap-1.5 cursor-pointer truncate"
                          >
                            <ProblemIcon type={sample.category as ProblemType} size={12} />
                            <span className="truncate">{t(sample.nameKey, sample.defaultName)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Location */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={handleAutoDetectLocation}
                    title="Click to auto-detect location"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1D4ED8] dark:text-blue-400 flex items-center justify-center shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                        {t('report.location_title', 'Location')}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                        {locationName || t('report.location_autodetect', 'Auto-detect or select on map')}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    <MapIcon size={14} className="text-slate-600 dark:text-slate-400" />
                    <span>{t('report.select_on_map', 'Select on Map >')}</span>
                  </button>
                </div>

                {/* Inline Map Picker dropdown/toggle */}
                {showMapPicker && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
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
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <LayoutGrid size={16} className="text-slate-700 dark:text-slate-300" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                    {t('report.common_issue_types', 'Common Issue Types')}
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
                        ? 'border-[#2563EB] bg-[#EEF4FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <RoadIcon size={14} hasCrack className="text-current shrink-0" />
                    <span className="truncate">{t('problems.pothole', 'Pothole')}</span>
                  </button>

                  {/* 2. Garbage Dump */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('garbage')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'garbage'
                        ? 'border-[#2563EB] bg-[#EEF4FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Trash2 size={14} className="text-current shrink-0" />
                    <span className="truncate">{t('problems.garbage', 'Garbage Dump')}</span>
                  </button>

                  {/* 3. Broken Streetlight */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('streetlight')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'streetlight'
                        ? 'border-[#2563EB] bg-[#EEF4FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Lightbulb size={14} className="text-current shrink-0" />
                    <span className="truncate">{t('problems.streetlight', 'Broken Streetlight')}</span>
                  </button>

                  {/* 4. Blocked Drain */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('drain')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'drain'
                        ? 'border-[#2563EB] bg-[#EEF4FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Droplets size={14} className="text-current shrink-0" />
                    <span className="truncate">{t('problems.drain', 'Blocked Drain')}</span>
                  </button>

                  {/* 5. Damaged Road */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('pothole')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'pothole'
                        ? 'border-[#2563EB] bg-[#EEF4FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <RoadIcon size={14} className="text-current shrink-0" />
                    <span className="truncate">{t('problems.damaged_road', 'Damaged Road')}</span>
                  </button>

                  {/* 6. Other */}
                  <button
                    type="button"
                    onClick={() => setEditedProblemType('other')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editedProblemType === 'other'
                        ? 'border-[#2563EB] bg-[#EEF4FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold ring-1 ring-[#2563EB]/20 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MoreHorizontal size={14} className="text-current shrink-0" />
                    <span className="truncate">{t('problems.other', 'Other')}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Full-Width CTA: Analyze with AI -> */}
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="w-full py-3.5 px-6 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer mt-4"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t('report.processing', 'Processing Image...')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-300" />
                    <span>{t('report.analyze_btn', 'Analyze with AI')}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ================= STEP 2: ANALYZING ================= */}
          {currentStep === 'analyzing' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/90 dark:border-slate-800 text-center space-y-6 shadow-xs transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1D4ED8] dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                <Sparkles size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('report.analyzing_title', 'Analyzing your image...')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('report.analyzing_desc', 'AI multimodal vision is examining visual evidence')}
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-2.5 text-xs text-left">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#0B2545] dark:bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </div>
                  <span>{t('report.analyzing_step1', 'Identifying civic issue')}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#0B2545] dark:bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </div>
                  <span>{t('report.analyzing_step2', 'Checking visual severity')}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                  <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {t('report.analyzing_step3', 'Preparing triage summary')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: REVIEW AI RESULT ================= */}
          {currentStep === 'review_ai' && aiResult && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
                {/* AI Header */}
                <div className="bg-[#0B2545] dark:bg-slate-800 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-400" />
                    <span className="font-semibold text-xs tracking-tight">
                      {t('report.ai_triage', 'AI Detection Triage')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiResult.is_fallback && (
                      <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                        DEMO FALLBACK
                      </span>
                    )}
                    <span className="text-[11px] font-mono bg-white/10 px-2.5 py-0.5 rounded text-white font-medium">
                      {Math.round(aiResult.confidence * 100)}% {t('report.confidence', 'confidence')}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  {/* Detected Problem */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        {t('report.detected_problem', 'Detected Problem')}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                        <ProblemIcon type={editedProblemType} size={16} />
                        <span>{getProblemLabel(editedProblemType, t)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('edit_ai')}
                      className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>{t('report.edit', 'Edit')}</span>
                    </button>
                  </div>

                  {/* Visual Severity */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        {t('report.visual_severity', 'Visual Severity')}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <SeverityBadge severity={editedSeverity} showSubtitle />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('edit_ai')}
                      className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>{t('report.edit', 'Edit')}</span>
                    </button>
                  </div>

                  {/* Evidence flags */}
                  <div className="pb-3.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                      {t('report.evidence', 'Evidence')}
                    </div>
                    {aiResult.evidence && aiResult.evidence.length > 0 ? (
                      <ul className="space-y-1 list-disc list-inside text-slate-700 dark:text-slate-300">
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
                      {t('report.department', 'Suggested Department')}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {aiResult.suggested_department || 'Municipal Corporation'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('edit_ai')}
                  className="flex-1 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('report.edit', 'Edit Detection')}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('location')}
                  className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>{t('report.continue', 'Confirm Location')}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: EDIT RESULT OVERRIDE ================= */}
          {currentStep === 'edit_ai' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs transition-colors">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('report.edit', 'Edit AI Detection')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Citizens always have final authority to correct AI classifications before submitting.
                </p>
              </div>

              {/* Category selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('report.detected_problem', 'Problem Category')}
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
                            ? 'border-[#2563EB] bg-[#EEF4FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold ring-1 ring-[#2563EB]/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <ProblemIcon type={cat} size={15} />
                        <span>{getProblemLabel(cat, t)}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Severity selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('report.visual_severity', 'Visual Severity')}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SeverityLevel[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setEditedSeverity(sev)}
                      className={`py-1.5 text-center rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        editedSeverity === sev
                          ? 'border-[#0B2545] bg-[#0B2545] dark:bg-blue-600 dark:border-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Danger to pedestrians, water logging for 3 days..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:border-slate-400 focus:outline-hidden"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep('review_ai')}
                  className="w-full py-2.5 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('report.done_editing', 'Done Editing')}
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 5: LOCATION CONFIRMATION ================= */}
          {currentStep === 'location' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
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
                  className="flex-1 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('report.back', 'Back')}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('confirm')}
                  className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>{t('report.review_complaint', 'Review & Submit')}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 6: FINAL CONFIRMATION ================= */}
          {currentStep === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs transition-colors">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  {t('report.review_complaint', 'Review Complaint Summary')}
                </h3>

                {previewUrl && (
                  <div className="h-44 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
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
                      {t('report.detected_problem', 'Problem Type')}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {getProblemLabel(editedProblemType, t)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      {t('report.visual_severity', 'Visual Severity')}
                    </span>
                    <SeverityBadge severity={editedSeverity} size="sm" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      {t('report.department', 'Department')}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {aiResult?.suggested_department || 'Municipal Corporation'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      {t('report.location_title', 'Location')}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {locationName}
                    </span>
                  </div>
                </div>

                {description && (
                  <div className="text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-medium mb-0.5">
                      Citizen Notes:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{description}</span>
                  </div>
                )}

                {/* Reporting Citizen Info */}
                {citizen && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <span>{t('auth.profile', 'Reporting Citizen')}</span>
                      <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-medium border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        {t('auth.verified_citizen', 'Verified')}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">{citizen.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{citizen.email}</div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('location')}
                  className="flex-1 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('report.back', 'Back')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitComplaint}
                  className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check size={14} />
                  <span>{t('report.submit_complaint', 'Submit Complaint')}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= SUBMITTING STATE ================= */}
          {currentStep === 'submitting' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xs transition-colors">
              <Loader2 size={32} className="animate-spin text-slate-800 dark:text-slate-200 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('report.submitting_title', 'Submitting to Municipal Portal...')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('report.submitting_desc', 'Generating official tracking ID and notifying ward authorities.')}
                </p>
              </div>
            </div>
          )}

          {/* ================= SUCCESS STATE ================= */}
          {currentStep === 'success' && submittedComplaint && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center space-y-5 shadow-xs transition-colors">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={30} />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('report.created_title', 'Complaint Filed Successfully!')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('report.created_desc', 'Your civic issue has been officially logged with municipal authorities.')}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-1.5">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {t('report.report_id', 'Official Report ID')}
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-wider">
                  {submittedComplaint.report_id}
                </div>
                <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{t('report.status', 'Status')}:</span>
                  <StatusBadge status={submittedComplaint.status} />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => onSuccess(submittedComplaint)}
                  className="w-full py-2.5 bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {t('report.track_btn', 'Track in My Reports')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setAiResult(null);
                    setCurrentStep('capture');
                  }}
                  className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {t('report.another_btn', 'File Another Report')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Quick Tips */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-colors">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lightbulb size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {t('tips.title', 'Quick Tips')}
              </h3>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-slate-900 dark:text-white stroke-[2.5] shrink-0 mt-0.5" />
                <span>{t('tips.tip1', 'Use clear and focused photos')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-slate-900 dark:text-white stroke-[2.5] shrink-0 mt-0.5" />
                <span>{t('tips.tip2', 'Add a precise location')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-slate-900 dark:text-white stroke-[2.5] shrink-0 mt-0.5" />
                <span>{t('tips.tip3', 'Provide a short description')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-slate-900 dark:text-white stroke-[2.5] shrink-0 mt-0.5" />
                <span>{t('tips.tip4', 'Choose the correct category')}</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Help us build cleaner, safer cities */}
          <div className="bg-[#F0FDF4] dark:bg-emerald-950/30 border border-[#DCFCE7] dark:border-emerald-900/60 rounded-2xl p-5 shadow-xs transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 leading-snug">
                  {t('mission.title', 'Help us build cleaner, safer cities')}
                </h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed mt-2 font-normal">
                  {t('mission.desc', 'Your report makes a difference. Together we can create better places for everyone.')}
                </p>
              </div>
            </div>

            {/* Indian Flag & Initiatives */}
            <div className="mt-5 pt-3.5 border-t border-emerald-200/60 dark:border-emerald-900/60 flex items-center gap-3">
              <IndianFlagGraphic className="w-9 h-6 shrink-0" />
              <div className="flex flex-col text-[11px] leading-tight">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {t('mission.swachh_bharat', 'Swachh Bharat')}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {t('mission.smart_cities', 'Smart Cities')}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {t('mission.viksit_bharat', 'Viksit Bharat')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
