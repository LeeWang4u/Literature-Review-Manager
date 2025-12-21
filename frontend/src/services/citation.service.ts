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

  // Get references (papers this paper cites)
  getReferences: async (paperId: number): Promise<Citation[]> => {
    const response = await axiosInstance.get<Citation[]>(`/citations/paper/${paperId}/references`);
    return response.data;
  },

  // Get citing papers (papers that cite this paper)
  getCitedBy: async (paperId: number): Promise<Citation[]> => {
    const response = await axiosInstance.get<Citation[]>(`/citations/paper/${paperId}/cited-by`);
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

  // Update citation relevance and context
  update: async (id: number, data: { relevanceScore?: number; citationContext?: string }): Promise<Citation> => {
    const response = await axiosInstance.patch<Citation>(`/citations/${id}`, data);
    return response.data;
  },

  // Delete citation
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/citations/${id}`);
  },

  /*
  // AI auto-rate single citation
  autoRate: async (id: number): Promise<Citation> => {
    const response = await axiosInstance.post<Citation>(`/citations/${id}/auto-rate`);
    return response.data;
  },

  // AI auto-rate all references for a paper
  autoRateAll: async (paperId: number): Promise<{ rated: number; failed: number; citations: Citation[] }> => {
    const response = await axiosInstance.post(`/citations/paper/${paperId}/auto-rate-all`);
    return response.data;
  },
  */

  // Analyze references and get top recommendations
  analyzeReferences: async (paperId: number, options?: { limit?: number; minRelevance?: number }): Promise<any> => {
    const response = await axiosInstance.get(`/citations/paper/${paperId}/analyze`, {
      params: options,
    });
    return response.data;
  },
};
