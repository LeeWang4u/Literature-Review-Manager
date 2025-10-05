import axiosInstance from './api';

export interface ExtractedMetadata {
  title: string;
  authors: string;
  abstract?: string;
  publicationYear?: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  keywords?: string;
}

export const paperMetadataService = {
  /**
   * Extract paper metadata from DOI or URL
   * @param input - DOI (e.g., "10.1038/nature12373") or URL
   * @returns Extracted metadata
   */
  extractMetadata: async (input: string): Promise<ExtractedMetadata> => {
    const response = await axiosInstance.post<ExtractedMetadata>(
      '/papers/extract-metadata',
      { input },
    );
    return response.data;
  },
};
