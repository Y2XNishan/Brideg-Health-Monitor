import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MAX_HISTORY_MESSAGES = 10;

const renderMarkdown = (text) => {
  if (!text) return '';

  const redBadge = '<span style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid #EF4444; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 6px; display: inline-block;">SEVERE/CRITICAL</span>';
  const yellowBadge = '<span style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid #F59E0B; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 6px; display: inline-block;">MODERATE</span>';
  const greenBadge = '<span style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid #10B981; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 6px; display: inline-block;">MINOR/LOW</span>';

  let formatted = text
    .replace(/(severity(?:\s+assessment)?(?:\s+is)?(?:\s+rated\s+as)?(?:\s+level)?:?\s*)(severe\/critical|severe|critical|moderate|minor\/low|minor|low)/gi, (match, p1, p2) => {
      const val = p2.toLowerCase();
      let badge = '';
      if (val.includes('severe') || val.includes('critical')) {
        badge = redBadge;
      } else if (val.includes('moderate')) {
        badge = yellowBadge;
      } else if (val.includes('minor') || val.includes('low')) {
        badge = greenBadge;
      }
      return `${p1}${p2} ${badge}`;
    })
    .replace(/(DAMAGE TYPE|SEVERITY|RECOMMENDATIONS|ESTIMATED WIDTH|IRC REFERENCE|IMMEDIATE ACTION|MONITORING):?/gi, (match) => {
      return `<div style="font-weight: bold; margin-top: 12px; margin-bottom: 4px; color: var(--color-text-primary);">${match.toUpperCase()}</div>`;
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^• (.*?)$/gm, '<li style="margin-left: 16px; list-style-type: disc; margin-bottom: 4px;">$1</li>')
    .replace(/^• /gm, '<li>')
    .replace(/^\d+\.\s*(.*?)$/gm, '<li style="margin-left: 16px; list-style-type: decimal; margin-bottom: 4px;">$1</li>')
    .replace(/^\d+\. /gm, '<li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return formatted;
};

export default function ChatPanel({ bridgeId = 1, bridgeName = 'Selected Bridge', isOpen: propIsOpen, setIsOpen: propSetIsOpen, onNewProactiveAlert, onClearProactiveAlerts }) {
  console.log('[ChatPanel] mounting...');
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : localIsOpen;
  const setIsOpen = propSetIsOpen !== undefined ? propSetIsOpen : setLocalIsOpen;

  const { user } = useAuth();
  const [alertedBridges, setAlertedBridges] = useState(new Set());
  const [pendingAction, setPendingAction] = useState(null); // stores { bridge_id, bridge_name }

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [liveInfo, setLiveInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Vision states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/chat/model-info`)
      .then((response) => response.json())
      .then((data) => setModelInfo(data))
      .catch(() => setModelInfo(null));
  }, []);

  useEffect(() => {
    let active = true;
    async function loadLive() {
      try {
        const res = await fetch(`${API_BASE}/api/live?bridge_id=${bridgeId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('bridgeiq_token')}`
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setLiveInfo(data);
        }
      } catch (err) {
        console.error('[ChatPanel live poller error]', err);
      }
    }
    loadLive();
    const id = setInterval(loadLive, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [bridgeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && typeof onClearProactiveAlerts === 'function') {
      onClearProactiveAlerts();
    }
  }, [isOpen, onClearProactiveAlerts]);

  // Proactive Alerts Polling
  useEffect(() => {
    async function checkProactiveAlerts() {
      const token = localStorage.getItem('bridgeiq_token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/chat/critical-alerts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        const criticalBridges = data.critical_bridges || [];

        // Find the first critical bridge that hasn't been alerted yet
        const nextAlertBridge = criticalBridges.find(b => !alertedBridges.has(b.bridge_id));

        if (nextAlertBridge) {
          // Add to alerted set
          setAlertedBridges(prev => {
            const next = new Set(prev);
            next.add(nextAlertBridge.bridge_id);
            return next;
          });

          // Inject AI proactive message
          const userName = user?.name || 'Engineer';
          const healthVal = (nextAlertBridge.health_score !== null && nextAlertBridge.health_score !== undefined) ? Number(nextAlertBridge.health_score).toFixed(1) : '0.0';
          const vibrationVal = (nextAlertBridge.vibration !== null && nextAlertBridge.vibration !== undefined) ? nextAlertBridge.vibration : '0';
          const alertMessage = {
            role: 'assistant',
            isProactive: true,
            content: `⚠️ ${userName}, ${nextAlertBridge.bridge_name} has crossed critical threshold. Health: ${healthVal}/100, Vibration: ${vibrationVal}g.\n\nWant me to automatically:\n• Run full AI inspection\n• Assign nearest available crew\n• Send Telegram alert`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages(prev => [...prev, alertMessage].slice(-MAX_HISTORY_MESSAGES));

          // Set as pending action
          setPendingAction({
            bridge_id: nextAlertBridge.bridge_id,
            bridge_name: nextAlertBridge.bridge_name
          });

          // Increment unread count in parent if chat is closed
          if (!isOpen && typeof onNewProactiveAlert === 'function') {
            onNewProactiveAlert();
          }
        }
      } catch (err) {
        console.error('[ChatPanel proactive alerts error]', err);
      }
    }

    checkProactiveAlerts();
    const intervalId = setInterval(checkProactiveAlerts, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [alertedBridges, isOpen, user, onNewProactiveAlert]);

  // Reset alertedBridges on unmount
  useEffect(() => {
    return () => {
      setAlertedBridges(new Set());
    };
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleAlertResponse = async (choice) => {
    if (!pendingAction) return;
    const token = localStorage.getItem('bridgeiq_token');
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bridge_id = pendingAction.bridge_id;
    const bridge_name = pendingAction.bridge_name;

    if (choice === 'yes') {
      // Append user confirmation message
      const userMsg = {
        role: 'user',
        content: 'Proceeding with inspection, crew assignment and Telegram alert...',
        timestamp: timestampStr
      };
      setMessages((prev) => [...prev, userMsg].slice(-MAX_HISTORY_MESSAGES));
      setPendingAction(null);
      setIsLoading(true);

      // Show "Running autonomous actions..."
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚙️ Running autonomous actions...',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ].slice(-MAX_HISTORY_MESSAGES));

      // Step 1: AI Inspection
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '🔍 Step 1/3: Running AI inspection...',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ].slice(-MAX_HISTORY_MESSAGES));
      }, 1000);

      // Step 2: Assign Crew
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '👷 Step 2/3: Assigning nearest crew...',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ].slice(-MAX_HISTORY_MESSAGES));
      }, 2000);

      // Step 3: Send Telegram Alert
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '📱 Step 3/3: Sending Telegram alert...',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ].slice(-MAX_HISTORY_MESSAGES));
      }, 3000);

      // Make API Call
      const startTime = Date.now();
      let apiSummary = null;
      let apiError = null;

      try {
        const response = await fetch(`${API_BASE}/api/chat/autonomous-action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            bridge_id: bridge_id,
            bridge_name: bridge_name,
            confirmed: true
          })
        });

        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        apiSummary = data.summary;
      } catch (error) {
        apiError = error.message;
      }

      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 4000 - elapsed);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: apiSummary || (apiError ? `❌ Error running autonomous actions: ${apiError}` : `✅ All actions completed for ${bridge_name}.`),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ].slice(-MAX_HISTORY_MESSAGES));
        setIsLoading(false);
      }, remainingDelay);

    } else {
      // User said no / Dismissed
      setPendingAction(null);
      // Append user message "Alert dismissed."
      const userMsg = {
        role: 'user',
        content: 'Alert dismissed.',
        timestamp: timestampStr
      };
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          role: 'assistant',
          content: "Understood. Monitoring continues. You can manually inspect from AI Inspector tab.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ].slice(-MAX_HISTORY_MESSAGES));
    }
  };

  const conversationHistory = messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content }));

  async function sendMessage() {
    const userMessage = inputValue.trim();
    if (!userMessage && !selectedImage) return;
    if (isLoading) return;

    const token = localStorage.getItem('bridgeiq_token');
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to chat history
    const userMsg = { 
      role: 'user', 
      content: userMessage || 'Analyze this image',
      image: imagePreview,
      timestamp: timestampStr
    };

    setMessages((prev) => [...prev, userMsg].slice(-MAX_HISTORY_MESSAGES));
    setInputValue('');
    setIsLoading(true);

    const isYes = /^(yes|yeah|haan|kar do|proceed|confirm|ok|okay)$/i.test(userMessage.trim());
    const isNo = /^(no|nahi|nope|cancel|dismiss)$/i.test(userMessage.trim());

    if (pendingAction && (isYes || isNo)) {
      if (isYes) {
        const bridge_id = pendingAction.bridge_id;
        const bridge_name = pendingAction.bridge_name;
        setPendingAction(null);

        // Show "Running autonomous actions..."
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '⚙️ Running autonomous actions...',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ].slice(-MAX_HISTORY_MESSAGES));

        // Step 1: AI Inspection
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: '🔍 Step 1/3: Running AI inspection...',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ].slice(-MAX_HISTORY_MESSAGES));
        }, 1000);

        // Step 2: Assign Crew
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: '👷 Step 2/3: Assigning nearest crew...',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ].slice(-MAX_HISTORY_MESSAGES));
        }, 2000);

        // Step 3: Send Telegram Alert
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: '📱 Step 3/3: Sending Telegram alert...',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ].slice(-MAX_HISTORY_MESSAGES));
        }, 3000);

        // Make API Call
        const startTime = Date.now();
        let apiSummary = null;
        let apiError = null;

        try {
          const response = await fetch(`${API_BASE}/api/chat/autonomous-action`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              bridge_id: bridge_id,
              bridge_name: bridge_name,
              confirmed: true
            })
          });

          if (!response.ok) throw new Error(`API returned ${response.status}`);
          const data = await response.json();
          apiSummary = data.summary;
        } catch (error) {
          apiError = error.message;
        }

        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, 4000 - elapsed);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: apiSummary || (apiError ? `❌ Error running autonomous actions: ${apiError}` : `✅ All actions completed for ${bridge_name}.`),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ].slice(-MAX_HISTORY_MESSAGES));
          setIsLoading(false);
        }, remainingDelay);

      } else {
        // User said no
        setPendingAction(null);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Understood. Monitoring continues. You can manually inspect from AI Inspector tab.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ].slice(-MAX_HISTORY_MESSAGES));
        setIsLoading(false);
      }
      return;
    }

    try {
      let reply;

      if (selectedImage) {
        // Vision API call
        const formData = new FormData();
        formData.append('bridge_id', bridgeId);
        formData.append('message', userMessage || 'Analyze this bridge image and identify any structural issues');
        formData.append('image', selectedImage);

        const response = await fetch(`${API_BASE}/api/chat/vision`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}` 
          },
          body: formData
        });

        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        reply = data.reply;

        // Clear image after sending
        setSelectedImage(null);
        setImagePreview(null);
      } else {
        // Regular text chat
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            bridge_id: bridgeId,
            message: userMessage,
            history: conversationHistory,
          }),
        });

        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        reply = data.reply;
      }

      setMessages((prev) =>
        [...prev, { 
          role: 'assistant', 
          content: reply || 'No reply.', 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }].slice(-MAX_HISTORY_MESSAGES)
      );
    } catch (error) {
      setMessages((prev) =>
        [...prev, { 
          role: 'assistant', 
          content: `Error: ${error.message}`, 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }].slice(-MAX_HISTORY_MESSAGES)
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const healthScore = liveInfo?.health_score !== undefined ? liveInfo.health_score.toFixed(1) : '—';
  const rawHealth = liveInfo?.health_score;
  const alertLevel = rawHealth !== undefined && rawHealth !== null
    ? (rawHealth >= 60 ? 'HEALTHY' : (rawHealth >= 40 ? 'MONITOR' : 'CRITICAL'))
    : 'HEALTHY';

  return (
    <>
      <style>{`
        .typing-bubble {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          background: var(--color-background-secondary);
          border: 0.5px solid var(--color-border-tertiary);
          border-radius: 0 8px 8px 8px;
          padding: 10px 14px;
        }
        .typing-bubble span {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3b82f6;
          margin: 0 2px;
          animation: bounce 1.2s infinite;
        }
        .typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
        .typing-bubble span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes pulse-live {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
          }
        }
        .animate-pulse-live {
          animation: pulse-live 2s infinite;
        }
      `}</style>

      <div style={{
        '--color-background-primary': 'var(--bg-primary)',
        '--color-background-secondary': 'var(--bg-secondary)',
        '--color-border-tertiary': 'var(--border-color)',
        '--color-text-primary': 'var(--text-primary)',
        '--color-text-secondary': 'var(--text-secondary)'
      }}>
        {/* open panel */}
        {isOpen && (
          <div style={{
            position: "fixed",
            top: "60px",
            left: "72px",
            width: "420px",
            height: "calc(100vh - 60px)",
            background: "var(--bg-card, #ffffff)",
            border: "none",
            borderRight: "1px solid var(--border-color, #e2e8f0)",
            boxShadow: "8px 0 30px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            zIndex: 999,
            overflow: "hidden",
          }}>
            
            {/* HEADER */}
            <div style={{
              background: "linear-gradient(135deg, #3b82f6, #1e40af)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(59,130,246,0.2)",
                  border: "2px solid #3b82f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 10 10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <div>
                  <div style={{ color: "white", fontWeight: "600", fontSize: "14px" }}>Bridge Assistant</div>
                  <div style={{ color: "#94a3b8", fontSize: "11px" }}>{selectedImage ? 'LLaMA 4 Scout' : 'LLaMA 3B'} • Powered by BridgeIQ</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></div>
                <span style={{ color: "#10b981", fontSize: "11px" }}>Online</span>
                <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", marginLeft: "8px" }}>✕</button>
              </div>
            </div>

            {/* CONTEXT BAR */}
            <div style={{
              background: 'var(--color-background-secondary)',
              borderRadius: '6px',
              padding: '6px 10px',
              margin: '8px 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <i className="ti-map-pin" style={{ color: '#3b82f6', fontSize: '12px' }} />
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {bridgeName} · Health {healthScore} · {alertLevel}
              </span>
            </div>

            {/* MESSAGES AREA */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "var(--bg-secondary, #f8fafc)",
              color: "var(--text-primary, inherit)",
            }}>
              {messages.length === 0 ? (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: '11px',
                  lineHeight: '1.7',
                  padding: '0 20px'
                }}>
                  Ask about sensor readings, alerts, risk scores, or traffic data.
                </div>
              ) : (
                messages.map((m, i) => {
                  const msgTime = m.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  if (m.role === 'user') {
                    return (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }} key={i}>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '80%', alignItems: 'flex-end' }}>
                          <div style={{
                            background: '#3b82f6',
                            borderRadius: '8px 0 8px 8px',
                            padding: '7px 10px'
                          }}>
                            {m.image && (
                              <img
                                src={m.image}
                                alt="Uploaded"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '150px',
                                  borderRadius: '6px',
                                  marginBottom: '6px',
                                  display: 'block'
                                }}
                              />
                            )}
                            <div style={{ fontSize: '13px', color: 'white', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                               {m.content}
                            </div>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                            {msgTime}
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    const isProactive = m.isProactive;
                    const containerStyle = {
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '12px',
                      alignItems: 'flex-start'
                    };
                    const iconStyle = {
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: isProactive ? '#fee2e2' : '#dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    };
                    const bubbleStyle = isProactive ? {
                      background: '#fff7ed',
                      border: '1.5px solid #ffedd5',
                      borderLeft: '3px solid #ef4444',
                      borderRadius: '0 8px 8px 8px',
                      padding: '10px 12px',
                    } : {
                      background: 'var(--color-background-secondary)',
                      border: '0.5px solid var(--color-border-tertiary)',
                      borderRadius: '0 8px 8px 8px',
                      padding: '7px 10px'
                    };

                    return (
                      <div style={containerStyle} key={i}>
                        <div style={iconStyle}>
                          {isProactive ? (
                            <span style={{ fontSize: '12px' }}>⚠️</span>
                          ) : (
                            <i className="ti-robot" style={{ color: '#3b82f6', fontSize: '12px' }} />
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '80%' }}>
                          <div style={bubbleStyle}>
                            {m.image && (
                              <img
                                src={m.image}
                                alt="Uploaded"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '150px',
                                  borderRadius: '6px',
                                  marginBottom: '6px',
                                  display: 'block'
                                }}
                              />
                            )}
                            <div 
                              style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                            />
                            {m.isProactive && pendingAction && i === messages.length - 1 && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <button 
                                  onClick={() => handleAlertResponse('yes')}
                                  style={{ 
                                    background: '#ef4444', color: 'white', 
                                    border: 'none', borderRadius: '6px', 
                                    padding: '6px 16px', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: '500'
                                  }}
                                >
                                  Yes, proceed
                                </button>
                                <button 
                                  onClick={() => handleAlertResponse('no')}
                                  style={{ 
                                    background: 'transparent', color: '#6b7280',
                                    border: '1px solid #d1d5db', borderRadius: '6px',
                                    padding: '6px 16px', cursor: 'pointer',
                                    fontSize: '13px'
                                  }}
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                            {msgTime}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })
              )}

              {isLoading && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className="ti-robot" style={{ color: '#3b82f6', fontSize: '12px' }} />
                  </div>
                  <div className="typing-bubble">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT BAR */}
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border-color, #e2e8f0)",
              background: "var(--bg-card, #ffffff)",
              display: "flex",
              flexDirection: "column",
            }}>
              {/* Image Preview container */}
              {imagePreview && (
                <div style={{
                  position: 'relative',
                  marginBottom: '8px',
                  display: 'inline-block',
                  alignSelf: 'flex-start'
                }}>
                  <img
                    src={imagePreview}
                    alt="Selected"
                    style={{
                      maxHeight: '80px',
                      maxWidth: '120px',
                      borderRadius: '6px',
                      border: '1px solid rgba(59,130,246,0.3)'
                    }}
                  />
                  <button
                    onClick={() => { setSelectedImage(null); setImagePreview(null) }}
                    type="button"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >×</button>
                </div>
              )}

              {/* Photo upload row */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "var(--bg-secondary, #f1f5f9)",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "var(--text-secondary, #475569)",
                  fontWeight: "500",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Upload Photo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} disabled={isLoading} />
                </label>
                <span style={{ fontSize: "11px", color: "#94a3b8", alignSelf: "center" }}>
                  Upload bridge crack photo for AI analysis
                </span>
              </div>

              {/* Text input row */}
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about sensors, alerts, risk scores..."
                  rows={1}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    border: "1px solid var(--border-color, #e2e8f0)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    maxHeight: "80px",
                    background: "transparent",
                    color: "var(--text-primary, inherit)",
                  }}
                />
                <button
                  disabled={isLoading || (!inputValue.trim() && !selectedImage)}
                  onClick={sendMessage}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#1e40af",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    opacity: (isLoading || (!inputValue.trim() && !selectedImage)) ? 0.5 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
