# 📚 Auto-fill Paper Metadata từ DOI/URL

## Tổng quan

Người dùng nhập DOI hoặc URL → Hệ thống tự động lấy metadata → Điền sẵn form

---

## Architecture

```
Frontend                Backend                 External APIs
   │                       │                          │
   │  1. Input DOI         │                          │
   ├──────────────────────>│                          │
   │                       │  2. Parse DOI/URL        │
   │                       │  3. Call API             │
   │                       ├─────────────────────────>│
   │                       │                          │ Crossref API
   │                       │<─────────────────────────┤ (DOI → Metadata)
   │                       │  4. Extract metadata     │
   │  5. Return data       │                          │ Semantic Scholar
   │<──────────────────────┤                          │ (URL → Metadata)
   │  6. Fill form         │                          │
```

---

## API Sources

### 1. **Crossref API** (Miễn phí, không cần API key)
- **Input**: DOI (e.g., `10.1234/example`)
- **Endpoint**: `https://api.crossref.org/works/{doi}`
- **Output**: Title, authors, journal, year, abstract, etc.
- **Rate limit**: Unlimited with polite pool

### 2. **Semantic Scholar API** (Miễn phí, không cần key)
- **Input**: DOI, URL, ArXiv ID
- **Endpoint**: `https://api.semanticscholar.org/v1/paper/{identifier}`
- **Output**: Title, authors, abstract, citations, references
- **Rate limit**: 100 req/5min

### 3. **OpenAlex API** (Miễn phí, open source)
- **Input**: DOI, URL
- **Endpoint**: `https://api.openalex.org/works/doi:{doi}`
- **Output**: Comprehensive metadata
- **Rate limit**: 100,000 req/day

---

## Backend Implementation

### Step 1: Tạo Paper Metadata Service

```bash
cd backend/src/modules/papers
nest g service paper-metadata
```

#### File: `paper-metadata.service.ts`

```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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
  private readonly crossrefBaseUrl = 'https://api.crossref.org/works';
  private readonly semanticScholarBaseUrl = 'https://api.semanticscholar.org/v1/paper';
  
  /**
   * Extract metadata from DOI or URL
   */
  async extractMetadata(input: string): Promise<PaperMetadata> {
    // Detect input type
    const type = this.detectInputType(input);
    
    switch (type) {
      case 'doi':
        return this.fetchFromDOI(input);
      case 'url':
        return this.fetchFromURL(input);
      default:
        throw new HttpException(
          'Invalid input. Please provide a valid DOI or URL',
          HttpStatus.BAD_REQUEST
        );
    }
  }
  
  /**
   * Detect if input is DOI or URL
   */
  private detectInputType(input: string): 'doi' | 'url' | 'unknown' {
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
    
    try {
      const response = await axios.get(`${this.crossrefBaseUrl}/${doi}`, {
        headers: {
          'User-Agent': 'LiteratureReviewApp/1.0 (mailto:your-email@example.com)',
        },
      });
      
      const data = response.data.message;
      
      return this.mapCrossrefToMetadata(data, doi);
    } catch (error) {
      // Fallback to Semantic Scholar
      console.log('Crossref failed, trying Semantic Scholar...');
      return this.fetchFromSemanticScholar(doi);
    }
  }
  
  /**
   * Map Crossref response to our metadata format
   */
  private mapCrossrefToMetadata(data: any, doi: string): PaperMetadata {
    const authors = data.author
      ?.map((a: any) => `${a.given} ${a.family}`)
      .join(', ') || '';
    
    return {
      title: data.title?.[0] || '',
      authors,
      abstract: data.abstract || '',
      publicationYear: data.published?.['date-parts']?.[0]?.[0],
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
    try {
      const response = await axios.get(`${this.semanticScholarBaseUrl}/${identifier}`);
      const data = response.data;
      
      return this.mapSemanticScholarToMetadata(data);
    } catch (error) {
      throw new HttpException(
        'Unable to fetch paper metadata. Please enter details manually.',
        HttpStatus.NOT_FOUND
      );
    }
  }
  
  /**
   * Map Semantic Scholar response to our metadata format
   */
  private mapSemanticScholarToMetadata(data: any): PaperMetadata {
    const authors = data.authors
      ?.map((a: any) => a.name)
      .join(', ') || '';
    
    return {
      title: data.title || '',
      authors,
      abstract: data.abstract || '',
      publicationYear: data.year,
      journal: data.venue || '',
      doi: data.doi || '',
      url: data.url || '',
      keywords: data.fieldsOfStudy?.join(', ') || '',
    };
  }
  
  /**
   * Fetch metadata from URL (using Semantic Scholar)
   */
  private async fetchFromURL(url: string): Promise<PaperMetadata> {
    // Extract DOI from URL if possible
    const doiMatch = url.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
    if (doiMatch) {
      return this.fetchFromDOI(doiMatch[1]);
    }
    
    // Extract ArXiv ID
    const arxivMatch = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/i);
    if (arxivMatch) {
      return this.fetchFromSemanticScholar(`arXiv:${arxivMatch[1]}`);
    }
    
    // Try to fetch using the full URL
    try {
      return this.fetchFromSemanticScholar(url);
    } catch {
      throw new HttpException(
        'Unable to extract metadata from URL. Please try with DOI or enter details manually.',
        HttpStatus.NOT_FOUND
      );
    }
  }
}
```

