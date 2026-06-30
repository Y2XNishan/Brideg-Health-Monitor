const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/HP/Desktop/bridge-monitor/frontend/src';

const files = [
  path.join(srcDir, 'App.jsx'),
  // components
  path.join(srcDir, 'components/AlertPanel.jsx'),
  path.join(srcDir, 'components/BridgeOverview.jsx'),
  path.join(srcDir, 'components/ChatPanel.jsx'),
  path.join(srcDir, 'components/Header.jsx'),
  path.join(srcDir, 'components/HealthScore.jsx'),
  path.join(srcDir, 'components/HistoryChart.jsx'),
  path.join(srcDir, 'components/InstallPrompt.jsx'),
  path.join(srcDir, 'components/LiveCharts.jsx'),
  path.join(srcDir, 'components/MaintenancePanel.jsx'),
  path.join(srcDir, 'components/MetricCards.jsx'),
  path.join(srcDir, 'components/NavBar.jsx'),
  path.join(srcDir, 'components/RiskGauge.jsx'),
  path.join(srcDir, 'components/TrafficPanel.jsx'),
  // pages
  path.join(srcDir, 'pages/AdminPanel.jsx'),
  path.join(srcDir, 'pages/CrackDetection.jsx'),
  path.join(srcDir, 'pages/FederatedLearning.jsx'),
  path.join(srcDir, 'pages/IndiaNetwork.jsx'),
  path.join(srcDir, 'pages/Login.jsx'),
  path.join(srcDir, 'pages/Maintenance.jsx')
];

function backupFile(filePath) {
  const backupPath = filePath + '.bak2';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }
}

function convertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  console.log(`Processing ${path.basename(filePath)}...`);
  backupFile(filePath);
  let content = fs.readFileSync(filePath, 'utf8');

  // Simple string replacements for common style color hexes
  const replacements = [
    // Backgrounds
    { from: /background:\s*['"]#ffffff['"]/g, to: "background: 'var(--bg-card)'" },
    { from: /backgroundColor:\s*['"]#ffffff['"]/g, to: "backgroundColor: 'var(--bg-card)'" },
    { from: /background:\s*['"]#f8fafc['"]/g, to: "background: 'var(--bg-secondary)'" },
    { from: /backgroundColor:\s*['"]#f8fafc['"]/g, to: "backgroundColor: 'var(--bg-secondary)'" },
    { from: /background:\s*['"]#f1f5f9['"]/g, to: "background: 'var(--bg-tertiary)'" },
    { from: /backgroundColor:\s*['"]#f1f5f9['"]/g, to: "backgroundColor: 'var(--bg-tertiary)'" },
    
    // Tailwind classes
    { from: /bg-\[#ffffff\]/g, to: "bg-[var(--bg-card)]" },
    { from: /bg-\[#f8fafc\]/g, to: "bg-[var(--bg-secondary)]" },
    { from: /bg-\[#f1f5f9\]/g, to: "bg-[var(--bg-tertiary)]" },
    { from: /bg=\{"#ffffff"\}/g, to: "bg={'var(--bg-card)'}" },
    { from: /bg=\{"#f8fafc"\}/g, to: "bg={'var(--bg-secondary)'}" },
    { from: /bg=\{"#f1f5f9"\}/g, to: "bg={'var(--bg-tertiary)'}" },
    { from: /hover:bg-\[#f8fafc\]/g, to: "hover:bg-[var(--bg-secondary)]" },
    { from: /hover:bg-\[#f1f5f9\]/g, to: "hover:bg-[var(--bg-tertiary)]" },
    { from: /hover:bg-\[#21262d\]/g, to: "hover:bg-[var(--border-color)]" },

    // Borders
    { from: /border:\s*['"]1px\s+solid\s+#e2e8f0['"]/g, to: "border: '1px solid var(--border-subtle)'" },
    { from: /borderBottom:\s*['"]1px\s+solid\s+#e2e8f0['"]/g, to: "borderBottom: '1px solid var(--border-subtle)'" },
    { from: /borderTop:\s*['"]1px\s+solid\s+#e2e8f0['"]/g, to: "borderTop: '1px solid var(--border-subtle)'" },
    { from: /borderColor:\s*['"]#e2e8f0['"]/g, to: "borderColor: 'var(--border-subtle)'" },
    { from: /borderColor:\s*['"]#cbd5e1['"]/g, to: "borderColor: 'var(--border-hover)'" },
    { from: /border:\s*['"]1px\s+solid\s+#cbd5e1['"]/g, to: "border: '1px solid var(--border-hover)'" },
    { from: /border:\s*['"]1px\s+solid\s+#30363d['"]/g, to: "border: '1px solid var(--border-subtle)'" },
    { from: /borderColor:\s*['"]#21262d['"]/g, to: "borderColor: 'var(--border-subtle)'" },
    { from: /borderBottom:\s*['"]1px\s+solid\s+#21262d['"]/g, to: "borderBottom: '1px solid var(--border-subtle)'" },
    { from: /borderTop:\s*['"]1px\s+solid\s+#21262d['"]/g, to: "borderTop: '1px solid var(--border-subtle)'" },

    // Text colors
    { from: /color:\s*['"]#0f172a['"]/g, to: "color: 'var(--text-primary)'" },
    { from: /color:\s*['"]#475569['"]/g, to: "color: 'var(--text-secondary)'" },
    { from: /color:\s*['"]#94a3b8['"]/g, to: "color: 'var(--text-muted)'" },
    { from: /text-\[#0f172a\]/g, to: "text-[var(--text-primary)]" },
    { from: /text-\[#475569\]/g, to: "text-[var(--text-secondary)]" },
    { from: /text-\[#94a3b8\]/g, to: "text-[var(--text-muted)]" },
    { from: /color:\s*['"]#8b949e['"]/g, to: "color: 'var(--text-secondary)'" },
    { from: /color:\s*['"]#c9d1d9['"]/g, to: "color: 'var(--text-primary)'" },
    { from: /color:\s*['"]#484f58['"]/g, to: "color: 'var(--text-muted)'" },

    // Accents
    { from: /color:\s*['"]#3b82f6['"]/g, to: "color: 'var(--accent-blue-light)'" },
    { from: /color:\s*['"]#16a34a['"]/g, to: "color: 'var(--accent-green-light)'" },
    { from: /color:\s*['"]#d97706['"]/g, to: "color: 'var(--accent-yellow-light)'" },
    { from: /color:\s*['"]#dc2626['"]/g, to: "color: 'var(--accent-red-light)'" },
    { from: /color:\s*['"]#8b5cf6['"]/g, to: "color: 'var(--accent-purple)'" },
    
    { from: /background:\s*['"]#3b82f6['"]/g, to: "background: 'var(--accent-blue-light)'" },
    { from: /background:\s*['"]#16a34a['"]/g, to: "background: 'var(--accent-green-light)'" },
    { from: /background:\s*['"]#d97706['"]/g, to: "background: 'var(--accent-yellow-light)'" },
    { from: /background:\s*['"]#dc2626['"]/g, to: "background: 'var(--accent-red-light)'" },
    
    { from: /backgroundColor:\s*['"]#3b82f6['"]/g, to: "backgroundColor: 'var(--accent-blue-light)'" },
    { from: /backgroundColor:\s*['"]#16a34a['"]/g, to: "backgroundColor: 'var(--accent-green-light)'" },
    { from: /backgroundColor:\s*['"]#d97706['"]/g, to: "backgroundColor: 'var(--accent-yellow-light)'" },
    { from: /backgroundColor:\s*['"]#dc2626['"]/g, to: "backgroundColor: 'var(--accent-red-light)'" },

    // Chart strokes/fills that should adapt
    { from: /stroke:\s*['"]#cbd5e1['"]/g, to: "stroke: 'var(--border-hover)'" },
    { from: /stroke:\s*['"]#e2e8f0['"]/g, to: "stroke: 'var(--border-subtle)'" },
    { from: /stroke:\s*['"]#21262d['"]/g, to: "stroke: 'var(--border-subtle)'" },
    { from: /stroke="#e2e8f0"/g, to: 'stroke="var(--border-subtle)"' },
    { from: /stroke="#21262d"/g, to: 'stroke="var(--border-subtle)"' },
    { from: /fill="#0f172a"/g, to: 'fill="var(--text-primary)"' },
    { from: /fill="#cbd5e1"/g, to: 'fill="var(--border-hover)"' },

    // NavBar navigation variables
    { from: /background:\s*['"]#1e293b['"]/g, to: "background: 'var(--nav-bg)'" },
    { from: /borderBottom:\s*['"]1px\s+solid\s+#334155['"]/g, to: "borderBottom: '1px solid var(--border-subtle)'" }
  ];

  let modified = false;
  for (const r of replacements) {
    if (r.from.test(content)) {
      content = content.replace(r.from, r.to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Saved changes to ${path.basename(filePath)}`);
  } else {
    console.log(`No changes needed for ${path.basename(filePath)}`);
  }
}

// Convert all files
files.forEach(convertFile);
console.log('Theme conversion completed!');
