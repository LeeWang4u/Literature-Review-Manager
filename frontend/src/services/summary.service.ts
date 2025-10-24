import axiosInstance from './api';
import { AiSummary, GenerateSummaryData } from '@/types';

export const summaryService = {
  // Generate AI summary
  generate: async (paperId: number, data?: GenerateSummaryData): Promise<AiSummary> => {
    const response = await axiosInstance.post<AiSummary>(
      `/summaries/generate/${paperId}`,
      data || {}
    );
    return response.data;
  },

  // Get summary for a paper
  get: async (paperId: number): Promise<AiSummary> => {
    const response = await axiosInstance.get<AiSummary>(`/summaries/${paperId}`);
    return response.data;
  },

  // Delete summary
  delete: async (paperId: number): Promise<void> => {
    await axiosInstance.delete(`/summaries/${paperId}`);
  },

  // Suggest tags for a paper using AI
  suggestTags: async (paperId: number): Promise<{ suggested: string[]; confidence: number }> => {
    const response = await axiosInstance.post<{ suggested: string[]; confidence: number }>(
      `/summaries/suggest-tags/${paperId}`
    );
    return response.data;
  },
};
