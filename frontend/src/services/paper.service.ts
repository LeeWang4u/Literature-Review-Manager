
import axiosInstance from './api';
import {
  Paper,
  CreatePaperData,
  SearchPaperParams,
  PaginatedResponse,
  PaperStatistics,
} from '@/types';

export const paperService = {
  // Create new paper
  // create: async (data: CreatePaperData): Promise<Paper> => {
  //   // const response = await axiosInstance.post<Paper>('/papers', data);
  //   // return response.data;

  //   try {
  //     const response = await axiosInstance.post<Paper>('/papers', data);
  //     return response.data;
  //   } catch (error: any) {
  //     // Nếu backend trả lỗi có message, ném lại để FE xử lý
  //     if (error.response?.data?.message) {
  //       throw new Error(error.response.data.message);
  //     }
  //     throw error;
  //   }
  // },

  // create: async (data: CreatePaperData): Promise<{ success: boolean; message: string; data?: Paper }> => {
  //   const response = await axiosInstance.post('/papers', data);
  //   return response.data;
  // },

  create: async (data: CreatePaperData): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      const response = await axiosInstance.post('/papers', data);
      return response.data.data;
    } catch (error: any) {
      // Xử lý lỗi từ NestJS
      const res = error.response?.data;
      return {
        success: false,
        message: res?.message || 'Failed to create paper',
        data: res?.data,
      };
    }
  },

  // Get all papers with search and pagination
  search: async (params: SearchPaperParams): Promise<PaginatedResponse<Paper>> => {
    const response = await axiosInstance.get<PaginatedResponse<Paper>>('/papers', { params });
    return response.data;
  },

  // Get paper statistics
  getStatistics: async (): Promise<PaperStatistics> => {
    const response = await axiosInstance.get<PaperStatistics>('/papers/statistics');
    return response.data;
  },

  // Get single paper by ID
  getById: async (id: number): Promise<Paper> => {
    const response = await axiosInstance.get<Paper>(`/papers/${id}`);
    return response.data;
  },

  // Update paper
  update: async (id: number, data: Partial<CreatePaperData>): Promise<Paper> => {
    const response = await axiosInstance.put<Paper>(`/papers/${id}`, data);
    return response.data;
  },

  // Delete paper
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/papers/${id}`);
  },

  // Download ArXiv PDF
  downloadArxivPdf: async (input: string): Promise<{ arxivId: string; filename: string; data: string; size: number }> => {
    const response = await axiosInstance.post('/papers/download-arxiv-pdf', { input });
    return response.data;
  },

  updateStatus: async (id: number, status: 'to_read' | 'reading' | 'completed'): Promise<Paper> => {
    const response = await axiosInstance.patch<Paper>(`/papers/${id}/status`, { status });
    return response.data;
  },

  updateFavorite: async (id: number, favorite: boolean): Promise<Paper> => {
    const response = await axiosInstance.patch<Paper>(`/papers/${id}/favorite`, { favorite });
    return response.data;
  },

  updateStatusAndFavorite: async (
    id: number,
    data: { status?: 'to_read' | 'reading' | 'completed'; favorite?: boolean }
  ): Promise<Paper> => {
    const response = await axiosInstance.put<Paper>(`/papers/${id}/status`, data);
    return response.data;
  },


  getLibrary: async (filters?: { status?: string; favorite?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.favorite !== undefined)
      params.append('favorite', filters.favorite.toString());

    const response = await axiosInstance.get(`/papers/library?${params.toString()}`);
    return response.data;
  },


};


