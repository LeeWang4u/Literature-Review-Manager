// import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
// import axios from 'axios';

// export interface PaperMetadata {
//   title: string;
//   authors: string;
//   abstract?: string;
//   publicationYear?: number;
//   journal?: string;
//   volume?: string;
//   issue?: string;
//   pages?: string;
//   doi?: string;
//   url?: string;
//   keywords?: string;
//   references?: {
//     title?: string;
//     doi?: string;
//   }[];
// }

// @Injectable()
// export class PaperMetadataService {
//   private readonly logger = new Logger(PaperMetadataService.name);
//   private readonly crossrefBaseUrl = 'https://api.crossref.org/works';
//   private readonly semanticScholarBaseUrl = 'https://api.semanticscholar.org/graph/v1/paper';
//   private readonly arxivApiBaseUrl = 'http://export.arxiv.org/api/query';


//   /**
//    * Extract metadata from DOI or URL
//    */
//   async extractMetadata(input: string): Promise<PaperMetadata> {
//     this.logger.log(`Extracting metadata from: ${input}`);

//     // Detect input type
//     const type = this.detectInputType(input);

//     switch (type) {
//       case 'doi':
//         return this.fetchFromDOI(input);
//       case 'url':
//         return this.fetchFromURL(input);
//       default:
//         throw new HttpException(
//           'Invalid input. Please provide a valid DOI or URL',
//           HttpStatus.BAD_REQUEST,
//         );
//     }
//   }

//   /**
//    * Fetches the list of references for a given paper identifier (DOI, S2 Paper ID, etc.).
//    * @param identifier The DOI or Semantic Scholar ID of the paper.
//    * @returns A promise that resolves to an array of references.
//    */

//     async getReferences(
//     identifier: string,
//   ): Promise<PaperMetadata['references']> {
//     this.logger.log(`Fetching references for identifier: ${identifier}`);
//     let lookupId: string;

//     // Determine the correct identifier for Semantic Scholar
//     const arxivId = this.extractArxivId(identifier);
//     if (arxivId) {
//       // Use ArXiv ID format for Semantic Scholar
//       lookupId = `arXiv:${arxivId}`;
//       this.logger.log(`Detected ArXiv ID: ${arxivId}, using lookup ID: ${lookupId}`);
//     } else {
//       // Assume it's a DOI or a URL that Semantic Scholar can resolve
//       lookupId = this.extractDOI(identifier);
//       this.logger.log(`Using DOI or URL as lookup ID: ${lookupId}`);
//     }

//     try {
//       // Semantic Scholar is the best source for references for all types
//       const fields =
//         'references.title,references.authors,references.year,references.externalIds,references.paperId';
//       const response = await axios.get(
//         `${this.semanticScholarBaseUrl}/${lookupId}`,
//         {
//           params: { fields },
//           timeout: 15000,
//           headers: {
//             'User-Agent':
//               'LiteratureReviewApp/1.0 (mailto:support@example.com)',
//           },
//         },
//       );

//       if (response.data?.references?.length > 0) {
//         this.logger.log(
//           `Found ${response.data.references.length} references from Semantic Scholar`,
//         );
//         return response.data.references.map((ref: any) => ({
//           paperId: ref.paperId || '',
//           title: ref.title || 'Title not available',
//           doi: ref.externalIds?.DOI || '',
//           authors: ref.authors?.map((a: any) => a.name).join(', ') || '',
//           year: ref.year || undefined,
//         }));
//       } else {
//         this.logger.warn(
//           `Semantic Scholar returned no references for ${lookupId}`,
//         );
//         return [];
//       }
//     } catch (error) {
//       this.logger.error(
//         `Failed to fetch references from Semantic Scholar for ${lookupId}: ${error.message}`,
//       );
//       throw new HttpException(
//         'Unable to fetch references. The paper may not be in the Semantic Scholar database.',
//         HttpStatus.NOT_FOUND,
//       );
//     }
//   }

//   // async getReferences(
//   //   identifier: string,
//   // ): Promise<PaperMetadata['references']> {
//   //   this.logger.log(`Fetching references for identifier: ${identifier}`);

//   //   // --- LOGIC MỚI SIÊU THÔNG MINH ĐÂY! ---
//   //   let s2Identifier = identifier;
//   //   const arxivId = this.extractArxivId(identifier);

//   //   if (arxivId) {
//   //     this.logger.log(`Detected ArXiv ID: ${arxivId}. Using it for Semantic Scholar.`);
//   //     // Semantic Scholar hiểu định dạng 'arXiv:ID'
//   //     s2Identifier = `arXiv:${arxivId}`;
//   //   } else {
//   //     // Nếu không phải ArXiv, có thể là DOI hoặc URL khác, cứ để S2 xử lý
//   //     s2Identifier = this.extractDOI(identifier);
//   //   }
//   //   // --- KẾT THÚC LOGIC MỚI ---

