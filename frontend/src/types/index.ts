// User types
export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  affiliation?: string;
  researchInterests?: string[];
  createdAt?: string;
  lastLoginAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  affiliation?: string;
}

export interface UpdateProfileData {
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  affiliation?: string;
  researchInterests?: string[];
}

// Paper types
export interface Paper {
  id: number;
  title: string;
  authors: string; // Backend stores as comma-separated string
  abstract: string;
  publicationYear: number;
  journal?: string;
  doi?: string;
  url?: string;
  keywords?: string[];
  tags?: Tag[];
  userId: number;
  createdAt: string;
  updatedAt: string;
  status: 'to_read' | 'reading' | 'completed';
  favorite: boolean;
}

export interface CreatePaperData {
  title: string;
  authors: string; // Backend expects comma-separated string, not array
  abstract: string;
  publicationYear: number;
  journal?: string;
  doi?: string;
  url?: string;
  keywords?: string[];
  tagIds?: number[];
}

export interface SearchPaperParams {
  query?: string;
  year?: number;
  author?: string;
  journal?: string;
  tags?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'title' | 'year' | 'authors' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaperStatistics {
  total: number;
  totalPapers: number;
  papersByYear: { year: number; count: number }[];
}

export interface PaperMetadataResponse {
  title: string;
  authors: string;
  abstract?: string;
  publicationYear?: number;
  journal?: string;
  doi?: string;
  url?: string;
  arxivId?: string;
  pdfAvailable?: boolean;
  pdfUrl?: string;
}

// Tag types
export interface Tag {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

// Note types
export interface Note {
  id: number;
  title: string;
  content: string;
  highlightedText?: string;
  pageNumber?: number;
  paperId: number;
  paper?: Paper;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  title: string;
  content: string;
  paperId: number;
  highlightedText?: string;
  pageNumber?: number;
}

// Library types
export enum ReadingStatus {
  TO_READ = 'to-read',
  READING = 'reading',
  READ = 'read',
  COMPLETED = 'completed',
  FAVORITE = 'favorite',
}

export interface LibraryItem {
  id: number;
  paperId: number;
  paper: Paper;
  status: ReadingStatus;
  rating?: number;
  addedAt: string;
  userId: number;
}

export interface AddToLibraryData {
  paperId: number;
  status?: ReadingStatus;
}

export interface LibraryStatistics {
  total: number;
  reading: number;
  completed: number;
  byStatus: Record<ReadingStatus, number>;
  averageRating: string | null;
}

// Citation types
export interface Citation {
  id: number;
  citingPaperId: number;
  citedPaperId: number;
  citingPaper?: Paper;
  citedPaper?: Paper;
  createdAt: string;
}

export interface CreateCitationData {
  citingPaperId: number;
  citedPaperId: number;
}

export interface CitationNetwork {
  nodes: {
    id: number;
    title: string;
    year: number;
    authors: string[];
  }[];
  edges: {
    source: number;
    target: number;
  }[];
}

export interface CitationStats {
  citedBy: number;
  citing: number;
}

// PDF types
export interface PdfFile {
  id: number;
  paperId: number;
  fileName: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  version: number;
  uploadedAt: string;
  // Alias for backward compatibility
  get filename(): string;
}

// Summary types
export interface AiSummary {
  id: number;
  paperId: number;
  paper?: Paper;
  summaryText: string;
  keyFindings: string[];
  generatedAt: string;
}

export interface GenerateSummaryData {
  forceRegenerate?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
}

// Error types
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
