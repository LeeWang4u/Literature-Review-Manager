import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            // User data exists in localStorage, use it immediately
            setUser(currentUser);
          } else {
            // Token exists but no user data - fetch from API
            try {
              const profile = await authService.getProfile();
              setUser(profile);
              // Update localStorage with fresh user data
              localStorage.setItem('user', JSON.stringify(profile));
            } catch (fetchError) {
              // If profile fetch fails, just log it but don't logout
              // The token might still be valid, let the user try to use the app
              console.warn('Failed to fetch user profile on mount:', fetchError);
              // Don't call logout here - let API interceptor handle 401s
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Don't logout here - only clear state
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('🔐 AuthContext: Starting login...');
    const response = await authService.login({ email, password });
    console.log('✅ AuthContext: Login API successful, user:', response.user);
    setUser(response.user);
    console.log('✅ AuthContext: User state updated');
  };

  const register = async (data: { email: string; password: string; fullName: string }) => {
    // await authService.register(data);
    try {
      const response = await authService.register(data);
      console.log('✅ AuthContext: Registration response:', response);
      return response; // Trả về verifyToken và email
    } catch (error) {
      console.error('❌ AuthContext: Registration error:', error);
      throw error;
    }
    // After registration, auto-login
    // await login(data.email, data.password);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
