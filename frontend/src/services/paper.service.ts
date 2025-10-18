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
  create: async (data: CreatePaperData): Promise<Paper> => {
    const response = await axiosInstance.post<Paper>('/papers', data);
    return response.data;
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


  //   updatePaperStatusFavorite: async (
  //   paperId: number,
  //   data: { status?: 'to_read' | 'reading' | 'completed'; favorite?: boolean }
  // ) => {
  //   const res = await axios.put(`/api/papers/${paperId}/status`, data);
  //   return res.data;
  // },


  //   updatePaperStatus = async (
  //   paperId: number,
  //   data: { status?: 'to_read' | 'reading' | 'completed'; favorite?: boolean }
  // ) => {
  //   const res = await axios.put(`/api/papers/${paperId}/status`, data);
  //   return res.data;
  // };
};


