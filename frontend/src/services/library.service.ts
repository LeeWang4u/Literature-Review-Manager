
import axiosInstance from './api';
import {
  LibraryItem,
  AddToLibraryData,
  // LibraryStatistics,
  
} from '@/types';


export interface StatusDefinition {
  key: string;
  label: string;
  color: 'default' | 'primary' | 'success' | 'warning';
}

export interface LibraryStatistics {
  total: number;
  byStatus: {
    [key: string]: number;
  };
}

export const libraryService = {
  // Add paper to library
  addToLibrary: async (data: AddToLibraryData): Promise<LibraryItem> => {
    const response = await axiosInstance.post<LibraryItem>('/library/add', data);
    return response.data;
  },



  getLibrary: async (filters?: { status?: string; favorite?: boolean }): Promise<LibraryItem[]> => {
    const response = await axiosInstance.get<LibraryItem[]>('/library/filter', { params: filters });
    return response.data;
  },

  // Get library statistics
  getStatistics: async (): Promise<LibraryStatistics> => {
    const response = await axiosInstance.get<LibraryStatistics>('/library/statistics');
    return response.data;
  },

  // Update reading status
  updateStatus: async (id: number, status: string): Promise<LibraryItem> => {
    const response = await axiosInstance.put<LibraryItem>(`/library/${id}/status`, { status });
    return response.data;
  },

  // Rate paper
  ratePaper: async (id: number, rating: number): Promise<LibraryItem> => {
    const response = await axiosInstance.put<LibraryItem>(`/library/${id}/rating`, { rating });
    return response.data;
  },

  // Remove from library
  removeFromLibrary: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/library/${id}`);
  },

  getStatuses: async (): Promise<StatusDefinition[]> => {
    const response = await axiosInstance.get<StatusDefinition[]>('/library/statuses');
    return response.data;
  },

  toggleFavorite: async (id: number, favorite: boolean): Promise<void> => {
    await axiosInstance.patch(`/library/${id}/favorite`, { favorite });

  },



};
