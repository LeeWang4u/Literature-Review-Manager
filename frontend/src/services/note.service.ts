import axiosInstance from './api';
import { Note, CreateNoteData } from '@/types';

export const noteService = {
  // Create new note
  create: async (data: CreateNoteData): Promise<Note> => {
    const response = await axiosInstance.post<Note>('/notes', data);
    return response.data;
  },

  // Get all notes for current user
  getAll: async (): Promise<Note[]> => {
    const response = await axiosInstance.get<Note[]>('/notes');
    return response.data;
  },

  // Get notes by paper ID
  getByPaper: async (paperId: number): Promise<Note[]> => {
    const response = await axiosInstance.get<Note[]>(`/notes/paper/${paperId}`);
    return response.data;
  },

  // Get single note by ID
  getById: async (id: number): Promise<Note> => {
    const response = await axiosInstance.get<Note>(`/notes/${id}`);
    return response.data;
  },

  // Update note
  update: async (id: number, data: Partial<CreateNoteData>): Promise<Note> => {
    const response = await axiosInstance.put<Note>(`/notes/${id}`, data);
    return response.data;
  },

  // Delete note
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/notes/${id}`);
  },
};
