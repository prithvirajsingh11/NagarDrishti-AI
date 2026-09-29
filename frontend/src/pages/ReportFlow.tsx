import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Lock,
  User,
} from 'lucide-react';
import type {
  CivicDetectionResult,
  Complaint,
  ProblemType,
  SeverityLevel
} from '../types/complaint';
import {
  analyzeCivicImage,
  createComplaint,
  uploadComplaintImage
} from '../services/api';
import { ProblemIcon, getProblemLabel } from '../components/ProblemIcon';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LocationPicker, DEFAULT_MAP_CENTER } from '../components/LocationPicker';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface ReportFlowProps {
  onCancel: () => void;
  onSuccess: (complaint: Complaint) => void;
  onRequireAuth?: () => void;
}

type Step = 'capture' | 'analyzing' | 'review_ai' | 'edit_ai' | 'location' | 'confirm' | 'submitting' | 'success';

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

export const ReportFlow: React.FC<ReportFlowProps> = ({ onCancel, onSuccess, onRequireAuth }) => {
  const { t } = useLanguage();
  const { citizen, isLoggedIn, loading } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>('capture');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzingError, setAnalyzingError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Hidden file inputs for Camera and Gallery on Android/Mobile
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

  // Prevent flash or hook count mismatches while auth session is restoring
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
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
            <Lock size={22} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">
              {t('auth.report_gate_title', 'Citizen Sign In Required')}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              {t('auth.report_gate_desc', 'Please sign in or create a citizen account before reporting a civic issue.')}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={onRequireAuth || onCancel}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <User size={14} />
              <span>{t('auth.login', 'Sign In / Register to Report')}</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium text-xs rounded-xl transition-colors cursor-pointer"
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
        setAnalyzingError('Please upload a valid image.');
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
      const file = new File([blob], `${sampleName.toLowerCase().replace(/[\s\(\)]+/g, '_')}.jpg`, {
        type: 'image/jpeg',
      });
      setSelectedFile(file);
      setPreviewUrl(sampleUrl);
    } catch (err) {
      console.error('Error loading sample image', err);
    }
  };

  // Trigger AI Analysis with double-click and quota protection
  const handleStartAnalysis = async () => {
    if (!selectedFile || isAnalyzing) return;

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
      setAnalyzingError(err.message || 'AI analysis is temporarily unavailable. Please try again.');
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
      // 1. Upload image to Supabase Storage (controlled backend reference)
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
        department: aiResult.suggested_department || 'Municipal Roads',
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

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{t('report.back')}</span>
        </button>
        <span className="text-xs font-bold text-slate-700 tracking-tight">
          {t('report.header_title')}
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          {t('report.step')} {currentStep === 'capture' ? '1/4' : currentStep === 'review_ai' || currentStep === 'edit_ai' ? '2/4' : currentStep === 'location' ? '3/4' : '4/4'}
        </span>
      </div>

      {analyzingError && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{analyzingError}</span>
          </div>
          {selectedFile && (
            <button
              onClick={handleStartAnalysis}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-colors shrink-0 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* STEP 1: CAPTURE / UPLOAD */}
      {currentStep === 'capture' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-900">{t('report.upload_title')}</h2>
            <p className="text-xs text-slate-500">
              {t('report.upload_desc')}
            </p>
          </div>

          {/* Hidden native inputs for Camera vs Gallery on Android / Mobile */}
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

          {/* Photo Dropzone / Capture Box */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-white/80 shadow-xs">
            {previewUrl ? (
              <div className="space-y-3">
                <div className="h-56 w-full rounded-lg overflow-hidden bg-slate-100 relative shadow-inner">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={13} />
                    <span>{t('report.retake')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon size={13} />
                    <span>{t('report.change_gallery')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Camera size={24} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {t('report.upload_title')}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    JPG, PNG, WEBP (Max 10MB)
                  </div>
                </div>

                {/* Mobile Camera vs Gallery Dual Buttons */}
                <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto pt-1">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>{t('report.take_photo')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs rounded-lg border border-slate-200/90 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImageIcon size={14} />
                    <span>{t('report.choose_gallery')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick-Pick Test Samples */}
          <div className="bg-slate-100/70 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-slate-500" />
                <span>{t('report.demo_pack')}:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">{t('report.click_to_load')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {SAMPLE_TEST_IMAGES.map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => handleSelectSample(sample.url, sample.name)}
                  className="px-2.5 py-1.5 bg-white/90 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg border border-slate-200 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <ProblemIcon type={sample.category as ProblemType} size={13} />
                  <span className="truncate">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleStartAnalysis}
            disabled={!selectedFile || isAnalyzing}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{t('report.processing')}</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>{t('report.analyze_btn')}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: ANALYZING STATE */}
      {currentStep === 'analyzing' && (
        <div className="bg-white/90 backdrop-blur-xs rounded-xl p-8 border border-slate-200 text-center space-y-6 shadow-xs">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Sparkles size={24} />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {t('report.analyzing_title')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('report.analyzing_desc')}
            </p>
          </div>

          {/* Sequential Progress Indicators */}
          <div className="max-w-xs mx-auto space-y-2 text-xs text-left">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">✓</div>
              <span>{t('report.analyzing_step1')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">✓</div>
              <span>{t('report.analyzing_step2')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Loader2 size={14} className="animate-spin text-slate-700 shrink-0" />
              <span className="text-slate-900 font-semibold">{t('report.analyzing_step3')}</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW AI RESULT */}
      {currentStep === 'review_ai' && aiResult && (
        <div className="space-y-4">
          <div className="bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Header */}
            <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <span className="font-semibold text-xs">{t('report.ai_triage')}</span>
              </div>
              <div className="flex items-center gap-2">
                {aiResult.is_fallback && (
                  <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                    DEMO FALLBACK
                  </span>
                )}
                <span className="text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded text-white font-medium">
                  {Math.round(aiResult.confidence * 100)}% {t('report.confidence')}
                </span>
              </div>
            </div>

            {/* Low Confidence or Retake Notice */}
            {aiResult.needs_retake && (
              <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Image Clarification Needed</div>
                    <div>
                      {aiResult.guidance_message ||
                        "We couldn't clearly identify the civic issue. Please capture a clearer photo."}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setCurrentStep('capture');
                  }}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-md text-xs transition-colors shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} />
                  <span>{t('report.retake')}</span>
                </button>
              </div>
            )}

            <div className="p-4 space-y-3.5 text-xs">
              {/* Detected Problem */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {t('report.detected_problem')}
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
                  <Edit2 size={11} />
                  <span>{t('report.edit')}</span>
                </button>
              </div>

              {/* Visual Severity */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {t('report.visual_severity')}
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
                  <Edit2 size={11} />
                  <span>{t('report.edit')}</span>
                </button>
              </div>

              {/* Evidence */}
              <div className="pb-3 border-b border-slate-100">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  {t('report.evidence')}
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

              {/* Suggested Department */}
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {t('report.department')}
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                  {aiResult.suggested_department || 'Manual Review'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Automated routing recommendation
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep('edit_ai')}
              className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              {t('report.edit')}
            </button>
            <button
              onClick={() => setCurrentStep('location')}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{t('report.continue')}</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: EDIT RESULT OVERRIDE */}
      {currentStep === 'edit_ai' && (
        <div className="bg-white/90 backdrop-blur-xs rounded-xl p-5 border border-slate-200 space-y-4 shadow-xs">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['pothole', 'garbage', 'streetlight', 'drain', 'other'] as ProblemType[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setEditedProblemType(cat)}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                    editedProblemType === cat
                      ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900/10'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ProblemIcon type={cat} size={15} />
                  <span>{getProblemLabel(cat)}</span>
                </button>
              ))}
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
                  className={`py-1.5 text-center rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    editedSeverity === sev
                      ? 'border-slate-900 bg-slate-900 text-white'
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
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="pt-1">
            <button
              onClick={() => setCurrentStep('review_ai')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              {t('report.done_editing')}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: LOCATION CONFIRMATION */}
      {currentStep === 'location' && (
        <div className="space-y-4">
          <div className="bg-white/90 backdrop-blur-xs rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep('review_ai')}
              className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              {t('report.back')}
            </button>
            <button
              onClick={() => setCurrentStep('confirm')}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{t('report.review_complaint')}</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: FINAL REVIEW BEFORE SUBMIT */}
      {currentStep === 'confirm' && (
        <div className="space-y-4">
          <div className="bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-900 pb-2 border-b border-slate-100">
              {t('report.review_complaint')}
            </h3>

            {previewUrl && (
              <div className="h-40 w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80">
                <img
                  src={previewUrl}
                  alt="Complaint Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('report.detected_problem')}</span>
                <span className="font-semibold text-slate-800">{getProblemLabel(editedProblemType, t)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('report.visual_severity')}</span>
                <SeverityBadge severity={editedSeverity} size="sm" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('report.department')}</span>
                <span className="font-semibold text-slate-800">{aiResult?.suggested_department || 'Municipal Roads'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Location</span>
                <span className="font-semibold text-slate-800 truncate block">{locationName}</span>
              </div>
            </div>

            {description && (
              <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium mb-0.5">Citizen Notes:</span>
                <span className="text-slate-700">{description}</span>
              </div>
            )}

            {/* Reporting Citizen Info */}
            {citizen && (
              <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>{t('auth.profile', 'Citizen Profile')}</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium border border-emerald-200/60 flex items-center gap-0.5">
                    <CheckCircle2 size={10} />
                    {t('auth.verified_citizen', 'Verified')}
                  </span>
                </div>
                <div className="font-semibold text-slate-800">
                  {citizen.name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {citizen.email}
                </div>
              </div>
            )}

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-slate-700 shrink-0" />
              <span>
                Verified and ready for municipal dispatch. You will receive an official Report ID.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep('location')}
              className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              {t('report.back')}
            </button>
            <button
              onClick={handleSubmitComplaint}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>{t('report.submit_complaint')}</span>
            </button>
          </div>
        </div>
      )}

      {/* SUBMITTING STATE */}
      {currentStep === 'submitting' && (
        <div className="bg-white/90 backdrop-blur-xs rounded-xl p-8 border border-slate-200 text-center space-y-4 shadow-xs">
          <Loader2 size={30} className="animate-spin text-slate-800 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">
              {t('report.submitting_title')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('report.submitting_desc')}
            </p>
          </div>
        </div>
      )}

      {/* STEP 7 & 8: SUCCESS / REPORT ID CONFIRMATION */}
      {currentStep === 'success' && submittedComplaint && (
        <div className="bg-white/90 backdrop-blur-xs rounded-xl p-6 sm:p-8 border border-slate-200 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mx-auto">
            <CheckCircle2 size={26} />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">{t('report.created_title')}</h2>
            <p className="text-xs text-slate-500">
              {t('report.created_desc')}
            </p>
          </div>

          {/* Report ID Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {t('report.report_id')}
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 tracking-wider">
              {submittedComplaint.report_id}
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 text-xs">
              <span className="text-slate-500">{t('report.status')}:</span>
              <StatusBadge status={submittedComplaint.status} />
            </div>
          </div>

          {/* Duplicate note if marked */}
          {submittedComplaint.duplicate_of && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg text-left flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Possible Duplicate Flagged:</span> A nearby report ({submittedComplaint.duplicate_of}) was recently filed for this issue. Authority will review for consolidation.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onSuccess(submittedComplaint)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              {t('report.track_btn')}
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setAiResult(null);
                setCurrentStep('capture');
              }}
              className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {t('report.another_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