---

### Step 2: Thêm DTO

#### File: `extract-metadata.dto.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtractMetadataDto {
  @ApiProperty({
    description: 'DOI or URL of the paper',
    example: '10.1038/nature12373',
  })
  @IsString()
  @IsNotEmpty()
  input: string;
}
```

---

### Step 3: Thêm endpoint vào Controller

#### File: `papers.controller.ts`

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaperMetadataService } from './paper-metadata.service';
import { ExtractMetadataDto } from './dto/extract-metadata.dto';

@ApiTags('Papers')
@Controller('papers')
export class PapersController {
  constructor(
    private readonly paperMetadataService: PaperMetadataService,
  ) {}

  @Post('extract-metadata')
  @ApiOperation({ summary: 'Extract paper metadata from DOI or URL' })
  @ApiResponse({ status: 200, description: 'Metadata extracted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid DOI or URL' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async extractMetadata(@Body() dto: ExtractMetadataDto) {
    return await this.paperMetadataService.extractMetadata(dto.input);
  }
}
```

---

### Step 4: Update Module

#### File: `papers.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './paper.entity';
import { PapersService } from './papers.service';
import { PapersController } from './papers.controller';
import { PaperMetadataService } from './paper-metadata.service';  // ADD
import { Tag } from '../tags/tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Paper, Tag])],
  controllers: [PapersController],
  providers: [
    PapersService,
    PaperMetadataService,  // ADD
  ],
  exports: [PapersService],
})
export class PapersModule {}
```

---

### Step 5: Install Axios (nếu chưa có)

```bash
cd backend
npm install axios
npm install --save-dev @types/axios
```

---

## Frontend Implementation

### Step 1: Tạo Service

#### File: `frontend/src/services/paper-metadata.service.ts`

```typescript
import axiosInstance from './api';
import { CreatePaperData } from '@/types';

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
  extractMetadata: async (input: string): Promise<ExtractedMetadata> => {
    const response = await axiosInstance.post<ExtractedMetadata>(
      '/papers/extract-metadata',
      { input }
    );
    return response.data;
  },
};
```

---

### Step 2: Enhanced Paper Form với Auto-fill

#### File: `PaperFormPage.tsx` (Update)

```typescript
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import { paperMetadataService } from '@/services/paper-metadata.service';
import toast from 'react-hot-toast';

export const PaperFormPage: React.FC = () => {
  const [doiInput, setDoiInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    abstract: '',
    publicationYear: '',
    journal: '',
    volume: '',
    issue: '',
    pages: '',
    doi: '',
    url: '',
    keywords: '',
  });

  const handleExtractMetadata = async () => {
    if (!doiInput.trim()) {
      toast.error('Please enter a DOI or URL');
      return;
    }

    setExtracting(true);
    try {
      const metadata = await paperMetadataService.extractMetadata(doiInput);
      
      // Fill form with extracted metadata
      setFormData({
        title: metadata.title || '',
        authors: metadata.authors || '',
        abstract: metadata.abstract || '',
        publicationYear: metadata.publicationYear?.toString() || '',
        journal: metadata.journal || '',
        volume: metadata.volume || '',
        issue: metadata.issue || '',
        pages: metadata.pages || '',
        doi: metadata.doi || '',
        url: metadata.url || '',
        keywords: metadata.keywords || '',
      });
      
      toast.success('Metadata extracted successfully!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to extract metadata';
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Box>
      {/* Auto-fill Section */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Quick Import:</strong> Enter a DOI or URL to automatically fill in paper details
      </Alert>

      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="DOI or URL"
          placeholder="10.1038/nature12373 or https://doi.org/10.1038/nature12373"
          value={doiInput}
          onChange={(e) => setDoiInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleExtractMetadata()}
          disabled={extracting}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {doiInput && (
                  <Tooltip title="Clear">
                    <IconButton
                      onClick={() => setDoiInput('')}
                      edge="end"
                      size="small"
                    >
                      <Clear />
                    </IconButton>
                  </Tooltip>
                )}
              </InputAdornment>
            ),
          }}
        />
        
        <Button
          variant="contained"
          onClick={handleExtractMetadata}
          disabled={extracting || !doiInput.trim()}
          startIcon={extracting ? <CircularProgress size={20} /> : <Search />}
          sx={{ minWidth: 150 }}
        >
          {extracting ? 'Extracting...' : 'Auto-fill'}
        </Button>
      </Box>

      {/* Regular Form Fields */}
      <TextField
        fullWidth
        label="Title *"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        margin="normal"
      />
      
      <TextField
        fullWidth
        label="Authors *"
        value={formData.authors}
        onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
        margin="normal"
        helperText="Comma-separated (e.g., John Doe, Jane Smith)"
      />
      
      {/* ... rest of form fields ... */}
    </Box>
  );
};
```

---

## Example Usage

### Example 1: Using DOI

```
Input: 10.1038/nature12373
Output:
{
  "title": "Structure of a conserved archaeal DNA polymerase",
  "authors": "John Smith, Jane Doe",
  "abstract": "DNA polymerases are essential...",
  "publicationYear": 2013,
  "journal": "Nature",
  "volume": "502",
  "pages": "45-50",
  "doi": "10.1038/nature12373",
  "url": "https://doi.org/10.1038/nature12373"
}
```

### Example 2: Using DOI URL

```
Input: https://doi.org/10.1038/nature12373
Output: (same as above)
```

### Example 3: Using ArXiv URL

```
Input: https://arxiv.org/abs/2103.12345
Output:
{
  "title": "Attention Is All You Need",
  "authors": "Ashish Vaswani, Noam Shazeer, ...",
  ...
}
```

---

## Testing

### Test the backend endpoint:

```bash
# Using curl
curl -X POST http://localhost:3000/api/v1/papers/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{"input": "10.1038/nature12373"}'