//   //   try {
//   //     // Luôn dùng Semantic Scholar vì nó là đỉnh nhất cho việc này!
//   //     const fields =
//   //       'references.title,references.authors,references.year,references.externalIds,references.paperId';
//   //     const response = await axios.get(
//   //       `${this.semanticScholarBaseUrl}/${encodeURIComponent(s2Identifier)}`,
//   //       {
//   //         params: { fields },
//   //         timeout: 15000,
//   //         headers: {
//   //           'User-Agent': 'LiteratureReviewApp/1.0',
//   //         },
//   //       },
//   //     );

//   //     if (response.data?.references && response.data.references.length > 0) {
//   //       this.logger.log(
//   //         `Found ${response.data.references.length} references from Semantic Scholar for '${s2Identifier}'`,
//   //       );
//   //       return response.data.references.map((ref: any) => ({
//   //         paperId: ref.paperId || '',
//   //         title: ref.title || 'Title not available',
//   //         doi: ref.externalIds?.DOI || '',
//   //         authors: ref.authors?.map((a: any) => a.name).join(', ') || '',
//   //         year: ref.year || undefined,
//   //       }));
//   //     } else {
//   //       this.logger.warn(
//   //         `Semantic Scholar returned no references for ${s2Identifier}`,
//   //       );
//   //       return [];
//   //     }
//   //   } catch (error) {
//   //     this.logger.error(
//   //       `Failed to fetch references from Semantic Scholar for ${s2Identifier}: ${error.message}`,
//   //     );
//   //     throw new HttpException(
//   //       'Unable to fetch references. The paper might not be in the Semantic Scholar database or the identifier is invalid.',
//   //       HttpStatus.NOT_FOUND,
//   //     );
//   //   }
//   // }

//   // async getReferences(
//   //   identifier: string,
//   // ): Promise<PaperMetadata['references']> {
//   //   this.logger.log(`Fetching references for identifier: ${identifier}`);
//   //   const cleanIdentifier = this.extractDOI(identifier); // Also works for S2 IDs

//   //   try {
//   //     // Semantic Scholar is the best source for references
//   //     const fields =
//   //       'references.title,references.authors,references.year,references.externalIds,references.paperId';
//   //     const response = await axios.get(
//   //       `${this.semanticScholarBaseUrl}/${cleanIdentifier}`,
//   //       {
//   //         params: { fields },
//   //         timeout: 15000,
//   //         headers: {
//   //           'User-Agent': 'LiteratureReviewApp/1.0',
//   //         },
//   //       },
//   //     );

//   //     if (response.data?.references && response.data.references.length > 0) {
//   //       this.logger.log(
//   //         `Found ${response.data.references.length} references from Semantic Scholar`,
//   //       );
//   //       return response.data.references.map((ref: any) => ({
//   //         paperId: ref.paperId || '',
//   //         title: ref.title || 'Title not available',
//   //         doi: ref.externalIds?.DOI || '',
//   //         authors: ref.authors?.map((a: any) => a.name).join(', ') || '',
//   //         year: ref.year || undefined,
//   //       }));
//   //     } else {
//   //       this.logger.warn(
//   //         `Semantic Scholar returned no references for ${cleanIdentifier}`,
//   //       );
//   //       return [];
//   //     }
//   //   } catch (error) {
//   //     this.logger.error(
//   //       `Failed to fetch references from Semantic Scholar for ${cleanIdentifier}: ${error.message}`,
//   //     );
//   //     // Optional: Add a fallback to Crossref here if needed, but it's less reliable for this task.
//   //     throw new HttpException(
//   //       'Unable to fetch references for the specified paper.',
//   //       HttpStatus.NOT_FOUND,
//   //     );
//   //   }
//   // }

//   /**
//    * Detect if input is DOI or URL
//    */
//   private detectInputType(input: string): 'doi' | 'url' | 'unknown' {
//     // DOI patterns
//     const doiPattern = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;
//     const doiUrlPattern = /doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i;

//     // Check for DOI
//     if (doiPattern.test(input)) {
//       return 'doi';
//     }

//     // Check for DOI in URL
//     const doiMatch = input.match(doiUrlPattern);
//     if (doiMatch) {
//       return 'doi';
//     }

//     // Check for URL
//     try {
//       new URL(input);
//       return 'url';
//     } catch {
//       return 'unknown';
//     }
//   }

//   /**
//    * Extract DOI from various formats
//    */
//   private extractDOI(input: string): string {
//     // Remove common prefixes
//     const cleanDoi = input
//       .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
//       .replace(/^doi:\s*/i, '')
//       .trim();

