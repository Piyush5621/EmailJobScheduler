import React from 'react';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { EmailItem } from '../types';

interface EmailDetailModalProps {
  email: EmailItem;
  onBack: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, onBack }) => {
  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-4rem)] p-8 overflow-y-auto">
      {/* Back Button matching Figma */}
      <button
        onClick={onBack}
        type="button"
        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back</span>
      </button>

      {/* Email Subject Header */}
      <div className="pb-6 border-b border-slate-100 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">
          {email.subject}
        </h1>

        {/* Sender / Recipient Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200">
              {(email.recipient_name || email.recipient_email).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">
                To: {email.recipient_name ? `${email.recipient_name} (${email.recipient_email})` : email.recipient_email}
              </div>
              <div className="text-xs text-slate-400">
                Campaign #{email.campaign_id} • Created {new Date(email.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {email.status === 'scheduled' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                Scheduled for {new Date(email.scheduled_at).toLocaleString()}
              </span>
            )}
            {email.status === 'sending' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                Sending in progress...
              </span>
            )}
            {email.status === 'sent' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Delivered at {email.sent_at ? new Date(email.sent_at).toLocaleString() : 'N/A'}
              </span>
            )}
            {email.status === 'failed' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                Failed Delivery
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Message Alert (if failed) */}
      {email.error_message && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-6 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">Delivery Error:</div>
            <div>{email.error_message}</div>
          </div>
        </div>
      )}

      {/* Email Body Content matching Figma */}
      <div className="prose max-w-none text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-normal p-2">
        {email.body}
      </div>
    </div>
  );
};