# Using Swagger UI
http://localhost:3000/api/docs
```

---

## Enhanced Features (Optional)

### 1. **Batch Import từ file**

```typescript
@Post('batch-import')
async batchImport(@Body() dto: { dois: string[] }) {
  const results = await Promise.all(
    dto.dois.map(doi => 
      this.paperMetadataService.extractMetadata(doi)
        .catch(err => ({ error: err.message, doi }))
    )
  );
  return results;
}
```

### 2. **Cache metadata để tránh duplicate requests**

```typescript
import { Cache } from 'cache-manager';

@Injectable()
export class PaperMetadataService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  
  async extractMetadata(input: string): Promise<PaperMetadata> {
    const cacheKey = `metadata:${input}`;
    
    // Check cache
    const cached = await this.cacheManager.get<PaperMetadata>(cacheKey);
    if (cached) return cached;
    
    // Fetch and cache
    const metadata = await this.fetchMetadata(input);
    await this.cacheManager.set(cacheKey, metadata, { ttl: 3600 }); // 1 hour
    
    return metadata;
  }
}
```

### 3. **Progress indicator cho multiple papers**

```typescript
const [progress, setProgress] = useState({ current: 0, total: 0 });

const handleBatchImport = async (dois: string[]) => {
  setProgress({ current: 0, total: dois.length });
  
  for (let i = 0; i < dois.length; i++) {
    await paperMetadataService.extractMetadata(dois[i]);
    setProgress({ current: i + 1, total: dois.length });
  }
};
```

---

## API Rate Limits & Best Practices

### Crossref (Recommended)
- **Polite pool**: Add email to User-Agent
- **Rate limit**: Unlimited (with polite pool)
- **Example**: `User-Agent: YourApp/1.0 (mailto:your@email.com)`

### Semantic Scholar
- **Rate limit**: 100 requests per 5 minutes
- **Need**: Partner API key for higher limits
- **Best for**: Computer science papers

### OpenAlex
- **Rate limit**: 100,000 req/day
- **No API key needed**
- **Best for**: Comprehensive coverage

---

## Error Handling

```typescript
try {
  const metadata = await extractMetadata(doi);
} catch (error) {
  if (error.status === 404) {
    // Paper not found
    toast.error('Paper not found. Please enter details manually.');
  } else if (error.status === 429) {
    // Rate limit
    toast.error('Too many requests. Please wait a moment.');
  } else {
    // Other errors
    toast.error('Failed to fetch metadata. Please try again.');
  }
}
```

---

## Summary

✅ **Backend**: Service + Controller + DTO  
✅ **Frontend**: Service + Enhanced Form với Auto-fill button  
✅ **APIs**: Crossref (primary) + Semantic Scholar (fallback)  
✅ **Features**: DOI, DOI URL, ArXiv URL support  
✅ **UX**: Loading states, error handling, toast notifications  

Bạn có thể bắt đầu implement từng bước. Tôi sẵn sàng hỗ trợ code chi tiết hơn nếu cần!
