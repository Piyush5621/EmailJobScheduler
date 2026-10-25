import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  Paperclip,
  Calendar,
  Clock,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  Link2,
  Image,
  Code,
  Undo2,
  Redo2,
  Send,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import type { User } from '../types';

interface ComposeModalProps {
  user: User;
  onClose: () => void;
  onCampaignCreated: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  user,
  onClose,
  onCampaignCreated,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  // Send Later Picker state
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>(() => {
    // Default to 10 minutes in the future
    const d = new Date(Date.now() + 10 * 60 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Add a recipient manually from text input
  const handleAddRecipient = (emailToAdd: string) => {
    const trimmed = emailToAdd.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmed && emailRegex.test(trimmed) && !recipients.includes(trimmed)) {
      setRecipients((prev) => [...prev, trimmed]);
      setRecipientInput('');
      setError(null);
    }
  };

  const handleKeyDownRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddRecipient(recipientInput);
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients((prev) => prev.filter((r) => r !== emailToRemove));
  };

  // CSV / Text File Lead Parsing matching Figma Frame 7
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = content.match(emailRegex) || [];

      if (matches.length === 0) {
        setError('No valid email addresses were found in the uploaded file.');
        return;
      }

      const normalized = matches.map((m) => m.trim().toLowerCase());
      const unique = Array.from(new Set([...recipients, ...normalized]));
      setRecipients(unique);
      setError(null);
    };

    reader.onerror = () => {
      setError('Failed to read the selected file.');
    };

    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Schedule Presets matching Figma Frame 5
  const applyPreset = (presetHours: number, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setDate(d.getDate() + (presetHours === 24 ? 1 : 0));
    d.setHours(hours, minutes, 0, 0);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduledDateTime(localIso);
  };

  // Submit the Campaign to Backend
  const handleScheduleSubmit = async () => {
    if (recipients.length === 0) {
      setError('Please add at least one recipient email address or upload a CSV of leads.');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a campaign subject.');
      return;
    }
    if (!body.trim()) {
      setError('Please enter the email body.');
      return;
    }

    const startAtDate = new Date(scheduledDateTime);
    if (Number.isNaN(startAtDate.getTime())) {
      setError('Please select a valid scheduled start date and time.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Ensure recipients exist in PostgreSQL database to obtain recipient IDs
      const recipientIds: number[] = [];
      for (const email of recipients) {
        const r = await api.createRecipient(email);
        recipientIds.push(r.id);
      }

      // Step 2: Create campaign and queue delayed email jobs
      await api.createCampaign({
        subject: subject.trim(),
        body: body.trim(),
        startAt: startAtDate.toISOString(),
        delaySeconds,
        hourlyLimit: hourlyLimit > 0 ? hourlyLimit : null,
        recipientIds,
      });

      onCampaignCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Floating Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[92vh] flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Bar matching Figma with Prominent Cut / Close (X) Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
              ONB
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Compose New Email</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear Form */}
            <button
              onClick={() => {
                setSubject('');
                setBody('');
                setRecipients([]);
                setError(null);
              }}
              title="Clear compose form"
              type="button"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Primary Schedule / Send Later Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowSchedulePopup((prev) => !prev)}
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Send Later</span>
              </button>

              {/* Schedule Later Popup Dialog matching Figma Frame 5 */}
              {showSchedulePopup && (
                <div className="absolute right-0 top-10 w-72 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-xs font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>Schedule send</span>
                    <button
                      onClick={() => setShowSchedulePopup(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Preset Suggestions matching Figma */}
                  <div className="space-y-1 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        applyPreset(24, '08:00');
                        setShowSchedulePopup(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex justify-between cursor-pointer"
                    >
                      <span>Tomorrow morning</span>
                      <span className="text-slate-400">8:00 AM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        applyPreset(24, '13:00');
                        setShowSchedulePopup(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex justify-between cursor-pointer"
                    >
                      <span>Tomorrow afternoon</span>
                      <span className="text-slate-400">1:00 PM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        applyPreset(24, '18:00');
                        setShowSchedulePopup(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex justify-between cursor-pointer"
                    >
                      <span>Tomorrow evening</span>
                      <span className="text-slate-400">6:00 PM</span>
                    </button>
                  </div>

                  {/* Custom Picker */}
                  <div className="mb-4 pt-2 border-t border-slate-100">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Pick date & time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSchedulePopup(false)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cut Button (Close Modal) */}
            <button
              onClick={onClose}
              type="button"
              title="Close modal (Esc)"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body with Overflow */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* From Field */}
          <div className="flex items-center gap-4 pb-3 border-b border-slate-100 text-xs">
            <span className="w-16 font-semibold text-slate-400">From</span>
            <span className="text-slate-800 font-medium">{user.email}</span>
          </div>

          {/* To Field with CSV upload matching Figma Frames 6 & 7 */}
          <div className="flex items-start gap-4 pb-3 border-b border-slate-100 text-xs">
            <span className="w-16 font-semibold text-slate-400 pt-1.5">To</span>
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              {/* Recipient Chips matching Figma Frame 7 */}
              {recipients.map((rec) => (
                <span
                  key={rec}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                >
                  {rec}
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(rec)}
                    className="hover:text-emerald-950 text-emerald-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Recipient text input */}
              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleKeyDownRecipient}
                onBlur={() => recipientInput && handleAddRecipient(recipientInput)}
                placeholder={recipients.length === 0 ? 'Type recipient email & press Enter...' : ''}
                className="flex-1 min-w-[200px] py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Upload CSV button matching Figma */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Upload Leads CSV</span>
            </button>
          </div>

          {/* Recipient Counter pill */}
          {recipients.length > 0 && (
            <div className="text-[11px] text-emerald-700 font-semibold pl-20">
              ✓ {recipients.length} unique recipient{recipients.length > 1 ? 's' : ''} detected
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center gap-4 pb-3 border-b border-slate-100 text-xs">
            <span className="w-16 font-semibold text-slate-400">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter campaign subject..."
              className="flex-1 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
            />
          </div>

          {/* Inline Scheduling Parameters Bar matching Figma Frames 5, 6, 7 */}
          <div className="flex flex-wrap items-center gap-6 py-2.5 px-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
            {/* Delay between emails */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Delay between 2 emails:</span>
              <input
                type="number"
                min={0}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 px-2 py-1 text-center bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-400">sec</span>
            </div>

            {/* Hourly Limit */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Hourly Limit:</span>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Math.max(1, parseInt(e.target.value, 10) || 100))}
                className="w-20 px-2 py-1 text-center bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-400">emails/hr</span>
            </div>

            {/* Scheduled Start Time Preview */}
            <div className="flex items-center gap-1.5 ml-auto text-emerald-800 font-semibold">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Starts: {new Date(scheduledDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Compose Body Area */}
          <div className="pt-2">
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              className="w-full p-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 placeholder-slate-400 leading-relaxed font-normal resize-none"
            />

            {/* Formatting Toolbar Icons */}
            <div className="flex items-center gap-1 py-1.5 px-3 border border-slate-200 rounded-xl bg-slate-50/70 mt-2 text-slate-500">
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Bold className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Italic className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Underline className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Strikethrough className="w-3.5 h-3.5" /></button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><List className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Link2 className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Image className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Code className="w-3.5 h-3.5" /></button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Undo2 className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 hover:bg-slate-200/60 rounded text-slate-600"><Redo2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-slate-200/90 bg-slate-50/50 flex items-center justify-between sticky bottom-0">
          <button
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleScheduleSubmit}
            disabled={isSubmitting}
            type="button"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling Campaign...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Schedule Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
