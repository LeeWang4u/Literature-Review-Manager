import axiosInstance from './api';
import {
  LibraryItem,
  AddToLibraryData,
  LibraryStatistics,
  ReadingStatus,
} from '@/types';

export const libraryService = {
  // Add paper to library
  addToLibrary: async (data: AddToLibraryData): Promise<LibraryItem> => {
    const response = await axiosInstance.post<LibraryItem>('/library/add', data);
    return response.data;
  },

  // Get user library
  getLibrary: async (status?: ReadingStatus): Promise<LibraryItem[]> => {
    const params = status ? { status } : {};
    const response = await axiosInstance.get<LibraryItem[]>('/library', { params });
    return response.data;
  },

  // Get library statistics
  getStatistics: async (): Promise<LibraryStatistics> => {
    const response = await axiosInstance.get<LibraryStatistics>('/library/statistics');
    return response.data;
  },

  // Update reading status
  updateStatus: async (id: number, status: ReadingStatus): Promise<LibraryItem> => {
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
};
