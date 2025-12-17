
import axiosInstance from './api';
import {
  LibraryItem,
} from '@/types';

export type LibraryStatus = 'to_read' | 'reading' | 'completed';

export interface StatusDefinition {
  key: string;
  label: string;
  color: 'default' | 'primary' | 'success' | 'warning';
}
export interface LibraryStatistics {
  total: number;
  favorites: number;
  byStatus: Record<LibraryStatus, number>;
}

export const libraryService = {

  getLibrary: async (filters?: {
    status?: string;
    favorite?: boolean;
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ items: LibraryItem[]; total: number }> => {
    const response = await axiosInstance.get<{ items: LibraryItem[]; total: number }>(
      '/papers/library/filter',
      { params: filters }
    );
    return response.data;
  },

  // Get library statistics (now using papers endpoint)
  getStatistics: async (): Promise<LibraryStatistics> => {
    const response = await axiosInstance.get<LibraryStatistics>('/papers/library/statistics');
    return response.data;
  },

  // Update reading status (now using papers endpoint)
  updateStatus: async (id: number, status: string): Promise<LibraryItem> => {
    const response = await axiosInstance.put<LibraryItem>(
      `/papers/library/${id}/status`, 
      { status }
    );
    return response.data;
  },

  // Toggle favorite (now using papers endpoint)
  toggleFavorite: async (id: number, favorite: boolean): Promise<void> => {
    await axiosInstance.patch(`/papers/library/${id}/favorite`, { favorite });
  },
};

