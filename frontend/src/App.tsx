import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User, EmailItem } from './types';
import { api } from './api/client';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailDetailModal } from './components/EmailDetailModal';
import { ComposeModal } from './components/ComposeModal';
import { SlackModal } from './components/SlackModal';
import { Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState<boolean>(false);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [slackConnected, setSlackConnected] = useState<boolean>(false);
  const [slackDetails, setSlackDetails] = useState<{ teamName: string | null; channelName: string | null }>({
    teamName: null,
    channelName: null,
  });
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Debounce ref for search queries
  const searchTimeoutRef = useRef<number | null>(null);

  // Refresh Slack Status helper
  const refreshSlackStatus = useCallback(async () => {
    try {
      const status = await api.getSlackStatus();
      setSlackConnected(status.connected);
      setSlackDetails({ teamName: status.teamName, channelName: status.channelName });
    } catch {
      setSlackConnected(false);
    }
  }, []);

  // 1. Initial auth check & URL parameters inspection (for Slack redirect callback)
  useEffect(() => {
    let isMounted = true;
    async function initUser() {
      try {
        const currentUser = await api.getMe();
        if (isMounted) {
          setUser(currentUser);
        }
        if (currentUser) {
          await refreshSlackStatus();
        }
      } catch (err) {
        console.error('Failed to authenticate session:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }

      // Check for Slack or Auth redirect query params
      const params = new URLSearchParams(window.location.search);
      if (params.get('slack') === 'connected') {
        setNotification({
          text: 'Slack workspace connected successfully! Rate-limit alerts are now active.',
          type: 'success',
        });
        refreshSlackStatus();
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get('slack_error')) {
        setNotification({
          text: `Slack connection error: ${decodeURIComponent(params.get('slack_error') || '')}`,
          type: 'error',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    initUser();
    return () => {
      isMounted = false;
    };
  }, [refreshSlackStatus]);

  // 2. Fetch counts for sidebar badges
  const refreshCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [scheduledRes, sentRes] = await Promise.all([
        api.searchEmails({ status: 'scheduled' }),
        api.searchEmails({ status: 'sent' }),
      ]);
      setScheduledCount(scheduledRes.total);
      setSentCount(sentRes.total);
    } catch (err) {
      console.warn('Could not refresh badge counts:', err);
    }
  }, [user]);

  // 3. Fetch emails based on activeTab and current searchQuery
  const loadEmails = useCallback(
    async (query: string = searchQuery) => {
      if (!user) return;
      setIsLoadingEmails(true);
      try {
        const res = await api.searchEmails({
          status: activeTab,
          query: query,
        });
        setEmails(res.emails);
        if (activeTab === 'scheduled') {
          setScheduledCount(res.total);
        } else {
          setSentCount(res.total);
        }
      } catch (err) {
        console.error('Failed to load emails:', err);
      } finally {
        setIsLoadingEmails(false);
      }
    },
    [user, activeTab, searchQuery]
  );

  // Load emails whenever activeTab changes
  useEffect(() => {
    if (user) {
      loadEmails(searchQuery);
      refreshCounts();
    }
  }, [user, activeTab, refreshCounts]);

  // Handle Search Input with 350ms debounce
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      loadEmails(val);
    }, 350);
  };

  // 4. Polling for live status updates while on 'scheduled' tab
  useEffect(() => {
    if (!user) return;

    // Refresh every 5 seconds to catch worker sending completions in real-time
    const interval = setInterval(() => {
      if (activeTab === 'scheduled') {
        loadEmails(searchQuery);
        refreshCounts();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, activeTab, searchQuery, loadEmails, refreshCounts]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setEmails([]);
      setSelectedEmail(null);
    }
  };

  // Handle Campaign Created
  const handleCampaignCreated = () => {
    setIsComposeOpen(false);
    setActiveTab('scheduled');
    setSelectedEmail(null);
    loadEmails('');
    refreshCounts();
    setNotification({
      text: 'Campaign scheduled successfully! Emails are queued in BullMQ.',
      type: 'success',
    });
  };

  // 5. Loading screen during session bootstrap
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg mb-4 shadow-md animate-pulse">
          ONB
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading EmailJobScheduler...</span>
        </div>
      </div>
    );
  }

  // 6. Not logged in -> Render Figma Login Page
  if (!user) {
    return <LoginView />;
  }

  // 7. Authenticated -> Render Full Figma Dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onLogout={handleLogout}
        slackConnected={slackConnected}
        onOpenSlack={() => setIsSlackModalOpen(true)}
      />

      {/* Global Toast Notification */}
      {notification && (
        <div className="px-6 pt-3">
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          user={user}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedEmail(null);
          }}
          onOpenCompose={() => setIsComposeOpen(true)}
          scheduledCount={scheduledCount}
          sentCount={sentCount}
        />

        {/* Center Content: Either Email Detail or Email List */}
        <main className="flex-1 flex overflow-hidden">
          {selectedEmail ? (
            <EmailDetailModal
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
            />
          ) : (
            <EmailList
              emails={emails}
              activeTab={activeTab}
              isLoading={isLoadingEmails}
              onRefresh={() => {
                loadEmails(searchQuery);
                refreshCounts();
              }}
              onSelectEmail={(email) => setSelectedEmail(email)}
            />
          )}
        </main>
      </div>

      {/* Compose Email Modal (Floating Overlay Dialog with Cut Button) */}
      {isComposeOpen && (
        <ComposeModal
          user={user}
          onClose={() => setIsComposeOpen(false)}
          onCampaignCreated={handleCampaignCreated}
        />
      )}

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        slackConnected={slackConnected}
        slackDetails={slackDetails}
        onStatusChange={() => {
          refreshSlackStatus();
        }}
      />
    </div>
  );
};

export default App;
