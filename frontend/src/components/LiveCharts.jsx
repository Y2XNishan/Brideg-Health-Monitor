import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CHART_CONFIG = {
  water_level: { label: 'Water Level', unit: 'm',   color: 'var(--accent-blue-light)', gradientId: 'wl' },
  vibration:   { label: 'Vibration',   unit: 'g',   color: 'var(--accent-purple)', gradientId: 'vb' },
  strain:      { label: 'Strain',      unit: 'MPa', color: 'var(--accent-yellow-light)', gradientId: 'st' },
  crack_gap:   { label: 'Crack Gap',   unit: 'mm',  color: 'var(--accent-red-light)', gradientId: 'cg' },
};

function CustomTooltip({ active, payload, label, sensor }) {
  if (!active || !payload?.length) return null;
  const cfg = CHART_CONFIG[sensor];
  return (
    <div className="rounded-lg px-3 py-2 shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <p className="text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: cfg.color }}>
        {payload[0].value?.toFixed(4)} <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>{cfg.unit}</span>
      </p>
    </div>
  );
}

function SensorChart({ sensor, data }) {
  const cfg = CHART_CONFIG[sensor];

  console.log('chart data:', data);

  if (!data || data.length === 0) {
    return (
      <div style={{width:'100%', height:'180px',
        display:'flex', alignItems:'center',
        justifyContent:'center',
        color: 'var(--text-muted)', fontSize:'12px'}}>
        Waiting for sensor data...
      </div>
    );
  }

  return (
    <div className="p-4" id={`chart-${sensor}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {cfg.label}
        </h3>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {data.length} pts
        </span>
      </div>
      <div style={{ width: '100%', height: '180px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={cfg.gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={cfg.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={cfg.color} stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9 }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip sensor={sensor} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={`url(#${cfg.gradientId})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: cfg.color, stroke: '#050810', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function LiveCharts({ chartData }) {
  const sensors = ['water_level', 'vibration', 'strain', 'crack_gap'];

  return (
    <div>
      <p className="section-title">📊 Live Sensor Trends</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sensors.map((sensor) => (
          <SensorChart key={sensor} sensor={sensor} data={chartData[sensor] || []} />
        ))}
      </div>
    </div>
  );
}