//     return cleanDoi;
//   }

//   /**
//    * Fetch metadata from Crossref using DOI
//    */
//   private async fetchFromDOI(input: string): Promise<PaperMetadata> {
//     const doi = this.extractDOI(input);
//     this.logger.log(`Fetching from Crossref with DOI: ${doi}`);

//     try {
//       const response = await axios.get(`${this.crossrefBaseUrl}/${doi}`, {
//         headers: {
//           'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@literaturereview.com)',
//         },
//         timeout: 10000,
//       });

//       const data = response.data.message;
//       const metadata = this.mapCrossrefToMetadata(data, doi);

//       // If Crossref doesn't have abstract, try to get it from Semantic Scholar
//       if (!metadata.abstract || metadata.abstract.length < 50) {
//         this.logger.warn(`Crossref has no abstract for DOI ${doi}, trying Semantic Scholar...`);

//         try {
//           const s2Metadata = await this.fetchFromSemanticScholar(doi);

//           // If Semantic Scholar has a better abstract, use it
//           if (s2Metadata.abstract && s2Metadata.abstract.length > 50) {
//             this.logger.log(`Using abstract from Semantic Scholar (${s2Metadata.abstract.length} chars)`);
//             metadata.abstract = s2Metadata.abstract;
//             if (s2Metadata.references.length > 0 && metadata.references.length === 0) {
//               metadata.references = s2Metadata.references;
//             }
//           }
//         } catch (s2Error) {
//           this.logger.warn(`Semantic Scholar also doesn't have abstract: ${s2Error.message}`);
//           // Continue with Crossref data even without abstract
//         }
//       }

//       this.logger.log(`🎯 Final PaperMetadata combined result:\n${JSON.stringify(metadata, null, 2)}`);

//       return metadata;
//     } catch (error) {
//       this.logger.warn(`Crossref failed for DOI ${doi}, trying Semantic Scholar as fallback...`);

//       // Fallback to Semantic Scholar for all metadata
//       try {
//         return await this.fetchFromSemanticScholar(doi);
//       } catch (fallbackError) {
//         throw new HttpException(
//           'Unable to fetch paper metadata from any source. Please enter details manually.',
//           HttpStatus.NOT_FOUND,
//         );
//       }
//     }
//   }

//   /**
//    * Map Crossref response to our metadata format
//    */
//   private mapCrossrefToMetadata(data: any, doi: string): PaperMetadata {
//     const authors = data.author
//       ?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
//       .filter((name: string) => name.length > 0)
//       .join(', ') || '';

//     // Extract publication year
//     let publicationYear: number | undefined;
//     if (data.published?.['date-parts']?.[0]?.[0]) {
//       publicationYear = data.published['date-parts'][0][0];
//     } else if (data['published-print']?.['date-parts']?.[0]?.[0]) {
//       publicationYear = data['published-print']['date-parts'][0][0];
//     } else if (data['published-online']?.['date-parts']?.[0]?.[0]) {
//       publicationYear = data['published-online']['date-parts'][0][0];
//     }

//     // Clean abstract - remove HTML tags and decode entities
//     const rawAbstract = data.abstract || '';
//     const cleanAbstract = rawAbstract
//       .replace(/<jats:p>/gi, '')
//       .replace(/<\/jats:p>/gi, '\n\n')
//       .replace(/<[^>]*>/g, '') // Remove all other HTML tags
//       .replace(/&lt;/g, '<')
//       .replace(/&gt;/g, '>')
//       .replace(/&amp;/g, '&')
//       .replace(/&quot;/g, '"')
//       .replace(/&#39;/g, "'")
//       .trim();

//     this.logger.debug(`Crossref abstract: ${cleanAbstract ? 'Present (' + cleanAbstract.length + ' chars)' : 'Missing'}`);

//     const references =
//       data.reference?.map((ref: any) => ({
//         title: ref.article_title || ref.unstructured || '',
//         doi: ref.DOI || '',
//       })) || [];


//     const metadata: PaperMetadata = {
//       title: data.title?.[0] || '',
//       authors,
//       abstract: cleanAbstract,
//       publicationYear,
//       journal: data['container-title']?.[0] || '',
//       volume: data.volume || '',
//       issue: data.issue || '',
//       pages: data.page || '',
//       doi: doi,
//       url: data.URL || `https://doi.org/${doi}`,
//       keywords: data.subject?.join(', ') || '',
//       references,
//     };

//     this.logger.log(`✅ Mapped Crossref PaperMetadata:\n${JSON.stringify(metadata, null, 2)}`);


//     return metadata;
//   }

