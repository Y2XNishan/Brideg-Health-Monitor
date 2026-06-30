const THRESHOLDS = {
  water_level: { warn: 4.0, crit: 5.5 },
  vibration:   { warn: 0.8, crit: 1.2 },
  strain:      { warn: 180, crit: 210 },
  crack_gap:   { warn: 0.4, crit: 0.65 },
};

const SENSOR_META = {
  water_level: { label: 'Water Level', unit: 'm',   icon: '💧', accent: '#3b82f6' },
  vibration:   { label: 'Vibration',   unit: 'g',   icon: '📳', accent: '#8b5cf6' },
  strain:      { label: 'Strain',      unit: 'MPa', icon: '⚡', accent: '#d97706' },
  crack_gap:   { label: 'Crack Gap',   unit: 'mm',  icon: '🔍', accent: '#dc2626' },
};

function getStatus(sensor, value) {
  if (value == null) return 'OFFLINE';
  const t = THRESHOLDS[sensor];
  if (value >= t.crit) return 'CRITICAL';
  if (value >= t.warn) return 'WARNING';
  return 'NORMAL';
}

function StatusBadge({ status }) {
  const cls =
    status === 'CRITICAL'
      ? 'badge badge-critical'
      : status === 'WARNING'
        ? 'badge badge-warning'
        : 'badge badge-normal';

  const dotColor =
    status === 'CRITICAL' ? '#dc2626' : status === 'WARNING' ? '#d97706' : '#16a34a';

  return (
    <span className={cls}>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      {status}
    </span>
  );
}

export default function MetricCards({ liveData }) {
  const sensors = ['water_level', 'vibration', 'strain', 'crack_gap'];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {sensors.map((sensor, i) => {
        const meta = SENSOR_META[sensor];
        const value = liveData?.[sensor];
        const status = getStatus(sensor, value);

        const barColor =
          status === 'CRITICAL' ? '#dc2626' : status === 'WARNING' ? '#d97706' : '#16a34a';

        return (
          <div
            key={sensor}
            className="p-4 sm:p-5 animate-fade-in-up relative overflow-hidden group"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', animationDelay: `${i * 80}ms` }}
            id={`metric-card-${sensor}`}
          >
            <div className="flex items-start justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {meta.label}
                </span>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="relative z-10">
              <span className="text-3xl font-extrabold tracking-tight" style={{ color: meta.accent }}>
                {value != null ? value.toFixed(2) : '—'}
              </span>
              <span className="text-sm font-medium ml-1.5" style={{ color: 'var(--text-secondary)' }}>
                {meta.unit}
              </span>
            </div>

            {/* Threshold bar */}
            <div className="mt-3 relative z-10">
              <div className="h-[2px] w-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                <div
                  className="h-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, (value / THRESHOLDS[sensor].crit) * 100)}%`,
                    background: barColor,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>0</span>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {THRESHOLDS[sensor].crit} {meta.unit}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
