import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { fetchHistory } from '../api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <p className="text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: 'var(--accent-blue-light)' }}>
        {payload[0].value?.toFixed(2)} <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>m</span>
      </p>
    </div>
  );
}

export default function HistoryChart({ historyData: externalData, activeBridgeId = 1 }) {
  const [data, setData] = useState(externalData || []);
  const [loading, setLoading] = useState(!externalData || externalData.length === 0);
  const [error, setError] = useState(null);

  // Sync from parent prop if it arrives
  useEffect(() => {
    if (externalData && externalData.length > 0) {
      setData(externalData);
      setLoading(false);
      setError(null);
    }
  }, [externalData]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      console.log('[HistoryChart] Fetching history for bridge', activeBridgeId);
      const res = await fetch(`${API_BASE}/api/history?bridge_id=${activeBridgeId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      console.log('[HistoryChart] Received', json.length, 'rows');
      setData(json);
      setLoading(false);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.error('[HistoryChart] Request timed out after 10 seconds');
        setError('Request timed out — server did not respond in 10 seconds.');
      } else {
        console.error('[HistoryChart] Fetch failed:', err);
        setError(`Unable to load history data — ${err.message}`);
      }
      setLoading(false);
    }
  }, [activeBridgeId]);

  // Auto-fetch on mount and bridge switch if no external data
  useEffect(() => {
    if (!externalData || externalData.length === 0) {
      loadHistory();
    }
  }, [activeBridgeId, loadHistory, externalData]);

  // Loading state
  if (loading) {
    return (
      <div className="p-6" id="history-chart" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
        <p className="section-title">📈 Water Level History (3 Hours)</p>
        <div className="h-52 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent-blue-light)' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading history data…
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6" id="history-chart" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
        <p className="section-title">📈 Water Level History (3 Hours)</p>
        <div className="h-52 flex flex-col items-center justify-center gap-3">
          <p className="text-sm" style={{ color: 'var(--accent-red-light)' }}>{error}</p>
          <button
            onClick={loadHistory}
            className="px-4 py-1.5 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5 hover:opacity-90"
            style={{ background: '#58a6ff' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty data (no error, just nothing)
  if (!data || data.length === 0) {
    return (
      <div className="p-6" id="history-chart" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
        <p className="section-title">📈 Water Level History (3 Hours)</p>
        <div className="h-52 flex flex-col items-center justify-center gap-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No history data available</p>
          <button
            onClick={loadHistory}
            className="px-4 py-1.5 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5 hover:opacity-90"
            style={{ background: '#58a6ff' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const chartData = data.map((row) => ({
    time: row.timestamp?.split(' ')[1]?.slice(0, 5) || '',
    value: row.water_level,
  }));

  return (
    <div className="p-6" id="history-chart" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
      <div className="flex items-center justify-between mb-1">
        <p className="section-title !mb-0">📈 Water Level History (3 Hours)</p>
        <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}>
          {chartData.length} samples
        </span>
      </div>
      <div style={{ width: '100%', minHeight: '220px' }} className="mt-3">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9 }}
              interval={29}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={5.5}
              stroke="#dc2626"
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{
                value: 'CRITICAL 5.5m',
                position: 'right',
                fill: '#ff7b72',
                fontSize: 9,
                fontWeight: 600,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#histGrad)"
              dot={false}
              isAnimationActive={true}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
