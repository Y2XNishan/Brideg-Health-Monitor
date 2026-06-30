import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div 
      className="rounded-lg px-3 py-2 shadow-xl text-[10px]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <p className="font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {payload.map((item, idx) => (
        <p key={idx} style={{ color: item.color }} className="font-bold">
          {item.name}: {item.value?.toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

export default function MaintenancePanel({ bridgeId, activeBridgeId, healthHistory }) {
  const bid = bridgeId || activeBridgeId || 1;
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch maintenance prediction ──
  const fetchPrediction = () => {
    fetch(`/api/maintenance?bridge_id=${bid}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPrediction(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[maintenance-fetch-error]', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    fetchPrediction();
    const interval = setInterval(fetchPrediction, 30000);
    return () => clearInterval(interval);
  }, [bid]);

  // Urgency color configurations using theme tokens
  const urgencyColors = {
    IMMEDIATE: { text: '#ff7b72', bg: 'rgba(255,123,114,0.1)', border: '#ff7b72', color: 'var(--accent-red-light)' },
    SOON: { text: '#e3b341', bg: 'rgba(227,179,65,0.1)', border: '#e3b341', color: '#e3b341' },
    SCHEDULED: { text: '#58a6ff', bg: 'rgba(88,166,255,0.1)', border: '#58a6ff', color: '#58a6ff' },
    GOOD: { text: '#3fb950', bg: 'rgba(63,185,80,0.1)', border: '#3fb950', color: '#3fb950' },
  };

  const currentUrgency = prediction?.urgency || 'GOOD';
  const uCfg = urgencyColors[currentUrgency] || urgencyColors.GOOD;

  // ── Polyfit Linear Regression logic on the historical points ──
  const regressionData = useMemo(() => {
    if (!healthHistory || healthHistory.length < 2) return [];

    const n = healthHistory.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += healthHistory[i].health_score;
      sumXY += i * healthHistory[i].health_score;
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const chartData = [];

    // 1. Historical actuals + fitted trend line
    for (let i = 0; i < n; i++) {
      const timeLabel = healthHistory[i].timestamp?.split('T')[1]?.slice(0, 5) || 
                        healthHistory[i].timestamp?.split(' ')[1]?.slice(0, 5) || '';
      chartData.push({
        time: timeLabel,
        health: healthHistory[i].health_score,
        trend: Math.max(0, Math.min(100, slope * i + intercept)),
        projected: null,
      });
    }

    // 2. Projected points (next 30 hourly readings)
    if (n > 0) {
      // Connect first projected point to the last fit point
      const lastFit = chartData[n - 1].trend;
      chartData.push({
        time: 'Now',
        health: null,
        trend: null,
        projected: lastFit,
      });

      for (let i = 1; i <= 30; i++) {
        const idx = n - 1 + i;
        const projVal = Math.max(0, Math.min(100, slope * idx + intercept));
        chartData.push({
          time: `+${i}h`,
          health: null,
          trend: null,
          projected: projVal,
        });
      }
    }

    return chartData;
  }, [healthHistory]);

  if (loading && !prediction) {
    return (
      <div 
        className="animate-shimmer min-h-[160px] flex items-center justify-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Generating maintenance forecast...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="p-5 text-center"
        style={{ background: 'rgba(255,123,114,0.05)', border: '1px solid rgba(255,123,114,0.2)', borderRadius: '12px' }}
      >
        <p className="text-xs font-bold" style={{ color: 'var(--accent-red-light)' }}>⚠️ Maintenance Forecast Offline</p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div 
      className="p-5 flex flex-col lg:flex-row gap-6 items-stretch"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}
      id="maintenance-prediction"
    >
      {/* Visual Prediction Panel */}
      <div className="lg:w-[45%] flex flex-col justify-between space-y-4">
        <div>
          {/* Header Title with Calendar icon */}
          <div className="flex items-center gap-2 mb-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#58a6ff"
              strokeWidth="2.5"
              className="shrink-0"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-[10px] uppercase font-bold tracking-widest !mb-0" style={{ color: 'var(--text-secondary)' }}>
              Maintenance Forecast
            </p>
          </div>

          {/* Countdown & Urgency Badges */}
          <div className="space-y-2">
            <h2 className="text-2xl font-black font-sans leading-tight" style={{ color: uCfg.text }}>
              {prediction?.days_until_maintenance >= 365
                ? '365+ Days until maintenance'
                : `${prediction?.days_until_maintenance} Days until maintenance`}
            </h2>

            {/* Badges container */}
            <div className="flex flex-wrap gap-2 text-[8px] font-bold tracking-wider font-mono">
              <span 
                className="px-2 py-0.5 rounded uppercase"
                style={{ background: uCfg.bg, border: `1px solid ${uCfg.text}`, color: uCfg.text }}
              >
                Urgency: {currentUrgency}
              </span>
              <span 
                className="px-2 py-0.5 rounded"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                Confidence: {prediction?.confidence || 'MEDIUM'}
              </span>
              <span 
                className="px-2 py-0.5 rounded"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                Decline: {prediction?.decline_rate} pts/day
              </span>
            </div>

            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              Predicted maintenance deadline:{' '}
              <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{prediction?.predicted_maintenance_date}</strong>
            </p>
          </div>
        </div>

        {/* Highlighted Recommendation Box */}
        <div 
          className="p-3 rounded-lg text-[10px] leading-relaxed"
          style={{ background: uCfg.bg, border: '1px solid #21262d' }}
        >
          <p className="font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            🔧 RECOMMENDATION
          </p>
          <p className="font-sans" style={{ color: 'var(--text-secondary)' }}>{prediction?.recommendation}</p>
        </div>
      </div>

      {/* Regression Forecast Line Chart */}
      <div className="flex-1 min-h-[200px] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-secondary)' }}>
            📈 Projected Health Trend & Threshold Forecast (Next 30 Hours)
          </p>
          <span className="text-[8px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            y=40 maintenance trigger limit
          </span>
        </div>

        <div className="flex-1 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={regressionData} margin={{ top: 5, right: 10, bottom: -10, left: -25 }}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 8, fill: '#8b949e' }}
                tickLine={false}
                axisLine={false}
                interval={14}
              />
              <YAxis
                tick={{ fontSize: 8, fill: '#8b949e' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Red Maintenance Threshold trigger line at y=40 */}
              <ReferenceLine
                y={40}
                stroke="#ff7b72"
                strokeWidth={1.2}
                strokeDasharray="4 4"
                label={{
                  value: 'Threshold (40%)',
                  position: 'insideBottomLeft',
                  fill: '#ff7b72',
                  fontSize: 7,
                  fontWeight: 700,
                  offset: 5,
                }}
              />

              {/* Historical health scores */}
              <Line
                type="monotone"
                dataKey="health"
                name="Actual Health"
                stroke="#58a6ff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />

              {/* Projected trend forecast line */}
              <Line
                type="monotone"
                dataKey="projected"
                name="Projected Forecast"
                stroke={uCfg.color}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

