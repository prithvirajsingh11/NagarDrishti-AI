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
import { LocationPicker } from '../components/LocationPicker';

interface ReportFlowProps {
  onCancel: () => void;
  onSuccess: (complaint: Complaint) => void;
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

export const ReportFlow: React.FC<ReportFlowProps> = ({ onCancel, onSuccess }) => {
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
  const [latitude, setLatitude] = useState<number>(28.6139);
  const [longitude, setLongitude] = useState<number>(77.2090);
  const [locationName, setLocationName] = useState<string>('Connaught Place, New Delhi');

  // Submission state
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

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
      setAnalyzingError(err.message || 'Failed to submit complaint. Please try again.');
      setCurrentStep('confirm');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold text-slate-700 tracking-tight">
          Report Civic Issue • नागरिक रिपोर्ट
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          Step {currentStep === 'capture' ? '1/4' : currentStep === 'review_ai' || currentStep === 'edit_ai' ? '2/4' : currentStep === 'location' ? '3/4' : '4/4'}
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
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-colors shrink-0"
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
            <h2 className="text-lg font-bold text-slate-900">Upload or Snap Photo</h2>
            <p className="text-xs text-slate-500">
              Clear photos of potholes, garbage, streetlights, or drains yield highest AI accuracy.
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
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center bg-white shadow-xs">
            {previewUrl ? (
              <div className="space-y-3">
                <div className="h-56 w-full rounded-xl overflow-hidden bg-slate-100 relative shadow-inner">
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
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Camera size={13} />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <ImageIcon size={13} />
                    <span>Change from Gallery</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Camera size={28} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Capture or Upload Civic Defect
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    फोटो लें या गैलरी से अपलोड करें (JPG, PNG, WEBP)
                  </div>
                </div>

                {/* Mobile Camera vs Gallery Dual Buttons */}
                <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto pt-1">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-3 px-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Camera size={16} />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-3 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImageIcon size={16} />
                    <span>Choose Gallery</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick-Pick Test Samples (Section 8: Pre-tested demo pack) */}
          <div className="bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200">
            <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>Pre-tested Demo Image Pack (Offline Ready):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Click to load</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SAMPLE_TEST_IMAGES.map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => handleSelectSample(sample.url, sample.name)}
                  className="px-2.5 py-2 bg-white text-slate-700 hover:bg-sky-50 hover:text-sky-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors text-left flex items-center gap-1.5"
                >
                  <ProblemIcon type={sample.category as ProblemType} size={14} />
                  <span className="truncate">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleStartAnalysis}
            disabled={!selectedFile || isAnalyzing}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Image...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Analyze with AI • स्कैन करें</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: ANALYZING STATE (Matches UX Requirement Section 20) */}
      {currentStep === 'analyzing' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-6 shadow-sm">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 animate-pulse">
              <Sparkles size={32} />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Analyzing your image...
            </h3>
            <p className="text-xs text-slate-500">
              AI multimodal vision is examining visual evidence
            </p>
          </div>

          {/* Sequential Progress Indicators */}
          <div className="max-w-xs mx-auto space-y-2.5 text-xs text-left">
            <div className="flex items-center gap-2.5 text-slate-700 font-medium">
              <div className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">✓</div>
              <span>Identifying the civic issue</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 font-medium">
              <div className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">✓</div>
              <span>Checking visual severity</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 font-medium">
              <Loader2 size={16} className="animate-spin text-sky-600 shrink-0" />
              <span className="text-sky-800 font-semibold">Preparing your report</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW AI RESULT (Matches Section 11) */}
      {currentStep === 'review_ai' && aiResult && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="font-bold text-sm">AI Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                {aiResult.is_fallback && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                    DEMO FALLBACK
                  </span>
                )}
                <span className="text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded text-sky-200 font-bold">
                  {Math.round(aiResult.confidence * 100)}% confidence
                </span>
              </div>
            </div>

            {/* Low Confidence or Retake Notice */}
            {aiResult.needs_retake && (
              <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Image Clarification Needed</div>
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
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center justify-center gap-1 shadow-xs"
                >
                  <RefreshCw size={12} />
                  <span>Retake Photo</span>
                </button>
              </div>
            )}

            <div className="p-4 space-y-4 text-xs">
              {/* Detected Problem */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Detected Problem
                  </div>
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                    <ProblemIcon type={editedProblemType} size={18} />
                    <span>{getProblemLabel(editedProblemType)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('edit_ai')}
                  className="text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>

              {/* Visual Severity */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    AI-estimated Visual Severity
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <SeverityBadge severity={editedSeverity} showSubtitle />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('edit_ai')}
                  className="text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>

              {/* Evidence */}
              <div className="pb-3 border-b border-slate-100">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Evidence
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
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Suggested Department
                </div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {aiResult.suggested_department || 'Manual Review'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Preliminary automated routing recommendation
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep('edit_ai')}
              className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
            >
              Edit Result
            </button>
            <button
              onClick={() => setCurrentStep('location')}
              className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Continue</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: EDIT RESULT OVERRIDE */}
      {currentStep === 'edit_ai' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-xs">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Edit AI Detection</h3>
            <p className="text-xs text-slate-500">
              Citizens always have final authority to correct AI classifications before submitting.
            </p>
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Problem Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['pothole', 'garbage', 'streetlight', 'drain', 'other'] as ProblemType[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setEditedProblemType(cat)}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                    editedProblemType === cat
                      ? 'border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ProblemIcon type={cat} size={16} />
                  <span>{getProblemLabel(cat)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Severity selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              AI-estimated Visual Severity
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SeverityLevel[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setEditedSeverity(sev)}
                  className={`py-2 text-center rounded-lg border text-xs font-bold transition-all ${
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Danger to cyclists, water stagnant for 3 days..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setCurrentStep('review_ai')}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Done Editing
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: LOCATION CONFIRMATION */}
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep('review_ai')}
              className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep('confirm')}
              className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Review Complaint</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: FINAL REVIEW BEFORE SUBMIT */}
      {currentStep === 'confirm' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Confirm Complaint Details
            </h3>

            {previewUrl && (
              <div className="h-40 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={previewUrl}
                  alt="Complaint Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Problem</span>
                <span className="font-bold text-slate-800">{getProblemLabel(editedProblemType)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Visual Severity</span>
                <SeverityBadge severity={editedSeverity} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Suggested Dept</span>
                <span className="font-semibold text-slate-800">{aiResult?.suggested_department || 'Municipal Roads'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Location</span>
                <span className="font-semibold text-slate-800 truncate block">{locationName}</span>
              </div>
            </div>

            {description && (
              <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold mb-0.5">Citizen Notes:</span>
                <span className="text-slate-700">{description}</span>
              </div>
            )}

            <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100 text-[11px] text-sky-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
              <span>
                Verified and ready for municipal dispatch. You will receive an official Report ID.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep('location')}
              className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmitComplaint}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              <span>Submit Complaint • शिकायत दर्ज करें</span>
            </button>
          </div>
        </div>
      )}

      {/* SUBMITTING STATE */}
      {currentStep === 'submitting' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <Loader2 size={36} className="animate-spin text-emerald-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Uploading & Registering Report...
            </h3>
            <p className="text-xs text-slate-500">
              Saving photo to storage and assigning unique report identifier.
            </p>
          </div>
        </div>
      )}

      {/* STEP 7 & 8: SUCCESS / REPORT ID CONFIRMATION */}
      {currentStep === 'success' && submittedComplaint && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 text-center space-y-5 shadow-lg shadow-emerald-900/5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900">Complaint Created</h2>
            <p className="text-xs text-slate-500">
              Your civic report has been registered into the municipal decision-support database.
            </p>
          </div>

          {/* Report ID Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Report ID (शिकायत संख्या)
            </div>
            <div className="text-2xl font-black font-mono text-sky-600 tracking-wider">
              {submittedComplaint.report_id}
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 text-xs">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                {submittedComplaint.status}
              </span>
            </div>
          </div>

          {/* Duplicate note if marked */}
          {submittedComplaint.duplicate_of && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl text-left flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Possible Duplicate Flagged:</span> A nearby report ({submittedComplaint.duplicate_of}) was recently filed for this issue. Authority will review for consolidation.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => onSuccess(submittedComplaint)}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Track in My Reports
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setAiResult(null);
                setCurrentStep('capture');
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
