import { useAuth } from '../context/AuthContext';
import { 
  LayoutGrid, 
  MapPin, 
  Cpu, 
  Camera, 
  Wrench, 
  Brain, 
  Shield,
  Bot,
  Clock
} from 'lucide-react';

export default function NavBar({ currentPage, setCurrentPage, isChatOpen, setIsChatOpen, unreadAlertsCount = 0 }) {
  const { isAdmin, isEngineer } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Live dashboard', icon: LayoutGrid },
    { id: 'network', label: 'India network', icon: MapPin },
    { id: 'aiops', label: 'AI Intelligence Center', icon: Brain },
  ];

  if ((isEngineer && isEngineer()) || (isAdmin && isAdmin())) {
    menuItems.push({ id: 'ai-inspector', label: 'AI Inspector', icon: Bot });
    menuItems.push({ id: 'predictive', label: 'Predictive', icon: Clock });
  }

  if (isEngineer && isEngineer()) {
    menuItems.push({ id: 'crack-detection', label: 'Crack detection', icon: Camera });
    menuItems.push({ id: 'maintenance', label: 'Maintenance', icon: Wrench });
  }

  if (isAdmin && isAdmin()) {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
  }

  return (
    <div 
      style={{ 
        width: '72px', 
        backgroundColor: '#0c1524', // Dark side navbar background
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        paddingTop: '24px', 
        paddingBottom: '24px', 
        height: '100vh', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        borderRight: '1px solid #1e293b',
        boxSizing: 'border-box',
        flexShrink: 0
      }}
    >
      {/* Brand Bridge Logo at the top */}
      <div 
        style={{ 
          width: '44px', 
          height: '44px', 
          borderRadius: '10px', 
          backgroundColor: '#2563eb', // Blue square background
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: '28px', 
          boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
          cursor: 'pointer'
        }}
        onClick={() => setCurrentPage('dashboard')}
        title="Bridge Health Monitor logo"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18h16" />
          <path d="M4 18L8 8" />
          <path d="M20 18L16 8" />
          <path d="M8 8h8" />
        </svg>
      </div>

      {/* Nav Menu Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, width: '100%', alignItems: 'center' }}>
        {menuItems.map((item) => {
          const isActive = currentPage === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              title={item.label}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                color: isActive ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59,130,246,0.35)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = '#1e293b';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {IconComponent && <IconComponent size={20} />}
            </button>
          );
        })}
      </div>

      {/* Live Pulsing Dot at the bottom left */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        {/* Chat Assistant Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          title="Bridge Assistant"
          style={{
            position: 'relative',
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            border: 'none',
            background: isChatOpen ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(59,130,246,0.1)',
            color: isChatOpen ? '#ffffff' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isChatOpen ? '0 4px 12px rgba(59,130,246,0.35)' : 'none',
            border: '1px solid rgba(59,130,246,0.2)'
          }}
          onMouseEnter={(e) => {
            if (!isChatOpen) {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = '#1e293b';
            }
          }}
          onMouseLeave={(e) => {
            if (!isChatOpen) {
              e.currentTarget.style.color = '#3b82f6';
              e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)';
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {unreadAlertsCount > 0 && !isChatOpen && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '9px',
              fontWeight: 'bold',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0c1524'
            }}>
              {unreadAlertsCount}
            </span>
          )}
        </button>

        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
      </div>
    </div>
  );
}
