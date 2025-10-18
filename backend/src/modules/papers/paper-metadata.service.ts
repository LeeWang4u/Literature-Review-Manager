import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';

export interface PaperMetadata {
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

@Injectable()
export class PaperMetadataService {
  private readonly logger = new Logger(PaperMetadataService.name);
  private readonly crossrefBaseUrl = 'https://api.crossref.org/works';
  private readonly semanticScholarBaseUrl = 'https://api.semanticscholar.org/graph/v1/paper';
  
  /**
   * Extract metadata from DOI or URL
   */
  async extractMetadata(input: string): Promise<PaperMetadata> {
    this.logger.log(`Extracting metadata from: ${input}`);
    
    // Detect input type
    const type = this.detectInputType(input);
    
    switch (type) {
      case 'arxiv':
        // Extract ArXiv ID from DOI format: 10.48550/arXiv.2303.17580 -> 2303.17580
        const arxivId = this.extractArxivId(input);
        if (arxivId) {
          return this.fetchFromArXiv(arxivId);
        }
        throw new HttpException(
          'Invalid ArXiv DOI format',
          HttpStatus.BAD_REQUEST,
        );
      case 'doi':
        return this.fetchFromDOI(input);
      case 'url':
        return this.fetchFromURL(input);
      default:
        throw new HttpException(
          'Invalid input. Please provide a valid DOI or URL',
          HttpStatus.BAD_REQUEST,
        );
    }
  }
  
