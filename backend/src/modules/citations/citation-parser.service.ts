import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

export interface ParsedCitation {
  authors: string;
  year: number | null;
  title: string;
  journal?: string;
  volume?: string;
  pages?: string;
  doi?: string;
  confidence: number; // 0-1 score của AI về độ chính xác parse
  rawCitation: string;
}

@Injectable()
export class CitationParserService {
  private readonly logger = new Logger(CitationParserService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-lite',
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent parsing
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });
      this.logger.log('✅ Citation Parser AI initialized with Gemini 2.0 Flash Lite');
    } else {
      this.logger.warn('⚠️ GEMINI_API_KEY not configured - citation parsing will be basic');
    }
  }

  /**
   * Parse a single citation string using AI
   */
  async parseCitation(citationString: string): Promise<ParsedCitation> {
    if (!this.model) {
      return this.basicParse(citationString);
    }

    try {
      const prompt = `You are a precise citation parser. Extract structured information from the following citation string.

CITATION STRING:
"${citationString}"

INSTRUCTIONS:
1. Identify the authors (all author names, format: "FirstName LastName, FirstName LastName")
2. Extract publication year (4-digit number, typically in parentheses or after comma)
3. Extract the article/paper title (usually the longest text segment, may be in quotes)
4. Extract journal name if present
5. Extract volume, issue, and page numbers if present
6. Extract DOI if present (format: 10.xxxx/xxxxx)
7. Provide a confidence score (0.0-1.0) based on how complete and clear the citation is

IMPORTANT RULES:
- If citation starts with [N] or N., remove the number prefix
- Authors come BEFORE the year
- Title is usually between authors/year and journal name
- Year is typically 4 digits between 1900-2025
- If a field is not found, return null or empty string
- Be precise - don't guess or hallucinate data

OUTPUT FORMAT (JSON only, no other text):
{
  "authors": "Author names separated by comma",
  "year": 2024,
  "title": "Exact title text",
  "journal": "Journal name or null",
  "volume": "Volume number or null",
  "pages": "Page range or null",
  "doi": "DOI or null",
  "confidence": 0.95
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response (remove markdown code blocks if present)
      let jsonText = response.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonText);
      
      return {
        authors: parsed.authors || '',
        year: parsed.year || null,
        title: parsed.title || citationString,
        journal: parsed.journal || undefined,
        volume: parsed.volume || undefined,
        pages: parsed.pages || undefined,
        doi: parsed.doi || undefined,
        confidence: parsed.confidence || 0.5,
        rawCitation: citationString,
      };
      
    } catch (error) {
      this.logger.warn(`AI parsing failed for citation: ${error.message}`);
      return this.basicParse(citationString);
    }
  }

  /**
   * Fallback basic parsing without AI
   */
  private basicParse(citationString: string): ParsedCitation {
    let cleanCitation = citationString.trim();
    
    // Remove citation number prefix [9] or 9.
    cleanCitation = cleanCitation.replace(/^\[\d+\]\s*/, '').replace(/^\d+\.\s*/, '');
    
    let authors = '';
    let year: number | null = null;
    let title = cleanCitation;
    let doi: string | undefined;
    
    // Extract DOI
    const doiMatch = cleanCitation.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/);
    if (doiMatch) {
      doi = doiMatch[1];
    }
    
    // Extract year - try multiple patterns
    const yearPatterns = [
      /\((\d{4})\)/,           // (2024)
      /,\s*(\d{4})[,\.\s]/,    // , 2024, or . 2024.
      /\b(\d{4})\b/            // standalone 4-digit
    ];
    
    for (const pattern of yearPatterns) {
      const yearMatch = cleanCitation.match(pattern);
      if (yearMatch) {
        const extractedYear = parseInt(yearMatch[1]);
        if (extractedYear >= 1900 && extractedYear <= 2025) {
          year = extractedYear;
          break;
        }
      }
    }
    
    // Try to extract authors (text before first comma or year)
    if (year) {
      const beforeYear = cleanCitation.split(String(year))[0];
      const authorMatch = beforeYear.match(/^([^,]+)/);
      if (authorMatch) {
        authors = authorMatch[1].trim();
      }
    } else {
      const firstComma = cleanCitation.indexOf(',');
      if (firstComma > 0 && firstComma < 100) {
        authors = cleanCitation.substring(0, firstComma).trim();
      }
    }
    
    // Try to extract title (usually between authors and journal)
    const parts = cleanCitation.split(',');
    if (parts.length >= 2) {
      // Skip first part (authors), take second part as potential title
      let titlePart = parts[1].trim();
      // Remove year if it's in the title part
      if (year) {
        titlePart = titlePart.replace(`(${year})`, '').replace(String(year), '').trim();
      }
      if (titlePart.length > 10) {
        title = titlePart;
      }
    }
    
    return {
      authors: authors || 'Unknown',
      year,
      title: title || cleanCitation,
      doi,
      confidence: 0.3, // Low confidence for basic parsing
      rawCitation: citationString,
    };
  }

  /**
   * Batch parse multiple citations
   */
  async parseCitations(citations: string[]): Promise<ParsedCitation[]> {
    const results: ParsedCitation[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < citations.length; i += batchSize) {
      const batch = citations.slice(i, i + batchSize);
      const batchPromises = batch.map(c => this.parseCitation(c));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Log progress
      this.logger.log(`Parsed ${Math.min(i + batchSize, citations.length)}/${citations.length} citations`);
      
      // Small delay between batches
      if (i + batchSize < citations.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  /**
   * Generate citation context note from parsed citation
   */
  generateCitationNote(parsed: ParsedCitation, citingPaperTitle: string): string {
    const authorsPart = parsed.authors || 'Unknown authors';
    const yearPart = parsed.year ? ` (${parsed.year})` : '';
    const journalPart = parsed.journal ? ` in ${parsed.journal}` : '';
    
    return `📚 **Reference from:** ${citingPaperTitle}

**Citation:**
${authorsPart}${yearPart}. "${parsed.title}"${journalPart}

**Parsing Confidence:** ${(parsed.confidence * 100).toFixed(0)}%

**Raw Citation:**
${parsed.rawCitation}

---
*Note: This note was automatically generated from citation parsing. You can edit it to add your own insights.*`;
  }
}
