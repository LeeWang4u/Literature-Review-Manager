import axiosInstance from './api';
import { Tag, CreateTagData } from '@/types';

export const tagService = {
  // Create new tag
  create: async (data: CreateTagData): Promise<Tag> => {
    const response = await axiosInstance.post<Tag>('/tags', data);
    return response.data;
  },

  // Get all tags
  getAll: async (): Promise<Tag[]> => {
    const response = await axiosInstance.get<Tag[]>('/tags');
    return response.data;
  },

  // Get single tag by ID
  getById: async (id: number): Promise<Tag> => {
    const response = await axiosInstance.get<Tag>(`/tags/${id}`);
    return response.data;
  },

  // Update tag
  update: async (id: number, data: Partial<CreateTagData>): Promise<Tag> => {
    const response = await axiosInstance.put<Tag>(`/tags/${id}`, data);
    return response.data;
  },

  // Delete tag
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/tags/${id}`);
  },
};
