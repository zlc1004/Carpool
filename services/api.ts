import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = 'http://localhost:3000'; // Update with your server URL
const API_TIMEOUT = 30000;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const TokenManager = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await TokenManager.removeToken();
      // You might want to redirect to login here
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(userData: {
    email: string;
    password: string;
    name: string;
    schoolId?: string;
  }) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    await TokenManager.removeToken();
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/me');
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string) {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const response = await api.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    return response.data;
  },
};

// Profile API
export const profileAPI = {
  async getProfile() {
    const response = await api.get('/api/profile');
    return response.data;
  },

  async updateProfile(profileData: any) {
    const response = await api.put('/api/profile', profileData);
    return response.data;
  },

  async uploadProfileImage(imageUri: string) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);

    const response = await api.post('/api/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Rides API
export const ridesAPI = {
  async getRides(filters?: {
    origin?: string;
    destination?: string;
    date?: string;
    schoolId?: string;
  }) {
    const response = await api.get('/api/rides', { params: filters });
    return response.data;
  },

  async getMyRides() {
    const response = await api.get('/api/rides/my');
    return response.data;
  },

  async getRide(rideId: string) {
    const response = await api.get(`/api/rides/${rideId}`);
    return response.data;
  },

  async createRide(rideData: {
    origin: string;
    destination: string;
    date: string;
    seats: number;
    notes?: string;
    schoolId: string;
  }) {
    const response = await api.post('/api/rides', rideData);
    return response.data;
  },

  async updateRide(rideId: string, rideData: any) {
    const response = await api.put(`/api/rides/${rideId}`, rideData);
    return response.data;
  },

  async deleteRide(rideId: string) {
    const response = await api.delete(`/api/rides/${rideId}`);
    return response.data;
  },

  async joinRide(rideId: string, shareCode?: string) {
    const response = await api.post(`/api/rides/${rideId}/join`, { shareCode });
    return response.data;
  },

  async leaveRide(rideId: string) {
    const response = await api.post(`/api/rides/${rideId}/leave`);
    return response.data;
  },
};

// Chat API
export const chatAPI = {
  async getChats() {
    const response = await api.get('/api/chats');
    return response.data;
  },

  async getChat(chatId: string) {
    const response = await api.get(`/api/chats/${chatId}`);
    return response.data;
  },

  async sendMessage(chatId: string, message: string) {
    const response = await api.post(`/api/chats/${chatId}/messages`, {
      message,
    });
    return response.data;
  },
};

// Schools API
export const schoolsAPI = {
  async getSchools() {
    const response = await api.get('/api/schools');
    return response.data;
  },

  async getSchool(schoolId: string) {
    const response = await api.get(`/api/schools/${schoolId}`);
    return response.data;
  },
};

// Places API
export const placesAPI = {
  async getPlaces(schoolId?: string) {
    const response = await api.get('/api/places', {
      params: schoolId ? { schoolId } : {},
    });
    return response.data;
  },
};

export default api;
