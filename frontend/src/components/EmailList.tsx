import React from 'react';
import { Clock, RefreshCw, Inbox } from 'lucide-react';
import type { EmailItem } from '../types';

interface EmailListProps {
  emails: EmailItem[];
  activeTab: 'scheduled' | 'sent';
  isLoading: boolean;
  onRefresh: () => void;
  onSelectEmail: (email: EmailItem) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  activeTab,
  isLoading,
  onRefresh,
  onSelectEmail,
}) => {
  // Format readable time matching Figma (e.g., "10:30 AM" or "Oct 25, 10:30 AM")
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Undated';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Undated';
    }
  };

  // Group emails by date
  const grouped = emails.reduce<Record<string, EmailItem[]>>((acc, email) => {
    const dateKey = formatDate(activeTab === 'sent' ? email.sent_at : email.scheduled_at);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(email);
    return acc;
  }, {});

  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-4rem)] p-6 overflow-y-auto">
      {/* Title & Refresh Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {activeTab === 'scheduled' ? 'Scheduled Emails' : 'Sent Emails'}
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
            {emails.length}
          </span>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && emails.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 animate-pulse flex items-center justify-between">
              <div className="space-y-2 w-2/3">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
              <div className="h-3 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && emails.length === 0 && (
        <div className="text-center py-20 px-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            {activeTab === 'scheduled' ? <Clock className="w-7 h-7" /> : <Inbox className="w-7 h-7" />}
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            {activeTab === 'scheduled' ? 'No scheduled emails' : 'No sent emails yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            {activeTab === 'scheduled'
              ? 'Emails you schedule will show up here until they are delivered by the worker.'
              : 'Delivered messages and their statuses will appear here once processed.'}
          </p>
        </div>
      )}

      {/* Email List Grouped by Date matching Figma */}
      {!isLoading && emails.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, groupItems]) => (
            <div key={dateLabel}>
              {/* Group Date Header */}
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                {dateLabel}
              </div>

              {/* Items in Group */}
              <div className="space-y-2">
                {groupItems.map((email) => {
                  const isScheduled = email.status === 'scheduled';
                  const isSent = email.status === 'sent';
                  const isFailed = email.status === 'failed';
                  const isSending = email.status === 'sending';

                  return (
                    <div
                      key={email.id}
                      onClick={() => onSelectEmail(email)}
                      className="group p-4 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4"
                    >
                      {/* Left: Recipient & Snippet */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {email.recipient_name || email.recipient_email}
                          </span>

                          {/* Status Badge matching Figma */}
                          {isScheduled && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              Scheduled
                            </span>
                          )}
                          {isSending && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                              Sending
                            </span>
                          )}
                          {isSent && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Sent
                            </span>
                          )}
                          {isFailed && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              Failed
                            </span>
                          )}
                        </div>

                        {/* Subject + Body snippet preview */}
                        <div className="text-xs text-slate-600 truncate">
                          <span className="font-medium text-slate-800 mr-1.5">{email.subject}</span>
                          <span className="text-slate-400">—</span>
                          <span className="text-slate-500 ml-1.5">{email.body}</span>
                        </div>
                      </div>

                      {/* Right: Timestamp */}
                      <div className="text-right text-xs text-slate-400 group-hover:text-slate-600 shrink-0 font-medium">
                        {formatTime(activeTab === 'sent' ? email.sent_at : email.scheduled_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
