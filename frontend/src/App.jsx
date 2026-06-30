import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AuroraBackground from './components/AuroraBackground';
import Header from './components/Header';
import BridgeOverview from './components/BridgeOverview';
import MetricCards from './components/MetricCards';
import HealthScore from './components/HealthScore';
import MaintenancePanel from './components/MaintenancePanel';
import LiveCharts from './components/LiveCharts';
import RiskGauge from './components/RiskGauge';
import AlertPanel from './components/AlertPanel';
import HistoryChart from './components/HistoryChart';
import TrafficPanel from './components/TrafficPanel';
import ChatPanel from './components/ChatPanel';
import NavBar from './components/NavBar';
import IndiaNetwork from './pages/IndiaNetwork';
import AIIntelligenceCenter from './pages/AIIntelligenceCenter';
import Maintenance from './pages/Maintenance';
import InstallPrompt from './components/InstallPrompt';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import CrackDetection from './pages/CrackDetection';
import Dashboard from './pages/Dashboard';
import AgentInspector from './pages/AgentInspector';
import SurvivalAnalysis from './pages/SurvivalAnalysis';
import { useAuth } from './context/AuthContext';
import {
  fetchLive,
  fetchAlerts,
  fetchHistory,
  fetchHealthHistory,
  fetchBridges,
} from './api';

const MAX_CHART_POINTS = 30;

const getInitialPage = () => {
  if (window.location.pathname === '/maintenance') return 'maintenance';
  return 'dashboard';
};

