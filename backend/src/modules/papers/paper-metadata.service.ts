



import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';
import * as pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    authors?: string;
    year?: number;
    doi?: string;
    isInfluential?: boolean;
  }[];
}

@Injectable()
export class PaperMetadataService {
  private readonly logger = new Logger(PaperMetadataService.name);
  private readonly crossrefBaseUrl = 'https://api.crossref.org/works';
  private readonly semanticScholarBaseUrl = 'https://api.semanticscholar.org/graph/v1/paper';
  private readonly arxivApiBaseUrl = 'http://export.arxiv.org/api/query';
  private readonly semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY || '';
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('⚠️ GEMINI_API_KEY not configured. AI DOI finding will not work.');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log('✅ Gemini AI initialized for DOI finding');
    }
  }
  
  private getSemanticScholarHeaders() {
    const headers: any = {};
    if (this.semanticScholarApiKey) {
      headers['x-api-key'] = this.semanticScholarApiKey;
      this.logger.debug('Using Semantic Scholar API key');
    }
    return headers;
  }

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
    const fields = 'title,authors,abstract,year,venue,externalIds,url,fieldsOfStudy,paperId,references.title,references.authors,references.year,references.externalIds,references.paperId,references.isInfluential';
    const response = await axios.get(`${this.semanticScholarBaseUrl}/${identifier}`, {
      params: { fields },
      timeout: 15000,  // Increased timeout for reference fetching
      headers: { 
        'User-Agent': 'LiteratureReviewApp/1.0',
        ...this.getSemanticScholarHeaders(),
      },
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

    // Extract the first <entry> ... </entry> block to avoid feed-level <title>
    const entryMatch = xmlData.match(/<entry[\s\S]*?<\/entry>/i);
    const entryXml = entryMatch ? entryMatch[0] : xmlData; // fallback to whole feed if no entry

    const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    const publishedMatch = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i);

    // Extract all <name> inside this entry (author names)
    const authorNameMatches = Array.from(entryXml.matchAll(/<author[\s\S]*?>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi));
    const authorsArr = authorNameMatches.map(m => m[1].trim()).filter(Boolean);
    const authors = authorsArr.join(', ');

    // Try to extract pdf link from links inside the entry
    let pdfUrl = '';
    const linkMatches = Array.from(entryXml.matchAll(/<link\s+[^>]*\/?>/gi));
    for (const lm of linkMatches) {
      const tag = lm[0];
      const hrefMatch = tag.match(/href=["']?([^"'\s>]+)["']?/i);
      const typeMatch = tag.match(/type=["']?([^"'\s>]+)["']?/i);
      const titleAttrMatch = tag.match(/title=["']?([^"'\s>]+)["']?/i);
      const href = hrefMatch ? hrefMatch[1] : '';
      const type = typeMatch ? typeMatch[1] : '';
      const titleAttr = titleAttrMatch ? titleAttrMatch[1] : '';
      if (type === 'application/pdf' || titleAttr.toLowerCase() === 'pdf') {
        pdfUrl = href;
        break;
      }
    }

    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';
    const published = publishedMatch ? publishedMatch[1].trim() : '';

    return {
      title,
      authors,
      abstract: summary,
      publicationYear: published ? parseInt(published.substring(0, 4), 10) : undefined,
      journal: 'arXiv',
      doi: '',
      url: `https://arxiv.org/abs/${arxivId}`,
      keywords: '',
      references: [],
      // provide flag for PDF availability
      ...(pdfUrl ? { pdfAvailable: true } : { pdfAvailable: false }),
    };

    // // Simple XML parsing with regex
    // const titleMatch = xmlData.match(/<title>(.+?)<\/title>/s);
    // const summaryMatch = xmlData.match(/<summary>(.+?)<\/summary>/s);
    // const publishedMatch = xmlData.match(/<published>(\d{4})-/);
    // const authorMatches = xmlData.match(/<name>(.+?)<\/name>/g) || [];
    // const authors = authorMatches.slice(1).map(match => match.replace(/<\/?name>/g, '').trim()).join(', ');

    // return {
    //   title: titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '',
    //   authors,
    //   abstract: summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '',
    //   publicationYear: publishedMatch ? parseInt(publishedMatch[1]) : undefined,
    //   journal: 'arXiv',
    //   doi: '',
    //   url: `https://arxiv.org/abs/${arxivId}`,
    //   keywords: '',
    //   references: [],
    // };
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

    // Limit and filter Crossref references
    const references = (data.reference || [])
      .filter((ref: any) => ref.article_title || ref.unstructured)  // Only keep refs with title
      .slice(0, 15)  // Limit to 15 references
      .map((ref: any) => ({
        title: ref.article_title || ref.unstructured || '',
        authors: ref.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter((name: string) => name.length > 0).join(', ') || '',
        year: ref.year || ref['journal-issue']?.['published-print']?.['date-parts']?.[0]?.[0] || undefined,
        doi: ref.DOI || '',
      }));

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

    // Filter and prioritize references
    let references = data.references || [];
    
    this.logger.log(`Semantic Scholar returned ${references.length} references`);
    
    // Log first few references with year data for debugging
    if (references.length > 0) {
      this.logger.log(`Sample RAW reference data from S2 API (first 3):`);
      references.slice(0, 3).forEach((ref: any, idx: number) => {
        this.logger.log(`  Raw Ref ${idx + 1}:`);
        this.logger.log(`    title: "${ref.title?.substring(0, 80)}..."`);
        this.logger.log(`    year field: ${ref.year}`);
        this.logger.log(`    isInfluential: ${ref.isInfluential}`);
      });
    }
    
    // Sort by influential first, then by year (newest first)
    references = references
      .filter((ref: any) => ref.title)  // Only keep refs with title
      .map((ref: any, index: number) => {
        let year = ref.year;
        
        // If year is not provided, try to extract from title (citation format)
        if (!year && ref.title) {
          // Match patterns like: (2021), (2024), etc. at the end or in parentheses
          const yearMatch = ref.title.match(/\((\d{4})\)/g);
          if (yearMatch && yearMatch.length > 0) {
            // Take the last year found (usually the publication year)
            const lastYear = yearMatch[yearMatch.length - 1];
            const extractedYear = parseInt(lastYear.replace(/[()]/g, ''));
            // Validate year is reasonable (between 1900 and current year + 1)
            if (extractedYear >= 1900 && extractedYear <= new Date().getFullYear() + 1) {
              year = extractedYear;
              if (index < 3) {
                this.logger.log(`  Extracted year ${year} from: "${ref.title.substring(0, 60)}..."`);
              }
            }
          } else if (index < 3) {
            this.logger.log(`  No year pattern found in: "${ref.title.substring(0, 60)}..."`);
          }
        }
        
        return {
          title: ref.title || '',
          authors: ref.authors?.map((a: any) => a.name).filter((name: string) => name?.length > 0).join(', ') || '',
          year: year,
          doi: ref.externalIds?.DOI || '',
          isInfluential: ref.isInfluential || false,
        };
      })
      .sort((a: any, b: any) => {
        // Influential papers first
        if (a.isInfluential && !b.isInfluential) return -1;
        if (!a.isInfluential && b.isInfluential) return 1;
        // Then by year (newest first)
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 50);  // Increased from 20 to 50 references

    this.logger.log(`Filtered and mapped ${references.length} references for paper`);
    
    // Log year distribution
    const withYear = references.filter((r: any) => r.year).length;
    const withoutYear = references.length - withYear;
    this.logger.log(`Reference year stats: ${withYear} with year, ${withoutYear} without year`);

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

  /**
   * Search for a paper by title, authors, and year using Semantic Scholar API
   */
  async searchPaperByMetadata(
    title: string,
    authors?: string,
    year?: number,
    retries: number = 2,
  ): Promise<{ paperId: string; doi?: string } | null> {
    this.logger.log(`Searching paper by metadata: "${title.substring(0, 60)}...", year: ${year}`);

    try {
      // Clean title for search
      const cleanTitle = title
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);

      const response = await axios.get(`${this.semanticScholarBaseUrl}/search`, {
        params: {
          query: cleanTitle,
          fields: 'paperId,title,authors,year,externalIds',
          limit: 10,
        },
        timeout: 15000,
        headers: { 
          'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@example.com)',
          ...this.getSemanticScholarHeaders(),
        },
      });

      const papers = response.data.data || [];
      if (papers.length === 0) {
        this.logger.warn('No papers found in search');
        return null;
      }

      // Find best match by comparing title similarity and year
      let bestMatch = null;
      let bestScore = 0;

      for (const paper of papers) {
        let score = 0;

        // Title similarity (simple word matching)
        const paperTitle = (paper.title || '').toLowerCase();
        const searchTitle = cleanTitle.toLowerCase();
        const titleWords = searchTitle.split(' ').filter(w => w.length > 3);
        const matchedWords = titleWords.filter(word => paperTitle.includes(word));
        const titleSimilarity = matchedWords.length / titleWords.length;
        score += titleSimilarity * 70;

        // Year match (if provided)
        if (year && paper.year) {
          const yearDiff = Math.abs(paper.year - year);
          if (yearDiff === 0) score += 30;
          else if (yearDiff === 1) score += 15;
        } else if (year) {
          score += 10; // Penalty for missing year
        }

        this.logger.debug(`  Paper: "${paper.title?.substring(0, 50)}..." (${paper.year}) - Score: ${score.toFixed(1)}`);

        if (score > bestScore && score > 50) { // Minimum 50% confidence
          bestScore = score;
          bestMatch = paper;
        }
      }

      if (!bestMatch) {
        this.logger.warn('No good match found (all scores < 50%)');
        return null;
      }

      this.logger.log(`✅ Found match: "${bestMatch.title?.substring(0, 60)}..." (confidence: ${bestScore.toFixed(1)}%)`);
      return {
        paperId: bestMatch.paperId,
        doi: bestMatch.externalIds?.DOI || undefined,
      };
    } catch (error) {
      // Handle rate limiting (429) with retry
      if (error.response?.status === 429 && retries > 0) {
        const waitTime = 3000 * (3 - retries); // 3s, 6s
        this.logger.warn(`Rate limited (429). Retrying in ${waitTime / 1000}s... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.searchPaperByMetadata(title, authors, year, retries - 1);
      }
      
      this.logger.error(`Search failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get references for a paper using its paperId (from search result)
   */
  async getReferencesByPaperId(paperId: string): Promise<PaperMetadata['references']> {
    this.logger.log(`Fetching references for paperId: ${paperId}`);

    try {
      const fields = 'references.title,references.authors,references.year,references.externalIds,references.isInfluential';
      const response = await axios.get(`${this.semanticScholarBaseUrl}/${paperId}`, {
        params: { fields },
        timeout: 15000,
        headers: { 
          'User-Agent': 'LiteratureReviewApp/1.0 (mailto:support@example.com)',
          ...this.getSemanticScholarHeaders(),
        },
      });

      const refs = response.data.references?.map((ref: any) => ({
        title: ref.title || '',
        authors: ref.authors?.map((a: any) => a.name).join(', ') || '',
        year: ref.year || null,
        doi: ref.externalIds?.DOI || '',
        isInfluential: ref.isInfluential || false,
      })) || [];

      this.logger.log(`✅ Found ${refs.length} references`);
      return refs;
    } catch (error) {
      this.logger.error(`Failed to fetch references by paperId: ${error.message}`);
      return [];
    }
  }

  /**
   * Use AI to find DOI based on paper metadata (title, authors, year)
   * This can help bypass rate limits when Semantic Scholar search is rate-limited
   */
  async findDoiWithAI(title: string, authors?: string, year?: number): Promise<string | null> {
    if (!this.genAI) {
      this.logger.warn('Gemini AI not initialized');
      return null;
    }

    try {
      this.logger.log(`🤖 Using AI to find DOI for: "${title.substring(0, 50)}..."`);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      const prompt = `You are a research paper metadata expert. Given the following paper information, find and return ONLY the DOI (Digital Object Identifier) in the exact format "10.xxxx/xxxxx".

Paper Information:
- Title: ${title}
${authors ? `- Authors: ${authors}` : ''}
${year ? `- Publication Year: ${year}` : ''}

Instructions:
1. Based on the title, authors, and year, identify the correct DOI for this paper
2. Return ONLY the DOI string in format "10.xxxx/xxxxx" (e.g., "10.1109/CVPR.2016.90")
3. If you cannot confidently determine the DOI, return "NOT_FOUND"
4. Do NOT include any explanations, just the DOI or "NOT_FOUND"

DOI:`;

      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();
      
      this.logger.log(`AI response: ${response}`);

      // Validate DOI format
      if (response === 'NOT_FOUND' || !response.match(/^10\.\d{4,}/)) {
        this.logger.warn('AI could not find valid DOI');
        return null;
      }

      this.logger.log(`✅ AI found DOI: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`AI DOI finding failed: ${error.message}`);
      return null;
    }
  }
}
