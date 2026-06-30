import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('bridgeiq_token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('bridgeiq_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  // Synchronise state with localStorage on initial load or change
  useEffect(() => {
    if (token && !user) {
      // If we have a token but no user info, fetch it from backend
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then(data => {
        setUser(data);
        localStorage.setItem('bridgeiq_user', JSON.stringify(data));
      })
      .catch(err => {
        console.error('[auth-verify-error]', err);
        // Clear invalid session
        setToken(null);
        setUser(null);
        localStorage.removeItem('bridgeiq_token');
        localStorage.removeItem('bridgeiq_user');
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, user]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Authentication failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('bridgeiq_token', data.token);
    localStorage.setItem('bridgeiq_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('[auth-logout-error]', err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('bridgeiq_token');
      localStorage.removeItem('bridgeiq_user');
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isEngineer = () => {
    return user?.role === 'engineer' || user?.role === 'admin';
  };

  const hasPermission = (action) => {
    if (!user) return false;
    const role = user.role;
    if (role === 'admin') return true; // Admins have all permissions
    if (action === 'activate' || action === 'deactivate') {
      return role === 'engineer';
    }
    if (action === 'report') {
      return true; // Any authenticated user can export reports
    }
    return false;
  };

  const switchRoleDemo = (newRole) => {
    if (!user) return;
    const roleMapping = {
      admin: { name: 'Rajesh Kumar', email: 'admin@nhai.gov.in', org: 'NHAI HQ', avatar: 'RK' },
      engineer: { name: 'Priya Sharma', email: 'engineer@nhai.gov.in', org: 'NHAI Assam', avatar: 'PS' },
      viewer: { name: 'Amit Das', email: 'viewer@pwdassam.gov.in', org: 'PWD Assam', avatar: 'AD' }
    };
    const profile = roleMapping[newRole.toLowerCase()] || roleMapping.viewer;
    const updated = {
      ...user,
      role: newRole.toLowerCase(),
      name: profile.name,
      email: profile.email,
      org: profile.org,
      avatar: profile.avatar
    };
    setUser(updated);
    localStorage.setItem('bridgeiq_user', JSON.stringify(updated));
  };

  const value = {
    token,
    user,
    loading,
    login,
    logout,
    isAdmin,
    isEngineer,
    hasPermission,
    switchRoleDemo
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