export default function App() {
  const { token, loading } = useAuth();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === '/maintenance') {
      setCurrentPage('maintenance');
    }
  }, [location.pathname]);

  const [activeBridgeId, setActiveBridgeId] = useState(1);
  const [bridges, setBridges] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [chartData, setChartData] = useState({
    water_level: [],
    vibration: [],
    strain: [],
    crack_gap: [],
  });
  const [alerts, setAlerts] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [healthHistory, setHealthHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [unreadProactiveAlerts, setUnreadProactiveAlerts] = useState(0);

  const [toastMessage, setToastMessage] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const savedToast = sessionStorage.getItem('oauth_toast');
    if (savedToast) {
      setToastMessage(savedToast);
      setShowToast(true);
      sessionStorage.removeItem('oauth_toast');
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Find active bridge details
  const activeBridgeSafeId = Number(activeBridgeId) > 0 ? Number(activeBridgeId) : 1;
  const activeBridge = bridges.find((b) => Number(b.id) === activeBridgeSafeId);
  const activeBridgeName = activeBridge?.name || `Bridge ${activeBridgeSafeId}`;

  // ── Fetch bridges overview every 2 seconds ──────────────────
  const pollBridges = useCallback(async () => {
    try {
      const data = await fetchBridges();
      setBridges(data);
    } catch (err) {
      console.error('[bridges]', err);
    }
  }, []);

  // ── Fetch live data every 2 seconds ──────────────────────────
  const pollLive = useCallback(async () => {
    try {
      const data = await fetchLive(activeBridgeSafeId);
      setLiveData(data);
      setConnectionStatus('connected');

      // Extract time label
      const timeLabel =
        data.timestamp?.split('T')[1]?.slice(0, 8) ||
        data.timestamp?.split(' ')[1]?.slice(0, 8) ||
        '';

      setChartData((prev) => {
        const next = { ...prev };
        for (const sensor of ['water_level', 'vibration', 'strain', 'crack_gap']) {
          const arr = [...(prev[sensor] || []), { time: timeLabel, value: data[sensor] }];
          next[sensor] =
            arr.length > MAX_CHART_POINTS ? arr.slice(-MAX_CHART_POINTS) : arr;
        }
        return next;
      });
    } catch (err) {
      console.error('[live]', err);
      setConnectionStatus('error');
    }
  }, [activeBridgeSafeId]);

  // ── Fetch alerts every 5 seconds ─────────────────────────────
  const pollAlerts = useCallback(async () => {
    try {
      const data = await fetchAlerts(activeBridgeSafeId);
      setAlerts(data);
    } catch (err) {
      console.error('[alerts]', err);
    }
  }, [activeBridgeSafeId]);

  // ── Fetch health history every 10 seconds ────────────────────
  const pollHealthHistory = useCallback(async () => {
    try {
      const data = await fetchHealthHistory(activeBridgeSafeId);
      setHealthHistory(data);
    } catch (err) {
      console.error('[health-history]', err);
    }
  }, [activeBridgeSafeId]);

  // ── Reset rolling data and fetch history on bridge switch ────────────────
  useEffect(() => {
    if (!token) return;
    setChartData({
      water_level: [],
      vibration: [],
      strain: [],
      crack_gap: [],
    });
    setLiveData(null);

    fetchHistory(activeBridgeSafeId)
      .then(setHistoryData)
      .catch((err) => console.error('[history]', err));

    pollLive();
    pollAlerts();
    pollHealthHistory();
    pollBridges();
  }, [token, activeBridgeSafeId, pollLive, pollAlerts, pollHealthHistory, pollBridges]);

  // ── Start polling ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const bridgesInterval = setInterval(pollBridges, 2000);
    const liveInterval = setInterval(pollLive, 2000);
    const alertsInterval = setInterval(pollAlerts, 5000);
    const healthInterval = setInterval(pollHealthHistory, 10000);

    return () => {
      clearInterval(bridgesInterval);
      clearInterval(liveInterval);
      clearInterval(alertsInterval);
      clearInterval(healthInterval);
    };
  }, [token, pollLive, pollAlerts, pollHealthHistory, pollBridges]);

  const floatingTools = (
    <>
      <ChatPanel 
        bridgeId={activeBridgeSafeId} 
        bridgeName={activeBridgeName} 
        isOpen={isChatOpen} 
        setIsOpen={setIsChatOpen} 
        onNewProactiveAlert={() => {
          if (!isChatOpen) {
            setUnreadProactiveAlerts(prev => prev + 1);
          }
        }}
        onClearProactiveAlerts={() => setUnreadProactiveAlerts(0)}
      />
      <InstallPrompt />
    </>
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const path = page === 'maintenance' ? '/maintenance' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <AuroraBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div 
            className="min-h-screen flex flex-col items-center justify-center space-y-4"
            style={{ color: 'var(--text-primary)' }}
          >
            <div className="w-10 h-10 rounded-full border-4 border-t-2 animate-spin" style={{ borderColor: '#3b82f6', borderTopColor: '#3b82f6' }} />
            <p className="text-xs uppercase tracking-widest font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>
              Decrypting Security Database...
            </p>
          </div>
          {floatingTools}
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <AuroraBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Login />
          {floatingTools}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', position: 'relative' }}>
      <AuroraBackground />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', minHeight: '100vh' }}>
        {/* Toast Notification */}
        {showToast && toastMessage && (
          <div 
            className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl border flex items-center gap-3 animate-fade-in-up"
            style={{ 
              background: '#0e1610', 
              borderColor: '#3fb950', 
              color: 'var(--accent-green-light)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderLeft: '4px solid #3fb950',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>✓</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{toastMessage.replace('✓ ', '')}</span>
          </div>
        )}

        {/* Sidebar */}
        <NavBar 
          currentPage={currentPage} 
          setCurrentPage={handlePageChange} 
          isChatOpen={isChatOpen} 
          setIsChatOpen={(open) => {
            setIsChatOpen(open);
            if (open) {
              setUnreadProactiveAlerts(0);
            }
          }} 
          unreadAlertsCount={unreadProactiveAlerts}
        />

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Connection status bar */}
          {connectionStatus === 'error' && (
            <div 
              className="px-8 py-2 flex items-center gap-2"
              style={{ background: 'rgba(255, 123, 114, 0.1)', borderBottom: '1px solid #ff7b72' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ff7b72' }} />
              <span className="text-xs font-medium" style={{ color: '#ff7b72' }}>
                Connection lost — retrying every 2s…
              </span>
            </div>
          )}

          <Header activeBridgeName={activeBridgeName} activeBridgeId={activeBridgeSafeId} currentPage={currentPage} />

          <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
            <div className="max-w-screen-2xl mx-auto space-y-6">
              {currentPage === 'dashboard' ? (
                <Dashboard
                  onSelectBridge={setActiveBridgeId}
                  setCurrentPage={handlePageChange}
                />
              ) : currentPage === 'maintenance' ? (
                <Maintenance />
              ) : currentPage === 'admin' ? (
                <AdminPanel />
              ) : currentPage === 'crack-detection' ? (
                <CrackDetection />
              ) : currentPage === 'aiops' ? (
                <AIIntelligenceCenter />
              ) : currentPage === 'ai-inspector' ? (
                <AgentInspector />
              ) : currentPage === 'predictive' ? (
                <SurvivalAnalysis />
              ) : (
                <IndiaNetwork onSelectBridge={setActiveBridgeId} setCurrentPage={setCurrentPage} />
              )}
            </div>

            {/* Footer */}
            <footer className="text-center py-6 mt-12" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Bridge Health Monitor SHM v1.0 — Real-time structural health monitoring powered by ML pipelines
              </p>
            </footer>
          </main>
        </div>
      </div>
      {floatingTools}
    </div>
  );
}
