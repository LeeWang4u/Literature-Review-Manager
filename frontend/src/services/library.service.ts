
import axiosInstance from './api';
import {
  LibraryItem,
  Library,
  CreateLibraryData,
  UpdateLibraryData,
  Paper,
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

  // ============= NEW LIBRARY MANAGEMENT APIs =============

  // Get all libraries for the current user
  getAllLibraries: async (): Promise<Library[]> => {
    const response = await axiosInstance.get<Library[]>('/libraries');
    return response.data;
  },

  // Ensure default library exists
  ensureDefaultLibrary: async (): Promise<Library> => {
    const response = await axiosInstance.post<Library>('/libraries/ensure-default');
    return response.data;
  },

  // Get a single library by ID
  getLibraryById: async (id: number): Promise<Library> => {
    const response = await axiosInstance.get<Library>(`/libraries/${id}`);
    return response.data;
  },

  // Create a new library
  createLibrary: async (data: CreateLibraryData): Promise<Library> => {
    const response = await axiosInstance.post<Library>('/libraries', data);
    return response.data;
  },

  // Update a library
  updateLibrary: async (id: number, data: UpdateLibraryData): Promise<Library> => {
    const response = await axiosInstance.put<Library>(`/libraries/${id}`, data);
    return response.data;
  },

  // Delete a library
  deleteLibrary: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/libraries/${id}`);
  },

  // Add a paper to a library
  addPaperToLibrary: async (libraryId: number, paperId: number): Promise<void> => {
    await axiosInstance.post(`/libraries/${libraryId}/papers`, { paperId });
  },

  // Remove a paper from a library
  removePaperFromLibrary: async (libraryId: number, paperId: number): Promise<void> => {
    await axiosInstance.delete(`/libraries/${libraryId}/papers/${paperId}`);
  },

  // Get papers in a library
  getPapersInLibrary: async (libraryId: number): Promise<number[]> => {
    const response = await axiosInstance.get<number[]>(`/libraries/${libraryId}/papers`);
    return response.data;
  },

  // Get statistics for a specific library
  getLibraryStatistics: async (libraryId: number): Promise<LibraryStatistics> => {
    const response = await axiosInstance.get<LibraryStatistics>(`/libraries/${libraryId}/statistics`);
    return response.data;
  },

  // Get libraries that contain a specific paper
  getLibrariesForPaper: async (paperId: number): Promise<Library[]> => {
    const response = await axiosInstance.get<Library[]>(`/papers/${paperId}/libraries`);
    return response.data;
  },

  // Toggle favorite (now using papers endpoint)
  toggleFavorite: async (id: number, favorite: boolean): Promise<void> => {
    await axiosInstance.patch(`/papers/library/${id}/favorite`, { favorite });
  },
};

