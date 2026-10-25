import React from 'react';
import { Search, ExternalLink, LogOut, Bell } from 'lucide-react';
import type { User } from '../types';

interface HeaderProps {
  user: User;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogout: () => void;
  slackConnected: boolean;
  onOpenSlack: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  searchQuery,
  onSearchChange,
  onLogout,
  slackConnected,
  onOpenSlack,
}) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Brand Logo matching Figma */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-xs">
          ONB
        </div>
        <span className="font-semibold text-slate-900 tracking-tight text-base">Outbox</span>
      </div>

      {/* Center: Search Bar with real Elasticsearch integration */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails by subject, recipient, body..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-4">
        {/* Live Queue Dashboard link */}
        <a
          href="/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          title="Open real-time BullMQ Dashboard"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
        >
          <span>Queues</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Slack Status / Configure Button */}
        <button
          onClick={onOpenSlack}
          type="button"
          title={slackConnected ? 'Slack rate-limit alerts active (Click to manage)' : 'Connect Slack workspace or Webhook'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-xs cursor-pointer ${
            slackConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${slackConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
          />
          <Bell className="w-3.5 h-3.5" />
          <span>{slackConnected ? 'Slack Active' : 'Connect Slack'}</span>
        </button>

        {/* User Profile Pill & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</div>
            <div className="text-[11px] text-slate-400 leading-tight truncate max-w-[140px]">{user.email}</div>
          </div>

          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
