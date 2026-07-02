import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function TrafficPanel({ bridgeId = 1 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(false);
  const prevCrossingTimestampRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function fetchTraffic() {
      try {
        const res = await fetch(`${API_BASE}/api/traffic?bridge_id=${bridgeId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch traffic data: ${res.statusText}`);
        }
        const trafficData = await res.json();
        
        if (!active) return;
        
        setData(trafficData);
        setError("");
        setLoading(false);

        // Flash ticker glow when a new crossing event arrives
        const crossings = trafficData.recent_crossings || [];
        if (crossings.length > 0) {
          const currentTimestamp = crossings[0].timestamp;
          if (prevCrossingTimestampRef.current && prevCrossingTimestampRef.current !== currentTimestamp) {
            setFlash(true);
            setTimeout(() => setFlash(false), 1200);
          }
          prevCrossingTimestampRef.current = currentTimestamp;
        }
      } catch (err) {
        if (!active) return;
        console.error("[Traffic API Error]", err);
        setError("Telemetry connection offline");
        setLoading(false);
      }
    }

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [bridgeId]);

  if (loading && !data) {
    return (
      <div
        className="fade-slide-in"
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--text-secondary)',
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap');
        `}</style>
        <div style={{ display: "inline-block", width: "24px", height: "24px", border: "2px solid rgba(88,166,255,0.2)", borderTopColor: "#58a6ff", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "12px" }} />
        <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Loading Vehicle Telemetry...</p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className="fade-slide-in"
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--accent-red-light)',
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap');
        `}</style>
        <p style={{ fontSize: "24px", marginBottom: "8px" }}>⚠️</p>
        <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{error}</p>
      </div>
    );
  }

  const today = data?.today || {
    total_vehicles: 0,
    total_tonnage_estimate: 0,
    overload_events: 0,
    peak_hour: "00:00-00:00",
    fatigue_score: 0.0,
    fatigue_status: "LOW",
    vehicle_breakdown: {},
  };

  const recentCrossings = data?.recent_crossings || [];
  const latestCrossing = recentCrossings[0] || null;

  // Get fatigue color
  let fatigueColor = "#3fb950"; // LOW
  if (today.fatigue_status === "MODERATE") fatigueColor = "#e3b341";
  else if (today.fatigue_status === "HIGH" || today.fatigue_status === "CRITICAL") fatigueColor = "#ff7b72";

  // Recharts Hour bars data
  const currentHour = new Date().getHours();
  const chartData = (data?.hourly_counts || Array(24).fill(0)).map((count, index) => {
    const formattedHour = index < 10 ? `0${index}` : `${index}`;
    return {
      hour: formattedHour,
      count: count,
      fill: index === currentHour ? "#7dd3fc" : "#1f4e7a",
    };
  });

  // Vehicle Breakdown calculations
  const breakdownTypes = [
    { name: "Motorcycle", color: 'var(--accent-green-light)' },
    { name: "Car / SUV", color: 'var(--accent-blue-light)' },
    { name: "Bus", color: "#a371f7" },
    { name: "Light Truck", color: 'var(--accent-yellow-light)' },
    { name: "Heavy Truck", color: "#f0883e" },
    { name: "Overloaded Truck", color: 'var(--accent-red-light)' },
  ];

  const breakdownData = breakdownTypes.map((t) => {
    const count = today.vehicle_breakdown[t.name] || 0;
    const percentage = today.total_vehicles > 0 ? (count / today.total_vehicles) * 100 : 0;
    return {
      ...t,
      count,
      percentage,
    };
  });

  return (
    <div
      className="traffic-panel-container fade-slide-in"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: "12px",
        padding: "24px",
        color: 'var(--text-primary)',
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* Styles Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap');
        
        .traffic-panel-container {
          font-family: 'JetBrains Mono', monospace;
        }

        .fade-slide-in {
          animation: fadeSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-red {
          0%, 100% { border-color: #21262d; box-shadow: 0 0 0 0 rgba(255, 123, 114, 0); }
          50% { border-color: #ff7b72; box-shadow: 0 0 12px 2px rgba(255, 123, 114, 0.25); }
        }

        .pulse-active {
          animation: pulse-red 2s infinite ease-in-out;
          border-color: #ff7b72 !important;
        }

        @keyframes ticker-glow {
          0% { border-color: #21262d; box-shadow: 0 0 0 0 rgba(88, 166, 255, 0); }
          50% { border-color: #58a6ff; box-shadow: 0 0 16px 4px rgba(88, 166, 255, 0.2); }
          100% { border-color: #21262d; box-shadow: 0 0 0 0 rgba(88, 166, 255, 0); }
        }

        .ticker-flash {
          animation: ticker-glow 1.2s cubic-bezier(0.25, 0.8, 0.25, 1) both;
        }

        @keyframes progress-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; filter: brightness(1.2); }
        }

        .overload-bar-pulse {
          animation: progress-pulse 1.5s infinite ease-in-out;
        }

        .section-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8b949e;
          font-weight: 700;
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: "14px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>🚦</span>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff", letterSpacing: "0.05em" }}>
            VEHICLE LOAD MONITOR
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3fb950", display: "inline-block" }} />
          <span className="section-label" style={{ color: 'var(--accent-green-light)' }}>Live System Active</span>
        </div>
      </div>

      {/* Section 1 — 4 stat cards in a row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {/* Stat 1: Total Vehicles */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span className="section-label" style={{ color: 'var(--accent-blue-light)' }}>Total Vehicles</span>
          <span style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff" }}>
            {today.total_vehicles}
          </span>
        </div>

        {/* Stat 2: Total Tonnage */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span className="section-label" style={{ color: 'var(--accent-yellow-light)' }}>Total Tonnage (t)</span>
          <span style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff" }}>
            {today.total_tonnage_estimate ? today.total_tonnage_estimate.toFixed(1) : today.total_tonnage ? today.total_tonnage.toFixed(1) : "0.0"}
          </span>
        </div>

        {/* Stat 3: Overload Events */}
        <div
          className={today.overload_events > 0 ? "pulse-active" : ""}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            transition: "all 0.3s ease",
          }}
        >
          <span className="section-label" style={{ color: 'var(--accent-red-light)' }}>Overload Events</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff" }}>
              {today.overload_events}
            </span>
            {today.overload_events > 0 && (
              <span style={{ fontSize: "11px", color: 'var(--accent-red-light)', fontWeight: "700" }}>⚠ DANGER</span>
            )}
          </div>
        </div>

        {/* Stat 4: Fatigue Score */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span className="section-label" style={{ color: fatigueColor }}>Fatigue Score</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff" }}>
              {today.fatigue_score ? today.fatigue_score.toFixed(1) : "0.0"}
            </span>
            <span style={{ fontSize: "10px", fontWeight: "700", color: fatigueColor }}>
              [{today.fatigue_status}]
            </span>
          </div>
        </div>
      </div>

      {/* Section 2 — Live Crossing Ticker */}
      <div
        className={flash ? "ticker-flash" : ""}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: "8px",
          padding: "18px",
          marginBottom: "24px",
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <span className="section-label" style={{ color: 'var(--accent-blue-light)' }}>📡 Real-Time Crossing Event Ticker</span>
          {latestCrossing && (
            <span style={{ fontSize: "10px", color: 'var(--text-secondary)' }}>
              Timestamp: {latestCrossing.timestamp}
            </span>
          )}
        </div>

        {latestCrossing ? (
          <div>
            {/* Flashing Overload Banner */}
            {latestCrossing.is_overloaded && (
              <div
                style={{
                  background: "rgba(255, 123, 114, 0.1)",
                  border: "1px solid #ff7b72",
                  color: 'var(--accent-red-light)',
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  textAlign: "center",
                  marginBottom: "14px",
                  letterSpacing: "0.1em",
                }}
              >
                ⚠ WARNING: STRUCTURAL OVERLOAD DETECTED
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "16px",
                alignItems: "center",
              }}
            >
              {/* Type Card */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "28px" }}>{latestCrossing.icon}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span className="section-label" style={{ fontSize: "9px" }}>Type</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                    {latestCrossing.vehicle_type}
                  </span>
                </div>
              </div>

              {/* Weight */}
              <div>
                <span className="section-label" style={{ fontSize: "9px" }}>Weight</span>
                <p style={{ fontSize: "14px", fontWeight: "700", color: latestCrossing.is_overloaded ? "#ff7b72" : "#ffffff" }}>
                  {latestCrossing.weight_estimate_tonnes ? latestCrossing.weight_estimate_tonnes.toFixed(1) : latestCrossing.load_estimate_tonnes ? latestCrossing.load_estimate_tonnes.toFixed(1) : "0.0"} t
                </p>
              </div>

              {/* Vibration */}
              <div>
                <span className="section-label" style={{ fontSize: "9px" }}>Peak Vibration</span>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                  {latestCrossing.peak_vibration ? latestCrossing.peak_vibration.toFixed(2) : "0.00"} g
                </p>
              </div>

              {/* Duration */}
              <div>
                <span className="section-label" style={{ fontSize: "9px" }}>Duration</span>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                  {latestCrossing.duration_sec ? latestCrossing.duration_sec.toFixed(1) : "0.0"} s
                </p>
              </div>

              {/* Strain Delta */}
              <div>
                <span className="section-label" style={{ fontSize: "9px" }}>Strain Delta</span>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                  {latestCrossing.strain_delta ? latestCrossing.strain_delta.toFixed(1) : "0.0"} MPa
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "11px", color: 'var(--text-secondary)', textAlign: "center", py: "10px" }}>
            Waiting for first vehicle crossing telemetry...
          </p>
        )}
      </div>

      {/* Sections 3 and 4 side by side in a 2-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Section 3 — Hourly Bar Chart */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span className="section-label" style={{ color: 'var(--accent-blue-light)', marginBottom: "16px" }}>
            📈 Commute Counts (24-Hour Distribution)
          </span>
          <div style={{ width: "100%", height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <XAxis
                  dataKey="hour"
                  stroke="#8b949e"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace" }}
                />
                <YAxis
                  stroke="#8b949e"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace" }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: "8px",
                    color: 'var(--text-primary)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-secondary)', fontWeight: "bold" }}
                  cursor={{ fill: "rgba(88,166,255,0.03)" }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", background: "#1f4e7a", borderRadius: "1px" }} />
              <span style={{ fontSize: "9px", color: 'var(--text-secondary)' }}>Standard hour</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", background: "#7dd3fc", borderRadius: "1px" }} />
              <span style={{ fontSize: "9px", color: "#7dd3fc", fontWeight: "bold" }}>Current hour</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "9px", color: 'var(--text-secondary)' }}>Peak: <span style={{ color: "#ffffff", fontWeight: "bold" }}>{today.peak_hour}</span></span>
            </div>
          </div>
        </div>

        {/* Section 4 — Vehicle Type Breakdown */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span className="section-label" style={{ color: 'var(--accent-blue-light)', marginBottom: "16px" }}>
            📊 Classification Share & Distribution
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "space-between", height: "100%" }}>
            {breakdownData.map((item) => (
              <div key={item.name} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "#ffffff" }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: "10px", color: 'var(--text-secondary)' }}>
                    {item.count} <span style={{ color: 'var(--text-muted)' }}>·</span> {item.percentage.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#21262d",
                    borderRadius: "4px",
                    overflow: "hidden",
                    marginTop: "6px",
                  }}
                >
                  <div
                    className={item.name === "Overloaded Truck" && item.count > 0 ? "overload-bar-pulse" : ""}
                    style={{
                      width: `${item.percentage}%`,
                      height: "100%",
                      background: item.color,
                      borderRadius: "4px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 5 — Recent Crossings Table */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span className="section-label" style={{ color: 'var(--accent-blue-light)', marginBottom: "14px" }}>
          📋 Historical Telemetry Archive (Newest First)
        </span>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="section-label" style={{ padding: "10px 8px" }}>Time</th>
                <th className="section-label" style={{ padding: "10px 8px" }}>Classification</th>
                <th className="section-label" style={{ padding: "10px 8px" }}>Weight (t)</th>
                <th className="section-label" style={{ padding: "10px 8px" }}>Peak Vib</th>
                <th className="section-label" style={{ padding: "10px 8px" }}>Duration</th>
                <th className="section-label" style={{ padding: "10px 8px", textAlign: "center" }}>Alert</th>
              </tr>
            </thead>
            <tbody>
              {recentCrossings.slice(0, 10).map((row, idx) => {
                const isOverloaded = row.is_overloaded || row.overloaded;
                const weight = row.weight_estimate_tonnes || row.load_estimate_tonnes || 0;
                const peakVib = row.peak_vibration || 0;
                const duration = row.duration_sec || 0;
                const alertLevel = row.alert_level || (isOverloaded ? "CRITICAL" : "NORMAL");

                // Badge styling
                let badgeBg = "rgba(63,185,80,0.1)";
                let badgeBorder = "1px solid rgba(63,185,80,0.3)";
                let badgeColor = "#3fb950";

                if (alertLevel === "CRITICAL") {
                  badgeBg = "rgba(255,123,114,0.1)";
                  badgeBorder = "1px solid rgba(255,123,114,0.3)";
                  badgeColor = "#ff7b72";
                } else if (alertLevel === "WARNING") {
                  badgeBg = "rgba(227,179,65,0.1)";
                  badgeBorder = "1px solid rgba(227,179,65,0.3)";
                  badgeColor = "#e3b341";
                } else if (alertLevel === "WATCH") {
                  badgeBg = "rgba(88,166,255,0.1)";
                  badgeBorder = "1px solid rgba(88,166,255,0.3)";
                  badgeColor = "#58a6ff";
                }

                return (
                  <tr
                    key={`${row.timestamp}-${idx}`}
                    style={{
                      borderBottom: "1px solid #161b22",
                      background: isOverloaded ? "rgba(255,123,114,0.04)" : "transparent",
                      transition: "background-color 0.2s",
                    }}
                  >
                    {/* Time */}
                    <td style={{ padding: "10px 8px", fontSize: "11px", color: 'var(--text-secondary)' }}>
                      {row.timestamp ? row.timestamp.split(" ")[1] || row.timestamp : "00:00:00"}
                    </td>

                    {/* Icon + Type */}
                    <td style={{ padding: "10px 8px", fontSize: "11px", color: "#ffffff", fontWeight: "600" }}>
                      <span style={{ marginRight: "6px", fontSize: "13px" }}>{row.icon}</span>
                      {row.vehicle_type}
                    </td>

                    {/* Weight */}
                    <td style={{ padding: "10px 8px", fontSize: "11px", color: isOverloaded ? "#ff7b72" : "#c9d1d9" }}>
                      {weight.toFixed(1)} t
                    </td>

                    {/* Vibration */}
                    <td style={{ padding: "10px 8px", fontSize: "11px", color: 'var(--text-primary)' }}>
                      {peakVib.toFixed(2)} g
                    </td>

                    {/* Duration */}
                    <td style={{ padding: "10px 8px", fontSize: "11px", color: 'var(--text-primary)' }}>
                      {duration.toFixed(1)} s
                    </td>

                    {/* Alert Badge */}
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <span
                        style={{
                          background: badgeBg,
                          border: badgeBorder,
                          color: badgeColor,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "9px",
                          fontWeight: "bold",
                          letterSpacing: "0.05em",
                          display: "inline-block",
                          minWidth: "75px",
                        }}
                      >
                        {alertLevel}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {recentCrossings.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "20px 8px", fontSize: "11px", color: 'var(--text-secondary)', textAlign: "center" }}>
                    No vehicle crossing history recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