//   /**
//    * Fetch metadata from Semantic Scholar
//    */
//   private async fetchFromSemanticScholar(identifier: string): Promise<PaperMetadata> {
//     this.logger.log(`Fetching from Semantic Scholar: ${identifier}`);

//     try {
//       // Semantic Scholar API v2 requires specific fields parameter
//       const fields = 'title,authors,abstract,year,venue,externalIds,url,fieldsOfStudy,paperId,references,references.title,references.authors,references.year,references.externalIds,references.paperId';
//       const response = await axios.get(
//         `${this.semanticScholarBaseUrl}/${identifier}`,
//         {
//           params: { fields },
//           timeout: 10000,
//           headers: {
//             'User-Agent': 'LiteratureReviewApp/1.0',
//           },
//         },
//       );

//       const data = response.data;

//       // Log response for debugging
//       this.logger.debug(`Semantic Scholar response for ${identifier}:`);
//       this.logger.debug(`Title: ${data.title}`);
//       this.logger.debug(`Authors: ${data.authors?.length || 0} authors`);
//       this.logger.debug(`Abstract: ${data.abstract ? 'Present (' + data.abstract.length + ' chars)' : 'Missing'}`);
//       this.logger.debug(`Year: ${data.year}`);
//       this.logger.debug(`Venue: ${data.venue}`);
//       this.logger.debug(`References count: ${data.references?.length || 0}`);  // Thêm log để debug references
    

//       return this.mapSemanticScholarToMetadata(data);
//     } catch (error) {
//       this.logger.error(`Semantic Scholar failed: ${error.message}`);
//       throw new HttpException(
//         'Unable to fetch paper metadata. Please enter details manually.',
//         HttpStatus.NOT_FOUND,
//       );
//     }
//   }

//   /**
//    * Map Semantic Scholar response to our metadata format
//    */
//   private mapSemanticScholarToMetadata(data: any): PaperMetadata {
//     const authors = data.authors
//       ?.map((a: any) => a.name)
//       .filter((name: string) => name?.length > 0)
//       .join(', ') || '';

//     // Extract DOI from externalIds
//     const doi = data.externalIds?.DOI || data.externalIds?.ArXiv || '';

//     const references =
//       data.references?.map((ref: any) => ({
//         title: ref.title || '',
//         doi: ref.externalIds?.DOI || '',
//       })) || [];



//     const metadata: PaperMetadata = {
//       title: data.title || '',
//       authors,
//       abstract: data.abstract || '',
//       publicationYear: data.year || undefined,
//       journal: data.venue || '',
//       doi,
//       url: data.url || `https://www.semanticscholar.org/paper/${data.paperId || ''}`,
//       keywords: data.fieldsOfStudy?.join(', ') || '',
//       references,
//     };

//     this.logger.log(`✅ Mapped Semantic Scholar PaperMetadata:\n${JSON.stringify(metadata, null, 2)}`);

//     return metadata;
//   }

//   /**
//    * Fetch metadata from URL (using Semantic Scholar or ArXiv API)
//    */
//   private async fetchFromURL(url: string): Promise<PaperMetadata> {
//     this.logger.log(`Processing URL: ${url}`);

//     // Extract DOI from URL if possible
//     const doiMatch = url.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
//     if (doiMatch) {
//       return this.fetchFromDOI(doiMatch[1]);
//     }

//     // Extract ArXiv ID and try ArXiv API for better abstract
//     const arxivMatch = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/i);
//     if (arxivMatch) {
//       const arxivId = arxivMatch[1];

//       // Try to get metadata from ArXiv API first (has better abstracts)
//       try {
//         return await this.fetchFromArXiv(arxivId);
//       } catch (error) {
//         this.logger.warn(`ArXiv API failed, falling back to Semantic Scholar`);
//         return this.fetchFromSemanticScholar(`arXiv:${arxivId}`);
//       }
//     }

//     // Try to fetch using the full URL
//     try {
//       return await this.fetchFromSemanticScholar(url);
//     } catch {
//       throw new HttpException(
//         'Unable to extract metadata from URL. Please try with DOI or enter details manually.',
//         HttpStatus.NOT_FOUND,
//       );
//     }
//   }

//   /**
//    * Fetch metadata from ArXiv API
//    */
//   private async fetchFromArXiv(arxivId: string): Promise<PaperMetadata> {
//     this.logger.log(`Fetching from ArXiv API: ${arxivId}`);

//     try {
//       const response = await axios.get(
//         `http://export.arxiv.org/api/query`,
//         {
//           params: {
//             id_list: arxivId,
//             max_results: 1,
//           },
//           timeout: 10000,
//           headers: {
//             'User-Agent': 'LiteratureReviewApp/1.0',
//           },
//         },
//       );

//       // Parse XML response
//       const xmlData = response.data;

