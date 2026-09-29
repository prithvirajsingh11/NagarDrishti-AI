import React from 'react';
import {
  Phone,
  Mail,
  FileQuestion,
  Building2,
} from 'lucide-react';

export const HelpSupport: React.FC = () => {
  const FAQS = [
    {
      q: 'How does NagarDrishti AI classify civic issues?',
      a: 'NagarDrishti AI uses an advanced computer vision model trained on municipal infrastructure datasets to detect potholes, garbage accumulations, faulty streetlights, and overflowing drains, calculating severity and confidence automatically.',
    },
    {
      q: 'How can I track my submitted complaint?',
      a: 'Once submitted, every report receives a unique Report ID (e.g. ND-2026-XXXX). You can view the live resolution status, assigned field engineers, and resolution timestamps under "My Reports".',
    },
    {
      q: 'Can I correct the AI detection before filing?',
      a: 'Yes, citizens always have final authority! If the AI suggests a different problem type or severity, you can click "Edit" on the review screen to adjust category or notes before dispatching.',
    },
    {
      q: 'What is the standard resolution timeline?',
      a: 'High and Critical severity issues (such as large road craters or open manholes) are routed for expedited 24-48 hour response, while routine maintenance is addressed within standard ward schedules.',
    },
  ];

  return (
    <div className="space-y-6 font-sans select-none max-w-4xl">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200/80">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Help &amp; Support
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Municipal helplines, citizen guidelines, and platform documentation.
        </p>
      </div>

      {/* Emergency & Municipal Helplines Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Phone size={16} />
          </div>
          <div className="font-bold text-xs text-slate-900">National Civic Helpline</div>
          <div className="text-xl font-bold font-mono text-[#0B2545]">1913</div>
          <div className="text-[11px] text-slate-500">Toll-free 24x7 municipal citizen assistance</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Building2 size={16} />
          </div>
          <div className="font-bold text-xs text-slate-900">Swachhata Helpline</div>
          <div className="text-xl font-bold font-mono text-emerald-700">14420</div>
          <div className="text-[11px] text-slate-500">Dedicated sanitation &amp; solid waste redressal</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Mail size={16} />
          </div>
          <div className="font-bold text-xs text-slate-900">Email Grievance Cell</div>
          <div className="text-xs font-semibold text-slate-800 break-all">support@nagardrishti.gov.in</div>
          <div className="text-[11px] text-slate-500">Response within 1 business day</div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileQuestion size={18} className="text-[#0B2545]" />
          <h2 className="text-sm font-bold text-slate-900">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          {FAQS.map((faq, idx) => (
            <div key={idx} className={idx > 0 ? 'pt-3.5' : ''}>
              <h3 className="text-xs font-bold text-slate-900 mb-1">{faq.q}</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
