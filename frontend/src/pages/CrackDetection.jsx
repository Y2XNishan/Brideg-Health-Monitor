import { useState, useRef } from "react";
import { Upload, AlertTriangle, CheckCircle, XCircle, ZoomIn, FileText, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SEVERITY_CONFIG = {
  hairline: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "HAIRLINE", icon: "✅" },
  minor: { color: "#84cc16", bg: "rgba(132,204,22,0.1)", label: "MINOR", icon: "⚠️" },
  moderate: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "MODERATE", icon: "🔶" },
  severe: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "SEVERE", icon: "🚨" },
  critical: { color: "#7c3aed", bg: "rgba(124,58,237,0.1)", label: "CRITICAL", icon: "💀" },
};

export default function CrackDetection() {
  const { token } = useAuth();
  const authToken = token || localStorage.getItem("bridgeiq_token") || "";
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bridgeId, setBridgeId] = useState(1);
  const [bridgeName, setBridgeName] = useState("Brahmaputra Main Bridge");
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("bridge_id", bridgeId);
      formData.append("bridge_name", bridgeName);
      const res = await fetch(
        `/api/crack-detection?bridge_id=${bridgeId}&bridge_name=${encodeURIComponent(bridgeName)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.hairline : null;

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <Camera size={28} color="#3b82f6" />
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: 'var(--text-primary)', margin: 0 }}>
            AI Crack Detection
          </h1>
          <span style={{ background: "rgba(59,130,246,0.2)", color: 'var(--accent-blue-light)', padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
            VISION AI
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Upload a bridge photo — AI analyzes crack severity, estimates width, and recommends repair action per IRC:112-2011
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: "24px" }}>
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ color: 'var(--text-primary)', margin: "0 0 16px 0", fontSize: "14px" }}>Bridge Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: "12px", display: "block", marginBottom: "6px" }}>Bridge ID</label>
                <input
                  type="number"
                  value={bridgeId}
                  onChange={(e) => setBridgeId(Number(e.target.value))}
                  style={{ width: "100%", background: 'var(--bg-secondary, #f8fafc)', border: "1px solid var(--border-color, #cbd5e1)", borderRadius: "8px", padding: "8px 12px", color: 'var(--text-primary)', fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: "12px", display: "block", marginBottom: "6px" }}>Bridge Name</label>
                <input
                  type="text"
                  value={bridgeName}
                  onChange={(e) => setBridgeName(e.target.value)}
                  style={{ width: "100%", background: 'var(--bg-secondary, #f8fafc)', border: "1px solid var(--border-color, #cbd5e1)", borderRadius: "8px", padding: "8px 12px", color: 'var(--text-primary)', fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${preview ? "#3b82f6" : "var(--border-color, #cbd5e1)"}`,
              borderRadius: "12px",
              padding: "32px",
              textAlign: "center",
              cursor: "pointer",
              background: preview ? "rgba(59,130,246,0.05)" : "var(--bg-secondary, #f8fafc)",
              transition: "all 0.2s",
              marginBottom: "16px"
            }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileSelect(e.target.files[0])} />
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", objectFit: "contain" }} />
            ) : (
              <>
                <Upload size={40} color="#475569" style={{ marginBottom: "12px" }} />
                <p style={{ color: 'var(--text-secondary)', margin: "0 0 8px 0" }}>Drag & drop bridge photo here</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: "12px", margin: 0 }}>or click to browse • JPG, PNG, WEBP • Max 10MB</p>
              </>
            )}
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", color: "#ef4444", marginBottom: "16px", fontSize: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || loading}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "none",
              background: selectedFile && !loading ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "#e2e8f0",
              color: selectedFile && !loading ? "#fff" : "#94a3b8",
              fontSize: "15px", fontWeight: "600", cursor: selectedFile && !loading ? "pointer" : "not-allowed",
              transition: "all 0.2s"
            }}
          >
            {loading ? "🔍 Analyzing with AI Vision..." : "🔍 Analyze Crack"}
          </button>
        </div>

        {result && cfg && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}40`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <span style={{ fontSize: "32px" }}>{cfg.icon}</span>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: cfg.color }}>{cfg.label} CRACK</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: "13px" }}>Report ID: {result.report_id}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: "12px" }}>AI Confidence</div>
                  <div style={{ color: cfg.color, fontSize: "20px", fontWeight: "700" }}>{result.confidence_percent}%</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {[
                  { label: "Estimated Width", value: `~${result.estimated_width_mm} mm` },
                  { label: "Width Range", value: result.width_range },
                  { label: "Crack Type", value: result.crack_type },
                  { label: "Length", value: result.length_estimate },
                  { label: "Material", value: result.material },
                  { label: "Cracks Found", value: result.crack_count },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'var(--bg-tertiary)', borderRadius: "8px", padding: "12px" }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: "11px", marginBottom: "4px" }}>{item.label}</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: "14px", fontWeight: "600", textTransform: "capitalize" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: "12px", marginBottom: "8px" }}>📍 Location</div>
                <div style={{ color: 'var(--text-primary)', fontSize: "13px" }}>{result.location_description}</div>
              </div>

              <div style={{ background: `rgba(${cfg.color === '#ef4444' ? '239,68,68' : cfg.color === '#f59e0b' ? '245,158,11' : '34,197,94'},0.1)`, borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: "12px", marginBottom: "8px" }}>🔧 Recommended Action</div>
                <div style={{ color: 'var(--text-primary)', fontSize: "13px" }}>{result.recommended_action}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: "8px", padding: "12px" }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: "11px", marginBottom: "4px" }}>💰 Estimated Repair Cost</div>
                  <div style={{ color: "#10b981", fontSize: "13px", fontWeight: "600" }}>{result.estimated_repair_cost}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: "8px", padding: "12px" }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: "11px", marginBottom: "4px" }}>📋 IRC Reference</div>
                  <div style={{ color: 'var(--accent-blue-light)', fontSize: "12px" }}>{result.irc_reference}</div>
                </div>
              </div>
            </div>

            {result.annotated_image_base64 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: "12px", padding: "16px" }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: "13px", marginBottom: "12px" }}>🖼️ Annotated Image</div>
                <img
                  src={`data:image/jpeg;base64,${result.annotated_image_base64}`}
                  alt="Annotated"
                  style={{ width: "100%", borderRadius: "8px", objectFit: "contain" }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
