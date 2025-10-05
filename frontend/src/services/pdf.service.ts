import axiosInstance from './api';
import { PdfFile } from '@/types';

export const pdfService = {
  // Upload PDF file
  upload: async (paperId: number, file: File): Promise<PdfFile> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<PdfFile>(
      `/pdf/upload/${paperId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Upload PDF from Blob (for ArXiv auto-upload)
  uploadBlob: async (paperId: number, blob: Blob, filename: string): Promise<PdfFile> => {
    const file = new File([blob], filename, { type: 'application/pdf' });
    return pdfService.upload(paperId, file);
  },

  // Get PDFs for a paper
  getByPaper: async (paperId: number): Promise<PdfFile[]> => {
    const response = await axiosInstance.get<PdfFile[]>(`/pdf/paper/${paperId}`);
    return response.data;
  },

  // Get PDF metadata
  getById: async (id: number): Promise<PdfFile> => {
    const response = await axiosInstance.get<PdfFile>(`/pdf/${id}`);
    return response.data;
  },

  // Download PDF
  download: async (id: number, filename: string): Promise<void> => {
    const response = await axiosInstance.get(`/pdf/download/${id}`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Delete PDF
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/pdf/${id}`);
  },
};
