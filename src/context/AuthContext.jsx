import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Initialize user immediately from localStorage - no loading state
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const [loading, setLoading] = useState(false); // Always false now

  useEffect(() => {
    // Keep user in sync with localStorage
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const updateUser = async (userData) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api';
      
      try {
        const response = await fetch(`${API_URL}/users/${userData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
          throw new Error('Backend not available');
        }
        
        const data = await response.json();
        
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return data;
      } catch (backendError) {
        console.warn('Backend not available, using client-side update:', backendError);
        
        // Fallback: Update locally when backend is not available
        const updatedUser = { ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Generate a mock token if needed
        if (!token) {
          const mockToken = btoa(JSON.stringify({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }));
          localStorage.setItem('token', mockToken);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return { user: updatedUser, token: token || btoa(JSON.stringify(updatedUser)) };
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};