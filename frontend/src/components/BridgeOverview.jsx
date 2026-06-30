import { useState, useEffect } from 'react';
import { fetchBridges, downloadReport } from '../api';
import { useAuth } from '../context/AuthContext';


const GRADE_CONFIG = {
  A: { color: 'var(--accent-green-light)', bg: '#dcfce7', border: '#bbf7d0' },
  B: { color: 'var(--accent-green-light)', bg: '#dcfce7', border: '#bbf7d0' },
  C: { color: 'var(--accent-yellow-light)', bg: '#fef3c7', border: '#fde68a' },
  D: { color: 'var(--accent-red-light)', bg: '#fee2e2', border: '#fecaca' },
  F: { color: 'var(--accent-red-light)', bg: '#fee2e2', border: '#fecaca' },
};

export default function BridgeOverview({ activeBridgeId, onSelectBridge }) {
  const { token } = useAuth();
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingIds, setExportingIds] = useState({});

  async function handleExportCard(e, bridgeId, bridgeName) {
    e.stopPropagation();
    setExportingIds(prev => ({ ...prev, [bridgeId]: true }));
    try {
      await downloadReport(bridgeId, bridgeName);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingIds(prev => ({ ...prev, [bridgeId]: false }));
    }
  }

  useEffect(() => {
    async function loadBridges() {
      try {
        const data = await fetchBridges();
        setBridges(data);
        setError(null);
      } catch (err) {
        console.error('[BridgeOverview fetch error]', err);
        setError(err.message || 'Unknown fetch error');
      } finally {
        setLoading(false);
      }
    }

    loadBridges();
    const interval = setInterval(loadBridges, 2000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="p-6 text-center animate-fade-in-up" style={{ background: 'var(--bg-card)', border: '1px solid #dc2626', borderRadius: '12px' }}>
        <p className="text-sm font-bold" style={{ color: '#ff7b72' }}>⚠️ Connection Failed</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Unable to fetch bridge monitoring profiles: {error}</p>
      </div>
    );
  }

  if (loading && bridges.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
        {[1, 2, 3].map((id) => (
          <div key={id} className="p-5 min-h-[100px] flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading bridge monitoring profile #{id}…</span>
          </div>
        ))}
      </div>
    );
  }

  const isScrollable = bridges.length > 3;

  return (
    <div 
      className={`animate-fade-in-up ${
        isScrollable 
          ? 'flex flex-row overflow-x-auto pb-4 gap-6 scrollbar-thin' 
          : 'grid grid-cols-1 md:grid-cols-3 gap-6'
      }`} 
      id="bridge-overview"
    >
      {bridges.map((bridge) => {
        const isActive = bridge.id === activeBridgeId;
        const score = bridge.health_score;
        const grade = bridge.health_grade || '—';
        const status = bridge.status || 'Loading…';
        const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.F;

        return (
          <div
            key={bridge.id}
            onClick={() => onSelectBridge(bridge.id)}
            className={`p-5 cursor-pointer relative overflow-hidden transition-all duration-300 transform hover:scale-[1.02] ${
              isScrollable ? 'w-[320px] shrink-0' : ''
            }`}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: '12px',
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Profile #{bridge.id}
                </p>
                <h3 className="text-base font-bold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {bridge.name}
                </h3>
                {bridge.location && (
                  <p className="text-[11px] mt-1 tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    📍 {bridge.location}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border"
                  style={{
                    background: cfg.bg,
                    borderColor: cfg.border,
                    color: cfg.color,
                  }}
                >
                  {grade}
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between mt-5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: cfg.color }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: cfg.color }}
                >
                  {status}
                </span>
                {bridge.alert_count > 0 && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold ml-1 flex items-center gap-1 animate-pulse" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                    ⚠️ {bridge.alert_count} Active
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 text-right shrink-0">
                <div>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Health Score</p>
                  <p className="text-xl font-black font-mono tracking-tight" style={{ color: cfg.color }}>
                    {score !== null ? `${score.toFixed(1)}` : '—'}
                    <span className="text-[10px] font-medium ml-1" style={{ color: 'var(--text-secondary)' }}>/100</span>
                  </p>
                </div>
                <button
                  onClick={(e) => handleExportCard(e, bridge.id, bridge.name)}
                  disabled={!token || exportingIds[bridge.id]}
                  className="flex items-center gap-1 px-2 py-1 text-white text-xs rounded transition-colors disabled:opacity-50 hover:opacity-90 cursor-pointer"
                  style={{ background: 'var(--accent-blue-light)' }}
                >
                  {exportingIds[bridge.id] ? (
                    <span className="animate-spin text-[10px]">⟳</span>
                  ) : (
                    <span>⬇</span>
                  )}
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Active indicator dot */}
            {isActive && (
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-blue-light)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
