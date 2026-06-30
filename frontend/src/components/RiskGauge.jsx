export default function RiskGauge({ riskScore = 0 }) {
  const pct = Math.round(riskScore * 100);

  // Color based on risk level
  let color, label;
  if (pct < 40) {
    color = '#16a34a';
    label = 'LOW RISK';
  } else if (pct <= 70) {
    color = '#d97706';
    label = 'MODERATE';
  } else {
    color = '#dc2626';
    label = 'HIGH RISK';
  }

  // Semicircle arc math
  const radius = 80;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="p-6" id="risk-gauge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
      <p className="section-title">🎯 Failure Risk Score</p>
      <div className="flex flex-col items-center">
        <svg className="w-[160px] sm:w-[200px] h-[92px] sm:h-[115px]" viewBox="0 0 200 115">
          {/* Background arc */}
          <path
            d="M 10 100 A 80 80 0 0 1 190 100"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d="M 10 100 A 80 80 0 0 1 190 100"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="gauge-arc"
          />
          {/* Center value */}
          <text
            x="100"
            y="80"
            textAnchor="middle"
            className="text-3xl font-extrabold"
            fill="var(--text-primary)"
            style={{ fontSize: '36px', fontFamily: 'Inter, sans-serif', fontWeight: 800 }}
          >
            {pct}%
          </text>
          <text
            x="100"
            y="100"
            textAnchor="middle"
            fill={color}
            style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em' }}
          >
            {label}
          </text>
        </svg>

        {/* Scale labels */}
        <div className="flex justify-between w-[200px] mt-1 px-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>0%</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>50%</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>100%</span>
        </div>

        {/* Risk level indicators */}
        <div className="flex gap-4 mt-4">
          {[
            { label: 'Low', color: 'var(--accent-green-light)', range: '< 40%' },
            { label: 'Moderate', color: 'var(--accent-yellow-light)', range: '40-70%' },
            { label: 'High', color: 'var(--accent-red-light)', range: '> 70%' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {item.label} ({item.range})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