//       // Extract data using regex (simple XML parsing)
//       const titleMatch = xmlData.match(/<title>(.+?)<\/title>/s);
//       const summaryMatch = xmlData.match(/<summary>(.+?)<\/summary>/s);
//       const publishedMatch = xmlData.match(/<published>(\d{4})-/);

//       // Extract authors
//       const authorMatches = xmlData.match(/<name>(.+?)<\/name>/g) || [];
//       const authors = authorMatches
//         .slice(1) // Skip first match (feed title)
//         .map((match: string) => match.replace(/<\/?name>/g, '').trim())
//         .join(', ');

//       const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';
//       const abstract = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '';
//       const year = publishedMatch ? parseInt(publishedMatch[1]) : undefined;



//       // Debug logging
//       this.logger.debug(`ArXiv metadata extracted:`);
//       this.logger.debug(`Title: ${title}`);
//       this.logger.debug(`Authors (type: ${typeof authors}): "${authors}"`);
//       this.logger.debug(`Abstract: ${abstract ? 'Present (' + abstract.length + ' chars)' : 'Missing'}`);
//       this.logger.debug(`Year: ${year}`);

//       const metadata: PaperMetadata = {
//         title,
//         authors, // This MUST be a string
//         abstract,
//         publicationYear: year,
//         journal: 'arXiv',
//         doi: '',
//         url: `https://arxiv.org/abs/${arxivId}`,
//         keywords: '',
//       };

//       return metadata;
//     } catch (error) {
//       this.logger.error(`ArXiv API failed: ${error.message}`);
//       throw error;
//     }
//   }

  

//   /**
//    * Extract ArXiv ID from URL or DOI
//    */
//   // extractArxivId(input: string): string | null {
//   //   // Match ArXiv URLs: https://arxiv.org/abs/2103.15348
//   //   const urlMatch = input.match(/arxiv\.org\/abs\/(\d+\.\d+)/i);
//   //   if (urlMatch) {
//   //     return urlMatch[1];
//   //   }

//   //   // Match ArXiv IDs directly: 2103.15348 or arXiv:2103.15348
//   //   const idMatch = input.match(/(?:arxiv:)?(\d+\.\d+)/i);
//   //   if (idMatch) {
//   //     return idMatch[1];
//   //   }

//   //   return null;
//   // }

//   // extractArxivId(input: string): string | null {
//   //   // Match ArXiv URLs: https://arxiv.org/abs/2103.15348
//   //   const urlMatch = input.match(/arxiv\.org\/abs\/(\d+\.\d+(v\d+)?)/i);
//   //   if (urlMatch) {
//   //     return urlMatch[1];
//   //   }

//   //   // Match ArXiv IDs directly: 2103.15348 or arXiv:2103.15348
//   //   const idMatch = input.match(/(?:arxiv:)?(\d+\.\d+(v\d+)?)/i);
//   //   if (idMatch) {
//   //     return idMatch[1];
//   //   }

//   //   return null;
//   // }


//    private extractArxivId(input: string): string | null {
//       // Regex này sẽ tìm ID trong các link như:
//       // - https://arxiv.org/abs/2103.15348
//       // - https://arxiv.org/pdf/2103.15348.pdf
//       const urlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/([^\/v]+)/i);
//       if (urlMatch) {
//           return urlMatch[1].replace('.pdf', '');
//       }

//       // Tìm ID nếu người dùng nhập thẳng, ví dụ: "2103.15348"
//       const idMatch = input.match(/(?:arxiv:)?(\d+\.\d+(?:v\d+)?)/i);
//       if (idMatch) {
//           return idMatch[1];
//       }
      
//       return null;
//   }

//   /**
//    * Get ArXiv PDF download URL
//    */
//   getArxivPdfUrl(arxivId: string): string {
//     return `https://arxiv.org/pdf/${arxivId}.pdf`;
//   }

//   /**
//    * Download PDF from ArXiv
//    */
//   async downloadArxivPdf(arxivId: string): Promise<Buffer> {
//     const pdfUrl = this.getArxivPdfUrl(arxivId);
//     this.logger.log(`Downloading ArXiv PDF from: ${pdfUrl}`);

//     try {
//       const response = await axios.get(pdfUrl, {
//         responseType: 'arraybuffer',
//         timeout: 30000, // 30 seconds for PDF download
//         headers: {
//           'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@literaturereview.com)',
//         },
//       });

//       this.logger.log(`ArXiv PDF downloaded successfully, size: ${response.data.length} bytes`);
//       return Buffer.from(response.data);
//     } catch (error) {
//       this.logger.error(`Failed to download ArXiv PDF: ${error.message}`);
//       throw new HttpException(
//         'Failed to download PDF from ArXiv',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
// }




