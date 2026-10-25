import React from 'react';
import { Clock, Send, Plus } from 'lucide-react';
import type { User } from '../types';

interface SidebarProps {
  user: User;
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  scheduledCount: number;
  sentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenCompose,
  scheduledCount,
  sentCount,
}) => {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div>
        {/* User Card Pill matching Figma */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 mb-5">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-slate-800 truncate">{user.name}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
        </div>

        {/* Primary "+ Compose" Button matching Figma */}
        <button
          onClick={onOpenCompose}
          type="button"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold transition-all duration-150 mb-6 shadow-xs"
        >
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>Compose</span>
        </button>

        {/* Navigation Tabs matching Figma */}
        <nav className="space-y-1.5">
          {/* Scheduled Tab */}
          <button
            onClick={() => onTabChange('scheduled')}
            type="button"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className={`w-4 h-4 ${activeTab === 'scheduled' ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === 'scheduled'
                  ? 'bg-emerald-200/80 text-emerald-900'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          {/* Sent Tab */}
          <button
            onClick={() => onTabChange('sent')}
            type="button"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className={`w-4 h-4 ${activeTab === 'sent' ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>Sent</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === 'sent'
                  ? 'bg-emerald-200/80 text-emerald-900'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 text-[11px] text-slate-400 text-center border-t border-slate-100">
        EmailJobScheduler v1.0
      </div>
    </aside>
  );
};
