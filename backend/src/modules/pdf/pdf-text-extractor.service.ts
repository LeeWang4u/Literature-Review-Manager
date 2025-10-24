import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';

@Injectable()
export class PdfTextExtractorService {
  private readonly logger = new Logger(PdfTextExtractorService.name);

  /**
   * Extract text from PDF file
   */
  async extractText(filePath: string): Promise<string> {
    try {
      this.logger.log(`📄 Extracting text from PDF: ${filePath}`);
      
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      // Clean up extracted text
      const cleanText = data.text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n+/g, '\n') // Normalize line breaks
        .trim();
      
      this.logger.log(`✅ Extracted ${cleanText.length} characters from PDF (${data.numpages} pages)`);
      return cleanText;
    } catch (error) {
      this.logger.error(`❌ Failed to extract text from PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract text with metadata
   */
  async extractWithMetadata(filePath: string): Promise<{
    text: string;
    numPages: number;
    info: any;
  }> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        text: data.text.replace(/\s+/g, ' ').trim(),
        numPages: data.numpages,
        info: data.info,
      };
    } catch (error) {
      this.logger.error(`Failed to extract PDF metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Truncate text to fit token limits (for AI models)
   */
  truncateText(text: string, maxTokens: number = 8000): string {
    // Rough estimate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    
    if (text.length <= maxChars) {
      return text;
    }
    
    this.logger.log(`✂️ Truncating text from ${text.length} to ~${maxChars} characters`);
    
    // Take first 60% and last 20% to preserve intro and conclusion
    const firstPart = text.substring(0, Math.floor(maxChars * 0.6));
    const lastPart = text.substring(text.length - Math.floor(maxChars * 0.2));
    
    return `${firstPart}\n\n[... Middle section truncated for brevity ...]\n\n${lastPart}`;
  }
}