  /**
   * Detect if input is DOI or URL
   */
  private detectInputType(input: string): 'doi' | 'url' | 'arxiv' | 'unknown' {
    // Check for ArXiv DOI format: 10.48550/arXiv.XXXX
    const arxivDoiPattern = /^10\.48550\/arXiv\.\d+\.\d+$/i;
    if (arxivDoiPattern.test(input)) {
      return 'arxiv';
    }
    
    // DOI patterns
    const doiPattern = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;
    const doiUrlPattern = /doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i;
    
    // Check for DOI
    if (doiPattern.test(input)) {
      return 'doi';
    }
    
    // Check for DOI in URL
    const doiMatch = input.match(doiUrlPattern);
    if (doiMatch) {
      return 'doi';
    }
    
    // Check for URL
    try {
      new URL(input);
      return 'url';
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Extract DOI from various formats
   */
  private extractDOI(input: string): string {
    // Remove common prefixes
    const cleanDoi = input
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/^doi:\s*/i, '')
      .trim();
    
    return cleanDoi;
  }
  
  /**
   * Fetch metadata from Crossref using DOI
   */
  private async fetchFromDOI(input: string): Promise<PaperMetadata> {
    const doi = this.extractDOI(input);
    this.logger.log(`Fetching from Crossref with DOI: ${doi}`);
    
    try {
      const response = await axios.get(`${this.crossrefBaseUrl}/${doi}`, {
        headers: {
          'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@literaturereview.com)',
        },
        timeout: 10000,
      });
      
      const data = response.data.message;
      const metadata = this.mapCrossrefToMetadata(data, doi);
      
      // If Crossref doesn't have abstract, try to get it from Semantic Scholar
      if (!metadata.abstract || metadata.abstract.length < 50) {
        this.logger.warn(`Crossref has no abstract for DOI ${doi}, trying Semantic Scholar...`);
        
        try {
          const s2Metadata = await this.fetchFromSemanticScholar(doi);
          
          // If Semantic Scholar has a better abstract, use it
          if (s2Metadata.abstract && s2Metadata.abstract.length > 50) {
            this.logger.log(`Using abstract from Semantic Scholar (${s2Metadata.abstract.length} chars)`);
            metadata.abstract = s2Metadata.abstract;
          }
        } catch (s2Error) {
          this.logger.warn(`Semantic Scholar also doesn't have abstract: ${s2Error.message}`);
          // Continue with Crossref data even without abstract
        }
      }
      
      return metadata;
    } catch (error) {
      this.logger.warn(`Crossref failed for DOI ${doi} (Status: ${error.response?.status}), trying Semantic Scholar as fallback...`);
      
      // Fallback to Semantic Scholar for all metadata
      try {
        return await this.fetchFromSemanticScholar(doi);
      } catch (fallbackError) {
        // Provide helpful error message
        const errorMsg = this.getHelpfulErrorMessage(doi, error.response?.status);
        throw new HttpException(errorMsg, HttpStatus.NOT_FOUND);
      }
    }
  }
  
  /**
   * Map Crossref response to our metadata format
   */
  private mapCrossrefToMetadata(data: any, doi: string): PaperMetadata {
    const authors = data.author
      ?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
      .filter((name: string) => name.length > 0)
      .join(', ') || '';
    
    // Extract publication year
    let publicationYear: number | undefined;
    if (data.published?.['date-parts']?.[0]?.[0]) {
      publicationYear = data.published['date-parts'][0][0];
    } else if (data['published-print']?.['date-parts']?.[0]?.[0]) {
      publicationYear = data['published-print']['date-parts'][0][0];
    } else if (data['published-online']?.['date-parts']?.[0]?.[0]) {
      publicationYear = data['published-online']['date-parts'][0][0];
    }
    
    // Clean abstract - remove HTML tags and decode entities
    const rawAbstract = data.abstract || '';
    const cleanAbstract = rawAbstract
      .replace(/<jats:p>/gi, '')
      .replace(/<\/jats:p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    this.logger.debug(`Crossref abstract: ${cleanAbstract ? 'Present (' + cleanAbstract.length + ' chars)' : 'Missing'}`);
    
    return {
      title: data.title?.[0] || '',
      authors,
      abstract: cleanAbstract,
      publicationYear,
      journal: data['container-title']?.[0] || '',
      volume: data.volume || '',
      issue: data.issue || '',
      pages: data.page || '',
      doi: doi,
      url: data.URL || `https://doi.org/${doi}`,
      keywords: data.subject?.join(', ') || '',
    };
  }
  
  /**
   * Fetch metadata from Semantic Scholar
   */
  private async fetchFromSemanticScholar(identifier: string): Promise<PaperMetadata> {
    this.logger.log(`Fetching from Semantic Scholar: ${identifier}`);
    
    try {
      // Semantic Scholar API v2 requires specific fields parameter
      const fields = 'title,authors,abstract,year,venue,externalIds,url,fieldsOfStudy,paperId';
      const response = await axios.get(
        `${this.semanticScholarBaseUrl}/${identifier}`,
        {
          params: { fields },
          timeout: 10000,
          headers: {
            'User-Agent': 'LiteratureReviewApp/1.0',
          },
        },
      );
      
      const data = response.data;
      
      // Log response for debugging
      this.logger.debug(`Semantic Scholar response for ${identifier}:`);
      this.logger.debug(`Title: ${data.title}`);
      this.logger.debug(`Authors: ${data.authors?.length || 0} authors`);
      this.logger.debug(`Abstract: ${data.abstract ? 'Present (' + data.abstract.length + ' chars)' : 'Missing'}`);
      this.logger.debug(`Year: ${data.year}`);
      this.logger.debug(`Venue: ${data.venue}`);
      
      return this.mapSemanticScholarToMetadata(data);
    } catch (error) {
      // Use debug level instead of error since this is often expected (404 for papers not in S2 database)
      this.logger.debug(`Semantic Scholar lookup failed (not in database): ${error.message}`);
      throw new HttpException(
        'Unable to fetch paper metadata. Please enter details manually.',
        HttpStatus.NOT_FOUND,
      );
    }
  }
  
  /**
   * Map Semantic Scholar response to our metadata format
   */
  private mapSemanticScholarToMetadata(data: any): PaperMetadata {
    const authors = data.authors
      ?.map((a: any) => a.name)
      .filter((name: string) => name?.length > 0)
      .join(', ') || '';
    
    // Extract DOI from externalIds
    const doi = data.externalIds?.DOI || data.externalIds?.ArXiv || '';
    
    return {
      title: data.title || '',
      authors,
      abstract: data.abstract || '',
      publicationYear: data.year || undefined,
      journal: data.venue || '',
      doi,
      url: data.url || `https://www.semanticscholar.org/paper/${data.paperId || ''}`,
      keywords: data.fieldsOfStudy?.join(', ') || '',
    };
  }
  
  /**
   * Fetch metadata from URL (using Semantic Scholar or ArXiv API)
   */
  private async fetchFromURL(url: string): Promise<PaperMetadata> {
    this.logger.log(`Processing URL: ${url}`);
    
    // Extract DOI from URL if possible
    const doiMatch = url.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
    if (doiMatch) {
      return this.fetchFromDOI(doiMatch[1]);
    }
    
    // Extract ArXiv ID and try ArXiv API for better abstract
    const arxivMatch = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/i);
    if (arxivMatch) {
      const arxivId = arxivMatch[1];
      
      // Try to get metadata from ArXiv API first (has better abstracts)
      try {
        return await this.fetchFromArXiv(arxivId);
      } catch (error) {
        this.logger.warn(`ArXiv API failed, falling back to Semantic Scholar`);
        return this.fetchFromSemanticScholar(`arXiv:${arxivId}`);
      }
    }
    
    // Try to fetch using the full URL
    try {
      return await this.fetchFromSemanticScholar(url);
    } catch {
      throw new HttpException(
        'Unable to extract metadata from URL. Please try with DOI or enter details manually.',
        HttpStatus.NOT_FOUND,
      );
    }
  }
  
  /**
   * Fetch metadata from ArXiv API
   */
  private async fetchFromArXiv(arxivId: string): Promise<PaperMetadata> {
    this.logger.log(`Fetching from ArXiv API: ${arxivId}`);
    
    try {
      const response = await axios.get(
        `http://export.arxiv.org/api/query`,
        {
          params: {
            id_list: arxivId,
            max_results: 1,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'LiteratureReviewApp/1.0',
          },
        },
      );
      
      // Parse XML response
      const xmlData = response.data;
      
      // Extract data using regex (simple XML parsing)
      const titleMatch = xmlData.match(/<title>(.+?)<\/title>/s);
      const summaryMatch = xmlData.match(/<summary>(.+?)<\/summary>/s);
      const publishedMatch = xmlData.match(/<published>(\d{4})-/);
      
      // Extract authors
      const authorMatches = xmlData.match(/<name>(.+?)<\/name>/g) || [];
      const authors = authorMatches
        .slice(1) // Skip first match (feed title)
        .map((match: string) => match.replace(/<\/?name>/g, '').trim())
        .join(', ');
      
      const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';
      const abstract = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '';
      const year = publishedMatch ? parseInt(publishedMatch[1]) : undefined;
      
      // Debug logging
      this.logger.debug(`ArXiv metadata extracted:`);
      this.logger.debug(`Title: ${title}`);
      this.logger.debug(`Authors (type: ${typeof authors}): "${authors}"`);
      this.logger.debug(`Abstract: ${abstract ? 'Present (' + abstract.length + ' chars)' : 'Missing'}`);
      this.logger.debug(`Year: ${year}`);
      
      const metadata: PaperMetadata = {
        title,
        authors, // This MUST be a string
        abstract,
        publicationYear: year,
        journal: 'arXiv',
        doi: '',
        url: `https://arxiv.org/abs/${arxivId}`,
        keywords: '',
      };
      
      return metadata;
    } catch (error) {
      this.logger.error(`ArXiv API failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract ArXiv ID from URL or DOI
   */
  extractArxivId(input: string): string | null {
    // Match new ArXiv DOI format: 10.48550/arXiv.2303.17580
    const newDoiMatch = input.match(/10\.48550\/arXiv\.(\d+\.\d+)/i);
    if (newDoiMatch) {
      return newDoiMatch[1];
    }

    // Match ArXiv URLs: https://arxiv.org/abs/2103.15348
    const urlMatch = input.match(/arxiv\.org\/abs\/(\d+\.\d+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Match ArXiv IDs directly: 2103.15348 or arXiv:2103.15348
    const idMatch = input.match(/(?:arxiv:)?(\d+\.\d+)/i);
    if (idMatch) {
      return idMatch[1];
    }

    return null;
  }

  /**
   * Get ArXiv PDF download URL
   */
  getArxivPdfUrl(arxivId: string): string {
    return `https://arxiv.org/pdf/${arxivId}.pdf`;
  }

  /**
   * Download PDF from ArXiv
   */
  async downloadArxivPdf(arxivId: string): Promise<Buffer> {
    const pdfUrl = this.getArxivPdfUrl(arxivId);
    this.logger.log(`Downloading ArXiv PDF from: ${pdfUrl}`);

    try {
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds for PDF download
        headers: {
          'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@literaturereview.com)',
        },
      });

      this.logger.log(`ArXiv PDF downloaded successfully, size: ${response.data.length} bytes`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download ArXiv PDF: ${error.message}`);
      throw new HttpException(
        'Failed to download PDF from ArXiv',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get helpful error message for DOI lookup failures
   */
  private getHelpfulErrorMessage(doi: string, statusCode?: number): string {
    // Check DOI prefix to identify publisher
    const doiPrefix = doi.split('/')[0];
    
    // Common small publishers or journals not in Crossref/Semantic Scholar
    const smallPublishers: Record<string, string> = {
      '10.38124': 'IJISRT (International Journal of Innovative Science and Research Technology)',
      '10.xxxxx': 'Other small publisher',
    };

    const publisherName = smallPublishers[doiPrefix];

    if (statusCode === 404) {
      if (publisherName) {
        return `This paper from ${publisherName} is not available in Crossref or Semantic Scholar databases. Please enter the paper details manually, or visit the publisher website: https://doi.org/${doi}`;
      }
      return `DOI ${doi} not found in Crossref or Semantic Scholar databases. This may be from a smaller publisher not indexed in these services. Please enter details manually or visit: https://doi.org/${doi}`;
    }

    return 'Unable to fetch paper metadata. Please enter details manually or try again later.';
  }
}
