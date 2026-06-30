import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ currentPage = 'dashboard', activeBridgeId, activeBridgeName }) {
  const { user, logout, switchRoleDemo } = useAuth();
  const [time, setTime] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setShowRoles(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format Wed Jun 10 · 06:55 PM
  const formatted = time.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + ' · ' + time.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const initials = user?.avatar || user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const getPageTitle = (page) => {
    switch (page) {
      case 'dashboard': return 'Live dashboard';
      case 'network': return 'India network';
      case 'ai-inspector': return 'AI Inspector';
      case 'predictive': return 'Predictive Maintenance';
      case 'crack-detection': return 'AI Crack Detection';
      case 'maintenance': return 'Maintenance assignments';
      case 'aiops': return 'AI Intelligence Center';
      case 'admin': return 'Admin Panel';
      default: return 'Live dashboard';
    }
  };

  const getPageSubtitle = (page) => {
    switch (page) {
      case 'dashboard': return 'Real-time structural monitoring — India network';
      case 'network': return 'National structural health overview and mapping';
      case 'ai-inspector': return 'Multi-agent AI inspection and structural health validation';
      case 'predictive': return 'Degradation rate forecasting and survival analysis';
      case 'crack-detection': return 'Vision AI model analysis and crack width estimation';
      case 'maintenance': return 'Engineering dispatch plans and maintenance history';
      case 'aiops': return 'AIOps operations, federated learning, and model performance';
      case 'admin': return 'Security logs, demo role switching, and database config';
      default: return 'Real-time structural monitoring — India network';
    }
  };

  return (
    <header className="flex items-center justify-between px-8 py-6 z-40" style={{ background: '#f8fafc', borderBottom: 'none' }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#60a5fa', marginBottom: '6px' }}>
          Bridge Health Monitor
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white" style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#ffffff' }}>
          {getPageTitle(currentPage)}
        </h1>
        <p className="text-xs font-medium mt-1" style={{ margin: 0, color: '#94a3b8' }}>
          {getPageSubtitle(currentPage)}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Live status badge */}
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: '#e2fbe8', color: '#16a34a', border: '1px solid #bbf7d0' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          Live
        </span>

        {/* System Time */}
        <div className="bg-slate-100/80 text-slate-600 px-4 py-1.5 rounded-lg text-xs font-semibold">
          {formatted}
        </div>

        {/* User initials / dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <div 
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setShowRoles(false);
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#dbeafe', // Light blue background
                color: '#1d4ed8', // Blue text
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1.5px solid #bfdbfe',
                boxShadow: 'var(--shadow-sm)',
                userSelect: 'none'
              }}
              title={user.name}
            >
              {initials}
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 shadow-2xl z-50 py-2 animate-fade-in-up text-left text-xs font-medium bg-white text-slate-900"
              >
                {!showRoles ? (
                  <>
                    {/* User profile details header */}
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{user.email}</p>
                      <p className="text-[9px] uppercase tracking-wider font-bold mt-1.5 text-blue-600">{user.org}</p>
                    </div>

                    {/* Actions list */}
                    <div className="py-1">
                      <div 
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-[11px]"
                        onClick={() => alert(`Personnel Clearance Profile:\nName: ${user.name}\nEmail: ${user.email}\nOrganization: ${user.org}\nRole: ${user.role.toUpperCase()}`)}
                      >
                        <span>👤</span> Profile Details
                      </div>
                      <div 
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 text-[11px]"
                        onClick={() => setShowRoles(true)}
                      >
                        <div className="flex items-center gap-2">
                          <span>🔄</span> Switch Clearance Role
                        </div>
                        <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>▶</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />

                    <div className="py-1">
                      <button 
                        onClick={logout}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 cursor-pointer flex items-center gap-2 text-[11px] font-bold text-red-600"
                      >
                        <span>🚪</span> Log Out
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Role-switching sub-menu */}
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                      <span 
                        className="cursor-pointer text-slate-400 hover:text-slate-900"
                        onClick={() => setShowRoles(false)}
                      >
                        ◀
                      </span>
                      <p className="font-bold text-slate-900">Select Clearance Role</p>
                    </div>
                    
                    <div className="py-1">
                      {['Admin', 'Engineer', 'Viewer'].map((role) => {
                        const isCurrent = user.role.toLowerCase() === role.toLowerCase();
                        return (
                          <div 
                            key={role}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-[11px]"
                            onClick={() => {
                              switchRoleDemo(role.toLowerCase());
                              setShowRoles(false);
                              setDropdownOpen(false);
                            }}
                          >
                            <span className={isCurrent ? "font-bold text-slate-900" : ""}>{role}</span>
                            {isCurrent && <span className="text-green-600">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
