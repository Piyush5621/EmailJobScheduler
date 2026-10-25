import React, { useState } from 'react';
import { X, CheckCircle2, ExternalLink, Send, Trash2, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackConnected: boolean;
  slackDetails: { teamName: string | null; channelName: string | null };
  onStatusChange: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  slackConnected,
  slackDetails,
  onStatusChange,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('alerts');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleOAuthConnect = () => {
    // Redirects to real Slack OAuth v2 endpoint
    window.location.href = '/api/slack/authorize';
  };

  const handleWebhookSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      setMessage({
        text: 'Please enter a valid Slack Incoming Webhook URL starting with https://hooks.slack.com/',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      await api.connectSlackWebhook(webhookUrl.trim(), channelName.trim());
      setMessage({ text: 'Slack webhook connected successfully!', type: 'success' });
      setWebhookUrl('');
      onStatusChange();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to save Slack webhook.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const resMsg = await api.testSlackAlert();
      setMessage({ text: resMsg || 'Test notification sent to Slack successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to dispatch test notification.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await api.disconnectSlack();
      setMessage({ text: 'Slack integration disconnected.', type: 'success' });
      onStatusChange();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to disconnect Slack.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md p-6 z-10 animate-in zoom-in-95 duration-150">
        {/* Header with Title and Cut (Close) Button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
              SL
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Slack Notifications</h2>
              <p className="text-xs text-slate-500">Hourly email rate limit alerts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status / Feedback Banner */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {slackConnected ? (
          /* Active Integration View */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Slack Alerts Connected & Active</span>
              </div>
              <p className="text-xs text-emerald-700/90 pl-6">
                Workspace: <strong>{slackDetails.teamName || 'Active'}</strong>
                {slackDetails.channelName && (
                  <> • Channel: <strong>#{slackDetails.channelName}</strong></>
                )}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestAlert}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Test Alert</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          /* Connect Options */
          <div className="space-y-5">
            {/* Option 1: One-Click OAuth */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Option 1: Connect via Slack OAuth v2
              </label>
              <button
                type="button"
                onClick={handleOAuthConnect}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Connect Slack Workspace</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Or Use Webhook
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {/* Option 2: Direct Incoming Webhook URL */}
            <form onSubmit={handleWebhookSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Option 2: Incoming Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Channel Name (optional)
                </label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g. email-alerts"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !webhookUrl}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Save Slack Webhook</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
