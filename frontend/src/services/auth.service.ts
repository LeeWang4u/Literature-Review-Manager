import axiosInstance from './api';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  UpdateProfileData,
} from '@/types';

export const authService = {
  // Register new user
  register: async (data: RegisterData): Promise<User> => {
    const response = await axiosInstance.post<User>('/auth/register', data);
    return response.data;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
    
    // Save token and user to localStorage
    if (response.data.accessToken) {
      localStorage.setItem('access_token', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await axiosInstance.get<User>('/auth/profile');
    return response.data;
  },

  // Logout user
  logout: (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  // Get current user from localStorage
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

export const userService = {
  // Get user profile
  getProfile: async (): Promise<User> => {
    const response = await axiosInstance.get<User>('/users/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await axiosInstance.put<User>('/users/profile', data);
    
    // Update user in localStorage
    localStorage.setItem('user', JSON.stringify(response.data));
    
    return response.data;
  },
};
