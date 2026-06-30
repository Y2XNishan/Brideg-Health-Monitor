export default function AlertPanel({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-6" id="alert-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
        <p className="section-title">🚨 Active Alerts</p>
        <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No active alerts</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>All systems operating normally</p>
        </div>
      </div>
    );
  }

  const criticalAndWarningCount = alerts.filter(
    (a) => a.alert_level === 'CRITICAL' || a.alert_level === 'WARNING'
  ).length;

  return (
    <div className="p-6" id="alert-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="section-title !mb-0">🚨 Active Alerts</p>
        <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}>
          {criticalAndWarningCount} alerts
        </span>
      </div>
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {alerts.map((alert, idx) => {
          const isCritical = alert.alert_level === 'CRITICAL';
          const isWarning = alert.alert_level === 'WARNING';

          const cardClass = isCritical 
            ? 'alert-card alert-card-critical' 
            : isWarning 
              ? 'alert-card alert-card-warning' 
              : 'alert-card';

          const badgeClass = isCritical 
            ? 'badge badge-critical' 
            : isWarning 
              ? 'badge badge-warning' 
              : 'badge badge-watch';

          const cardStyle = alert.alert_level === 'WATCH' 
            ? { borderLeftColor: '#3b82f6', animationDelay: `${idx * 40}ms` } 
            : { animationDelay: `${idx * 40}ms` };

          const barColor = isCritical ? '#dc2626' : isWarning ? '#d97706' : '#3b82f6';

          return (
            <div
              key={`${alert.timestamp}-${idx}`}
              className={`${cardClass} animate-fade-in-up`}
              style={cardStyle}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {alert.timestamp}
                </span>
                <span className={badgeClass}>{alert.alert_level}</span>
              </div>

              {/* Triggering sensor message */}
              {alert.message && (
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {alert.message}
                </p>
              )}

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Risk: {(alert.combined_score * 100).toFixed(1)}%
                </span>
                {/* Score bar */}
                <div className="flex-1 h-[2px] overflow-hidden" style={{ background: '#e2e8f0' }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, alert.combined_score * 100)}%`,
                      background: barColor,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