import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';
import * as pdfParse from 'pdf-parse';

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
  references?: {
    title?: string;
    doi?: string;
  }[];
}

@Injectable()
export class PaperMetadataService {
  private readonly logger = new Logger(PaperMetadataService.name);
  private readonly crossrefBaseUrl = 'https://api.crossref.org/works';
  private readonly semanticScholarBaseUrl = 'https://api.semanticscholar.org/graph/v1/paper';
  private readonly arxivApiBaseUrl = 'http://export.arxiv.org/api/query';

  /**
   * Extract metadata from DOI or URL, fetching from multiple sources and merging results for completeness.
   */
  async extractMetadata(input: string): Promise<PaperMetadata> {
    this.logger.log(`Extracting metadata from: ${input}`);

    // Extract all possible identifiers
    const identifiers = this.extractIdentifiers(input);
    const { doi, arxivId, url: inputUrl } = identifiers;

    // Fetch metadata from all available sources
    const metadataSources: Partial<PaperMetadata>[] = [];

    if (doi) {
      const crossrefMetadata = await this.fetchFromCrossref(doi).catch(() => null);
      if (crossrefMetadata) {
        metadataSources.push(crossrefMetadata);
      }
    }

    let s2Identifier = doi || (arxivId ? `arXiv:${arxivId}` : inputUrl);
    if (s2Identifier) {
      const s2Metadata = await this.fetchFromSemanticScholar(s2Identifier).catch(() => null);
      if (s2Metadata) {
        metadataSources.push(s2Metadata);
      }
    }

    if (arxivId) {
      const arxivMetadata = await this.fetchFromArXiv(arxivId).catch(() => null);
      if (arxivMetadata) {
        metadataSources.push(arxivMetadata);
      }
    }

    if (metadataSources.length === 0) {
      throw new HttpException(
        'Unable to fetch paper metadata from any source. Please enter details manually.',
        HttpStatus.NOT_FOUND,
      );
    }

    // Merge metadata from all sources
    const mergedMetadata = await this.mergeMetadata(metadataSources, arxivId);

    this.logger.log(`✅ Merged PaperMetadata:\n${JSON.stringify(mergedMetadata, null, 2)}`);

    return mergedMetadata;
  }

  private extractIdentifiers(input: string): { doi: string | null; arxivId: string | null; url: string | null } {
    let doi = null;
    let arxivId = null;
    let url = null;

    const type = this.detectInputType(input);
    if (type === 'doi') {
      doi = this.extractDOI(input);
    } else if (type === 'url') {
      url = input;
      const doiMatch = input.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
      if (doiMatch) {
        doi = doiMatch[1];
      }
      arxivId = this.extractArxivId(input);
    } else {
      // Try to extract anyway
      doi = this.extractDOI(input);
      arxivId = this.extractArxivId(input);
    }

    return { doi, arxivId, url };
  }

  private async fetchFromCrossref(doi: string): Promise<Partial<PaperMetadata>> {
    this.logger.log(`Fetching from Crossref with DOI: ${doi}`);
    const response = await axios.get(`${this.crossrefBaseUrl}/${doi}`, {
      headers: { 'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@literaturereview.com)' },
      timeout: 10000,
    });
    const data = response.data.message;
    return this.mapCrossrefToMetadata(data, doi);
  }

  private async fetchFromSemanticScholar(identifier: string): Promise<Partial<PaperMetadata>> {
    this.logger.log(`Fetching from Semantic Scholar: ${identifier}`);
    const fields = 'title,authors,abstract,year,venue,externalIds,url,fieldsOfStudy,paperId,references.title,references.authors,references.year,references.externalIds,references.paperId';
    const response = await axios.get(`${this.semanticScholarBaseUrl}/${identifier}`, {
      params: { fields },
      timeout: 10000,
      headers: { 'User-Agent': 'LiteratureReviewApp/1.0' },
    });
    return this.mapSemanticScholarToMetadata(response.data);
  }

  private async fetchFromArXiv(arxivId: string): Promise<Partial<PaperMetadata>> {
    this.logger.log(`Fetching from ArXiv API: ${arxivId}`);
    const response = await axios.get(this.arxivApiBaseUrl, {
      params: { id_list: arxivId, max_results: 1 },
      timeout: 10000,
      headers: { 'User-Agent': 'LiteratureReviewApp/1.0' },
    });
    const xmlData = response.data;

    // Simple XML parsing with regex
    const titleMatch = xmlData.match(/<title>(.+?)<\/title>/s);
    const summaryMatch = xmlData.match(/<summary>(.+?)<\/summary>/s);
    const publishedMatch = xmlData.match(/<published>(\d{4})-/);
    const authorMatches = xmlData.match(/<name>(.+?)<\/name>/g) || [];
    const authors = authorMatches.slice(1).map(match => match.replace(/<\/?name>/g, '').trim()).join(', ');

    return {
      title: titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '',
      authors,
      abstract: summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '',
      publicationYear: publishedMatch ? parseInt(publishedMatch[1]) : undefined,
      journal: 'arXiv',
      doi: '',
      url: `https://arxiv.org/abs/${arxivId}`,
      keywords: '',
      references: [],
    };
  }

