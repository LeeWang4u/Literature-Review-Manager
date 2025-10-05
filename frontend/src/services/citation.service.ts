import axiosInstance from './api';
import {
  Citation,
  CreateCitationData,
  CitationNetwork,
  CitationStats,
} from '@/types';

export const citationService = {
  // Create citation
  create: async (data: CreateCitationData): Promise<Citation> => {
    const response = await axiosInstance.post<Citation>('/citations', data);
    return response.data;
  },

  // Get citations for a paper
  getByPaper: async (paperId: number): Promise<{ citing: any[]; citedBy: any[] }> => {
    const response = await axiosInstance.get(`/citations/paper/${paperId}`);
    return response.data;
  },

  // Get citation network for D3.js
  getNetwork: async (paperId: number, depth: number = 2): Promise<CitationNetwork> => {
    const response = await axiosInstance.get<CitationNetwork>(
      `/citations/network/${paperId}`,
      { params: { depth } }
    );
    return response.data;
  },

  // Get citation statistics
  getStats: async (paperId: number): Promise<CitationStats> => {
    const response = await axiosInstance.get<CitationStats>(`/citations/stats/${paperId}`);
    return response.data;
  },

  // Delete citation
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/citations/${id}`);
  },
};
