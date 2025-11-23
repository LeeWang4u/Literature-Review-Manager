import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class AnalyzeReferencesDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minRelevance?: number = 0.5;
}

export interface ReferenceAnalysisResult {
  paperId: number;
  title: string;
  totalReferences: number;
  analyzedReferences: number;
  topReferences: {
    citation: {
      id: number;
      citedPaperId: number;
      relevanceScore: number;
      isInfluential: boolean;
      citationContext?: string;
    };
    paper: {
      id: number;
      title: string;
      authors: string;
      year: number;
      doi?: string;
      url?: string;
      hasPdf: boolean;
    };
    score: number; // Combined score from relevance + influential + citation count
    citationCount?: number;
  }[];
  recommendations: {
    highPriority: number; // Count of papers with score > 0.8
    shouldDownload: number; // Count recommended for download
  };
}