  private async mergeMetadata(sources: Partial<PaperMetadata>[], arxivId: string | null): Promise<PaperMetadata> {
    const merged: Partial<PaperMetadata> = {};

    // Priority: Crossref for publication details, S2 for abstract/keywords/references, ArXiv for fallback
    const priorities = ['title', 'authors', 'publicationYear', 'journal', 'volume', 'issue', 'pages', 'doi', 'url'];
    for (const key of priorities) {
      for (const source of sources) {
        if (source[key] && (typeof source[key] === 'string' ? source[key].length > 0 : true) && !merged[key]) {
          merged[key] = source[key];
        }
      }
    }

    // For abstract, take the longest one
    let longestAbstract = '';
    sources.forEach(src => {
      if (src.abstract && src.abstract.length > longestAbstract.length) {
        longestAbstract = src.abstract;
      }
    });
    merged.abstract = longestAbstract;

    // For keywords, combine unique ones
    const allKeywords = sources.flatMap(src => src.keywords ? src.keywords.split(', ') : []);
    merged.keywords = [...new Set(allKeywords)].join(', ');

    // For references, prefer the source with the most references
    let maxRefs = [];
    sources.forEach(src => {
      if (src.references && src.references.length > maxRefs.length) {
        maxRefs = src.references;
      }
    });
    merged.references = maxRefs;

    // If no references and it's ArXiv, fallback to PDF parsing
    if (merged.references.length === 0 && arxivId) {
      try {
        const pdfBuffer = await this.downloadArxivPdf(arxivId);
        merged.references = await this.parseReferencesFromPdf(pdfBuffer);
      } catch (error) {
        this.logger.warn(`PDF parse failed for references: ${error.message}`);
      }
    }

    // Ensure required fields
    if (!merged.title || !merged.authors) {
      throw new HttpException('Incomplete metadata fetched.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return merged as PaperMetadata;
  }

  private async parseReferencesFromPdf(pdfBuffer: Buffer): Promise<PaperMetadata['references']> {
    try {
      const data = await pdfParse(pdfBuffer);
      const text = data.text;
      const lowerText = text.toLowerCase();
      let refStart = lowerText.lastIndexOf('references');
      if (refStart === -1) {
        this.logger.warn('No "References" section found in PDF');
        return [];
      }
      const refText = text.substring(refStart + 'References'.length).trim();

      // Split into individual references based on numbered lines
      const refLines = refText.split(/\n(?=\[\d+\]|\d+\.)/)
        .map(ref => ref.trim())
        .filter(ref => ref.length > 0);

      const references = refLines.map(ref => {
        // Basic parsing: extract DOI if possible
        const doiMatch = ref.match(/doi:\s*([^\s]+)/i) || ref.match(/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
        const title = ref; // Use the whole ref as title for simplicity; can improve
        return {
          title,
          doi: doiMatch ? doiMatch[1] : '',
        };
      });

      this.logger.log(`Extracted ${references.length} references from PDF`);
      return references;
    } catch (error) {
      this.logger.error(`Failed to parse PDF for references: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetches references separately, with fallback to PDF if needed.
   */
  async getReferences(identifier: string): Promise<PaperMetadata['references']> {
    this.logger.log(`Fetching references for identifier: ${identifier}`);
    const identifiers = this.extractIdentifiers(identifier);
    const { doi, arxivId } = identifiers;

    let refs: PaperMetadata['references'] = [];

    // Try Semantic Scholar first
    let s2Identifier = doi || (arxivId ? `arXiv:${arxivId}` : identifier);
    if (s2Identifier) {
      try {
        const fields = 'references.title,references.authors,references.year,references.externalIds,references.paperId';
        const response = await axios.get(`${this.semanticScholarBaseUrl}/${s2Identifier}`, {
          params: { fields },
          timeout: 15000,
          headers: { 'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@example.com)' },
        });
        refs = response.data.references?.map((ref: any) => ({
          title: ref.title || '',
          doi: ref.externalIds?.DOI || '',
        })) || [];
        if (refs.length > 0) {
          return refs;
        }
      } catch (error) {
        this.logger.warn(`Semantic Scholar failed for references: ${error.message}`);
      }
    }

    // Try Crossref
    if (doi) {
      try {
        const response = await axios.get(`${this.crossrefBaseUrl}/${doi}`, {
          headers: { 'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@literaturereview.com)' },
          timeout: 10000,
        });
        refs = response.data.message.reference?.map((ref: any) => ({
          title: ref.article_title || ref.unstructured || '',
          doi: ref.DOI || '',
        })) || [];
        if (refs.length > 0) {
          return refs;
        }
      } catch (error) {
        this.logger.warn(`Crossref failed for references: ${error.message}`);
      }
    }

    // Fallback to PDF for ArXiv
    if (arxivId) {
      try {
        const pdfBuffer = await this.downloadArxivPdf(arxivId);
        refs = await this.parseReferencesFromPdf(pdfBuffer);
      } catch (error) {
        this.logger.error(`Failed to fetch references from ArXiv PDF: ${error.message}`);
      }
    }

    if (refs.length === 0) {
      throw new HttpException(
        'Unable to fetch references. The paper may not have references available in the databases.',
        HttpStatus.NOT_FOUND,
      );
    }

    return refs;
  }

  private detectInputType(input: string): 'doi' | 'url' | 'unknown' {
    const doiPattern = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;
    const doiUrlPattern = /doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i;

    if (doiPattern.test(input)) {
      return 'doi';
    }

    const doiMatch = input.match(doiUrlPattern);
    if (doiMatch) {
      return 'doi';
    }

    try {
      new URL(input);
      return 'url';
    } catch {
      return 'unknown';
    }
  }

  private extractDOI(input: string): string {
    const cleanDoi = input
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/^doi:\s*/i, '')
      .trim();
    return cleanDoi;
  }

  private mapCrossrefToMetadata(data: any, doi: string): Partial<PaperMetadata> {
    const authors = data.author
      ?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
      .filter((name: string) => name.length > 0)
      .join(', ') || '';

    let publicationYear: number | undefined;
    if (data.published?.['date-parts']?.[0]?.[0]) {
      publicationYear = data.published['date-parts'][0][0];
    } else if (data['published-print']?.['date-parts']?.[0]?.[0]) {
      publicationYear = data['published-print']['date-parts'][0][0];
    } else if (data['published-online']?.['date-parts']?.[0]?.[0]) {
      publicationYear = data['published-online']['date-parts'][0][0];
    }

    const rawAbstract = data.abstract || '';
    const cleanAbstract = rawAbstract
      .replace(/<jats:p>/gi, '')
      .replace(/<\/jats:p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    const references = data.reference?.map((ref: any) => ({
      title: ref.article_title || ref.unstructured || '',
      doi: ref.DOI || '',
    })) || [];

    return {
      title: data.title?.[0] || '',
      authors,
      abstract: cleanAbstract,
      publicationYear,
      journal: data['container-title']?.[0] || '',
      volume: data.volume || '',
      issue: data.issue || '',
      pages: data.page || '',
      doi,
      url: data.URL || `https://doi.org/${doi}`,
      keywords: data.subject?.join(', ') || '',
      references,
    };
  }

  private mapSemanticScholarToMetadata(data: any): Partial<PaperMetadata> {
    const authors = data.authors
      ?.map((a: any) => a.name)
      .filter((name: string) => name?.length > 0)
      .join(', ') || '';

    const doi = data.externalIds?.DOI || data.externalIds?.ArXiv || '';

    const references = data.references?.map((ref: any) => ({
      title: ref.title || '',
      doi: ref.externalIds?.DOI || '',
    })) || [];

    return {
      title: data.title || '',
      authors,
      abstract: data.abstract || '',
      publicationYear: data.year || undefined,
      journal: data.venue || '',
      doi,
      url: data.url || `https://www.semanticscholar.org/paper/${data.paperId || ''}`,
      keywords: data.fieldsOfStudy?.join(', ') || '',
      references,
    };
  }

  getArxivPdfUrl(arxivId: string): string {
    return `https://arxiv.org/pdf/${arxivId}.pdf`;
  }

  async downloadArxivPdf(arxivId: string): Promise<Buffer> {
    const pdfUrl = this.getArxivPdfUrl(arxivId);
    this.logger.log(`Downloading ArXiv PDF from: ${pdfUrl}`);

    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@literaturereview.com)' },
    });

    this.logger.log(`ArXiv PDF downloaded successfully, size: ${response.data.length} bytes`);
    return Buffer.from(response.data);
  }

  public extractArxivId(input: string): string | null {
    const urlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/([^\/v]+)/i);
    if (urlMatch) {
      return urlMatch[1].replace('.pdf', '');
    }

    const idMatch = input.match(/(?:arxiv:)?(\d+\.\d+(?:v\d+)?)/i);
    if (idMatch) {
      return idMatch[1];
    }

    return null;
  }
}