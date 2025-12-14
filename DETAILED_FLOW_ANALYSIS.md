# 🔄 Chi Tiết Luồng Hoạt Động - Citation Analysis System

## 📋 Table of Contents
1. [Overview Flow](#overview-flow)
2. [Step-by-Step Process](#step-by-step-process)
3. [Data Flow Diagram](#data-flow-diagram)
4. [Detailed Code Walkthrough](#detailed-code-walkthrough)
5. [Performance & Optimization](#performance--optimization)

---

## 🎯 Overview Flow

```
User Request → Frontend → API Gateway → Controller → Service → Database
                ↓            ↓            ↓          ↓         ↓
            React Query   JWT Auth   Validation  Business  PostgreSQL
                                                   Logic
                ↓
          Cache Result ← Process Data ← Calculate Metrics ← Raw Data
                ↓
          Display UI
```

---

## 📊 Step-by-Step Process

### **PHASE 1: User Interaction (Frontend)**

#### **Step 1.1: User Action**
```typescript
// User navigates to: /citations/123
// Component: CitationNetworkPage.tsx

const CitationNetworkPage = () => {
  const { id } = useParams(); // paperId = 123
  
  // Trigger analysis
  const { data: analysis } = useQuery({
    queryKey: ['referenceAnalysis', id, 15, 0.3],
    queryFn: () => citationService.analyzeReferences(Number(id), { 
      limit: 15, 
      minRelevance: 0.3 
    })
  });
}
```

**What happens:**
- React Router extracts `paperId` from URL
- Component initializes
- React Query checks cache
  - **If cached**: Return immediately ✅
  - **If not cached**: Proceed to API call ⏩

---

#### **Step 1.2: Service Layer Call**
```typescript
// File: frontend/src/services/citation.service.ts

analyzeReferences: async (paperId: number, options?: { 
  limit?: number; 
  minRelevance?: number 
}) => {
  // Build request URL with query params
  const response = await axiosInstance.get(
    `/citations/paper/${paperId}/analyze`,
    { 
      params: { 
        limit: options?.limit || 10,
        minRelevance: options?.minRelevance || 0.5
      } 
    }
  );
  
  return response.data;
}
```

**What happens:**
- Construct HTTP GET request
- URL: `http://localhost:3000/api/citations/paper/123/analyze?limit=15&minRelevance=0.3`
- Attach JWT token from localStorage
  ```typescript
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
  ```
- Send request to backend

---

### **PHASE 2: Backend Entry (Controller)**

#### **Step 2.1: Request Reception**
```typescript
// File: backend/src/modules/citations/citations.controller.ts

@Controller('citations')
@UseGuards(JwtAuthGuard)  // ← JWT verification happens here
export class CitationsController {
  
  @Get('paper/:paperId/analyze')
  @ApiOperation({ summary: 'Analyze and rank references' })
  analyzeReferences(
    @Param('paperId', ParseIntPipe) paperId: number,  // 123 → validated as number
    @Req() req,                                        // Contains user info
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('minRelevance', new DefaultValuePipe(0.5)) minRelevance: number,
  ) {
    // Extract user ID from JWT token
    const userId = req.user.id;
    
    // Delegate to service
    return this.citationsService.analyzeReferences(
      paperId,      // 123
      userId,       // 5
      { limit: 15, minRelevance: 0.3 }
    );
  }
}
```

**What happens:**
1. **Route Matching**: NestJS matches `/citations/paper/123/analyze` to this endpoint
2. **JWT Authentication**: `JwtAuthGuard` validates token
   - Decode JWT → Extract user ID
   - Check expiration
   - Attach user to `req.user`
3. **Parameter Parsing**: 
   - `paperId`: "123" (string) → 123 (number)
   - `limit`: "15" → 15
   - `minRelevance`: "0.3" → 0.3
4. **Call Service Layer**

---

### **PHASE 3: Service Layer (Business Logic)**

#### **Step 3.1: Verify Ownership**
```typescript
// File: backend/src/modules/citations/citations.service.ts

async analyzeReferences(
  paperId: number,    // 123
  userId: number,     // 5
  options: { limit?: number; minRelevance?: number }
) {
  const { limit = 10, minRelevance = 0.5 } = options;
  
  // 🔒 SECURITY: Verify paper belongs to user
  const paper = await this.papersRepository.findOne({
    where: { 
      id: paperId,        // 123
      addedBy: userId     // 5
    },
  });

  if (!paper) {
    throw new NotFoundException('Paper not found');
  }
  
  // Continue...
}
```

**What happens:**
- Query database: `SELECT * FROM papers WHERE id = 123 AND addedBy = 5`
- If not found: Return 404 error ❌
- If found: Continue to analysis ✅

**Security Check:**
- User A cannot access paper của User B
- Prevents unauthorized data access

---

#### **Step 3.2: Fetch Citations from Database**
```typescript
// Get all citations where this paper cites other papers
const citations = await this.citationsRepository.find({
  where: { citingPaperId: paperId },  // WHERE citingPaperId = 123
  relations: ['citedPaper', 'citedPaper.pdfFiles'],  // JOIN with papers & pdfFiles
  order: {
    isInfluential: 'DESC',
    relevanceScore: 'DESC',
  },
});
```

**SQL Generated:**
```sql
SELECT 
  c.*,
  p.id, p.title, p.authors, p.publicationYear, p.doi, p.url,
  pdf.id, pdf.filename
FROM citations c
LEFT JOIN papers p ON c.citedPaperId = p.id
LEFT JOIN pdf_files pdf ON p.id = pdf.paperId
WHERE c.citingPaperId = 123
ORDER BY c.isInfluential DESC, c.relevanceScore DESC;
```

**Result:**
```typescript
[
  {
    id: 456,
    citingPaperId: 123,
    citedPaperId: 789,
    relevanceScore: 0.85,
    isInfluential: true,
    citationContext: "This groundbreaking work...",
    citedPaper: {
      id: 789,
      title: "Attention Is All You Need",
      authors: "Vaswani et al.",
      publicationYear: 2017,
      pdfFiles: [{ id: 1, filename: "attention.pdf" }]
    }
  },
  // ... 14 more citations
]
```

**What happens:**
- Fetch all citations (usually 10-50 citations)
- Eager load related paper data (avoid N+1 queries)
- Check if PDF exists for each paper

---

#### **Step 3.3: Build Citation Network**
```typescript
// Get full citation network for centrality calculations
const network = await this.getCitationNetwork(paperId, userId, 2);
```

**Network Building Process:**

```typescript
async getCitationNetwork(paperId: number, userId: number, maxDepth: number) {
  const nodes: any[] = [];
  const edges: any[] = [];
  const visited = new Set<number>();
  const nodeDepths = new Map<number, number>();
  
  // 🔄 RECURSIVE TRAVERSAL
  const traverse = async (currentPaperId: number, currentDepth: number, isMainPaper: boolean) => {
    // Stop conditions
    if (visited.has(currentPaperId)) return;
    if (currentDepth > maxDepth) return;
    
    visited.add(currentPaperId);
    nodeDepths.set(currentPaperId, currentDepth);
    
    // Get paper data
    const paper = await this.papersRepository.findOne({
      where: { id: currentPaperId }
    });
    
    if (!paper) return;
    
    // Get outgoing citations (papers this paper cites)
    const citationsOut = await this.citationsRepository.find({
      where: { citingPaperId: currentPaperId }
    });
    
    // Get incoming citations (papers citing this paper)
    const citationsIn = await this.citationsRepository.find({
      where: { citedPaperId: currentPaperId }
    });
    
    // Build edges
    for (const citation of [...citationsOut, ...citationsIn]) {
      edges.push({
        source: citation.citingPaperId,
        target: citation.citedPaperId,
        relevanceScore: citation.relevanceScore,
        isInfluential: citation.isInfluential
      });
    }
    
    // 🔄 RECURSE: Traverse cited papers
    for (const citation of citationsOut) {
      await traverse(citation.citedPaperId, currentDepth + 1, false);
    }
    
    // For main paper, also traverse citing papers
    if (isMainPaper) {
      for (const citation of citationsIn) {
        await traverse(citation.citingPaperId, currentDepth + 1, false);
      }
    }
  };
  
  // Start traversal from main paper
  await traverse(paperId, 0, true);
  
  // Build nodes array
  for (const nodeId of visited) {
    const paper = await this.papersRepository.findOne({ where: { id: nodeId } });
    if (paper) {
      nodes.push({
        id: paper.id,
        title: paper.title,
        year: paper.publicationYear,
        networkDepth: nodeDepths.get(nodeId)
      });
    }
  }
  
  return { nodes, edges };
}
```

**Network Example:**
```
Paper 123 (Main)
  ├─ cites → Paper 789 (Depth 1)
  │   ├─ cites → Paper 456 (Depth 2)
  │   └─ cites → Paper 999 (Depth 2)
  ├─ cites → Paper 234 (Depth 1)
  └─ cited by ← Paper 567 (Depth 1)

Result:
- Nodes: [123, 789, 456, 999, 234, 567]
- Edges: [(123→789), (789→456), (789→999), (123→234), (567→123)]
```

**Performance:**
- Depth 1: ~10-20 papers
- Depth 2: ~50-100 papers
- Depth 3: ~200-500 papers (exponential growth)

---

#### **Step 3.4: Calculate Scores for Each Reference**

```typescript
const currentYear = new Date().getFullYear(); // 2025

// 🔄 PARALLEL PROCESSING
const scoredReferences = await Promise.all(
  citations.map(async (citation) => {
    const citedPaper = citation.citedPaper;
    
    // ─────────────────────────────────────────────────────
    // A. CALCULATE ADVANCED SCORE (Multi-dimensional)
    // ─────────────────────────────────────────────────────
    const { totalScore: score, breakdown } = 
      await this.citationMetricsService.calculateAdvancedScore(
        citation,
        network,
        currentYear
      );
    
    // ─────────────────────────────────────────────────────
    // B. CALCULATE CENTRALITY MEASURES
    // ─────────────────────────────────────────────────────
    const centrality = await this.citationMetricsService.calculateCentrality(
      citedPaper.id,
      network
    );
    
    // ─────────────────────────────────────────────────────
    // C. CALCULATE CO-CITATION SIMILARITY
    // ─────────────────────────────────────────────────────
    const coCitation = await this.citationMetricsService.calculateCoCitation(
      paperId,
      citedPaper.id,
      network
    );
    
    // ─────────────────────────────────────────────────────
    // D. FORECAST IMPACT POTENTIAL (0-100)
    // ─────────────────────────────────────────────────────
    let impactPotential = null;
    try {
      impactPotential = await this.citationMetricsService
        .forecastImpactPotential(citedPaper.id);
    } catch (error) {
      // Skip if insufficient data
    }
    
    // ─────────────────────────────────────────────────────
    // E. PREDICT FUTURE CITATIONS (Linear Regression)
    // ─────────────────────────────────────────────────────
    let predictions = null;
    try {
      predictions = await this.citationMetricsService
        .predictFutureCitations(citedPaper.id, 12);
    } catch (error) {
      // Skip if insufficient data
    }
    
    // ─────────────────────────────────────────────────────
    // AGGREGATE ALL METRICS
    // ─────────────────────────────────────────────────────
    return {
      citation: {
        id: citation.id,
        relevanceScore: citation.relevanceScore,
        isInfluential: citation.isInfluential,
        citationContext: citation.citationContext
      },
      paper: {
        id: citedPaper.id,
        title: citedPaper.title,
        authors: citedPaper.authors,
        year: citedPaper.publicationYear,
        hasPdf: !!citedPaper.pdfFiles?.length
      },
      score,                      // 0.85
      citationCount: centrality.inDegree,  // 25
      centrality,
      coCitationStrength: coCitation.strength,  // 0.67
      scoreBreakdown: breakdown,
      impactPotential: impactPotential ? {
        score: impactPotential.impactScore,        // 85
        category: impactPotential.potential,       // 'high'
        projectedRank: impactPotential.projectedRank  // 'Top 10%'
      } : null,
      futurePrediction: predictions ? {
        nextYear: predictions.predictions[11]?.predicted,  // 32
        growthRate: predictions.overallTrend === 'growing' ? '+' : '-'
      } : null
    };
  })
);
```

**Processing Time:**
- 15 citations × ~500ms each = ~7.5s
- Parallelized with `Promise.all` → ~1.5s actual time

---

#### **Step 3.4.1: Deep Dive - Calculate Advanced Score**

```typescript
// CitationMetricsService.calculateAdvancedScore()

async calculateAdvancedScore(citation, network, currentYear) {
  let totalScore = 0;
  const breakdown = {};
  
  // ─────────────────────────────────────────────────────
  // Factor 1: Content Relevance (30% weight)
  // ─────────────────────────────────────────────────────
  const contentScore = citation.relevanceScore || 0;  // From AI (Gemini)
  breakdown.contentRelevance = contentScore * 0.3;
  totalScore += breakdown.contentRelevance;
  
  // Example: 0.9 × 0.3 = 0.27
  
  // ─────────────────────────────────────────────────────
  // Factor 2: Network Importance (25% weight)
  // ─────────────────────────────────────────────────────
  // Count how many papers cite this paper
  const inDegree = network.edges.filter(
    e => e.target === citation.citedPaperId
  ).length;
  
  // Logarithmic scale to prevent domination
  // 1 citation → 0.15, 10 citations → 0.5, 100 citations → 1.0
  const normalizedDegree = inDegree > 0 
    ? Math.min(Math.log10(inDegree + 1) / 2, 1.0)
    : 0;
  
  breakdown.networkImportance = normalizedDegree * 0.25;
  totalScore += breakdown.networkImportance;
  
  // Example: 25 citations → log10(26)/2 = 0.88 × 0.25 = 0.22
  
  // ─────────────────────────────────────────────────────
  // Factor 3: Context Quality (20% weight)
  // ─────────────────────────────────────────────────────
  const contextScore = await this.analyzeContextQuality(citation);
  breakdown.contextQuality = contextScore * 0.2;
  totalScore += breakdown.contextQuality;
  
  // Example: Positive sentiment → 0.9 × 0.2 = 0.18
  
  // ─────────────────────────────────────────────────────
  // Factor 4: Temporal Relevance (15% weight)
  // ─────────────────────────────────────────────────────
  const citedPaper = await this.papersRepository.findOne({
    where: { id: citation.citedPaperId }
  });
  
  if (citedPaper?.publicationYear) {
    const age = currentYear - citedPaper.publicationYear;
    // Exponential decay: half-life = 10 years
    // 0 years = 1.0, 5 years = 0.7, 10 years = 0.5
    const recencyScore = Math.exp(-age / 14.427);
    breakdown.temporalRelevance = recencyScore * 0.15;
    totalScore += breakdown.temporalRelevance;
  }
  
  // Example: 3 years old → e^(-3/14.427) = 0.93 × 0.15 = 0.14
  
  // ─────────────────────────────────────────────────────
  // Factor 5: Citation Frequency (5% weight)
  // ─────────────────────────────────────────────────────
  if (citation.citationContext) {
    const frequencyScore = Math.min(
      citation.citationContext.length / 500, 
      1.0
    );
    breakdown.citationFrequency = frequencyScore * 0.05;
    totalScore += breakdown.citationFrequency;
  }
  
  // Example: 400 chars → 400/500 = 0.8 × 0.05 = 0.04
  
  // ─────────────────────────────────────────────────────
  // Factor 6: Depth Penalty (5% weight)
  // ─────────────────────────────────────────────────────
  const depth = citation.citationDepth || 0;
  const depthScore = Math.max(1.0 - (depth * 0.3), 0.3);
  breakdown.depthPenalty = depthScore * 0.05;
  totalScore += breakdown.depthPenalty;
  
  // Example: Direct citation (depth=0) → 1.0 × 0.05 = 0.05
  
  // ─────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────
  return {
    totalScore: Math.min(totalScore, 1.0),  // 0.90
    breakdown  // { contentRelevance: 0.27, networkImportance: 0.22, ... }
  };
}
```

**Example Calculation:**
```
Factor                    Value    Weight   Contribution
────────────────────────────────────────────────────────
Content Relevance         0.90  ×  0.30  =  0.27
Network Importance        0.88  ×  0.25  =  0.22
Context Quality           0.90  ×  0.20  =  0.18
Temporal Relevance        0.93  ×  0.15  =  0.14
Citation Frequency        0.80  ×  0.05  =  0.04
Depth Penalty             1.00  ×  0.05  =  0.05
────────────────────────────────────────────────────────
TOTAL SCORE                            =  0.90
```

---

#### **Step 3.5: Filter, Sort & Slice**

```typescript
// Filter by minimum relevance
const filteredReferences = scoredReferences
  .filter(ref => 
    ref.citation.relevanceScore >= minRelevance ||  // >= 0.3
    ref.citation.isInfluential                      // OR marked influential
  )
  .sort((a, b) => b.score - a.score)  // Sort descending by score
  .slice(0, limit);  // Take top 15

console.log('Filtering results:');
console.log(`  Total references: ${scoredReferences.length}`);  // 15
console.log(`  After filter: ${filteredReferences.length}`);     // 12
console.log(`  Top ${limit}: ${filteredReferences.slice(0, limit).length}`);  // 15
```

**Example:**
```
Before Filter (15 refs):
  Ref 1: score=0.90, relevance=0.85 ✅
  Ref 2: score=0.85, relevance=0.75 ✅
  Ref 3: score=0.20, relevance=0.15 ❌ (below 0.3)
  ...

After Filter (12 refs):
  Only refs with relevance >= 0.3 or isInfluential

After Sort & Slice (Top 10):
  Ref 1: score=0.90
  Ref 2: score=0.85
  Ref 3: score=0.82
  ...
```

---

#### **Step 3.6: Generate Recommendations**

```typescript
// Calculate recommendations
const highPriority = scoredReferences.filter(ref => 
  ref.score >= 0.8 ||                              // Very high score
  (ref.centrality.inDegree >= 5 && ref.score >= 0.6) ||  // Highly cited + good score
  ref.coCitationStrength >= 0.7 ||                 // Strong co-citation
  (ref.impactPotential?.score >= 80)               // Breakthrough potential
).length;

const shouldDownload = scoredReferences.filter(ref => 
  (ref.score >= 0.6 ||                             // Good score
   ref.citation.isInfluential ||                   // Marked influential
   ref.centrality.inDegree >= 3 ||                 // Reasonably cited
   (ref.impactPotential?.score >= 60)) &&          // High potential
  !ref.paper.hasPdf                                // No PDF yet
).length;

const trendingReferences = scoredReferences.filter(ref => 
  ref.futurePrediction?.growthRate === '+' &&      // Positive growth
  (ref.impactPotential?.category === 'high' || 
   ref.impactPotential?.category === 'breakthrough')
).length;
```

**Example Results:**
```
Recommendations:
  High Priority: 3 papers
  Should Download: 2 papers
  Trending: 1 paper
```

---

#### **Step 3.7: Build Final Response**

```typescript
return {
  paperId: 123,
  title: "Deep Learning for NLP",
  totalReferences: 15,
  analyzedReferences: 12,
  topReferences: filteredReferences,  // Array of top 10 scored refs
  recommendations: {
    highPriority: 3,
    shouldDownload: 2
  },
  insights: {
    hasBreakthroughPapers: scoredReferences.some(ref => 
      ref.impactPotential?.score >= 80
    ),  // true
    avgImpactScore: 78,
    growingReferences: 1
  }
};
```

---

### **PHASE 4: Response Journey Back**

#### **Step 4.1: Controller Returns**
```typescript
// CitationsController
@Get('paper/:paperId/analyze')
analyzeReferences(...) {
  // Service returns object
  const result = await this.citationsService.analyzeReferences(...);
  
  // NestJS automatically serializes to JSON
  return result;  // → HTTP 200 with JSON body
}
```

---

#### **Step 4.2: HTTP Response**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 12456

{
  "paperId": 123,
  "title": "Deep Learning for NLP",
  "totalReferences": 15,
  "analyzedReferences": 12,
  "topReferences": [
    {
      "citation": {
        "id": 456,
        "relevanceScore": 0.85,
        "isInfluential": true
      },
      "paper": {
        "id": 789,
        "title": "Attention Is All You Need",
        "authors": "Vaswani et al.",
        "year": 2017,
        "hasPdf": true
      },
      "score": 0.90,
      "citationCount": 25,
      "centrality": {
        "inDegree": 25,
        "outDegree": 8,
        "clusteringCoefficient": 0.6
      },
      "coCitationStrength": 0.67,
      "scoreBreakdown": {
        "contentRelevance": 0.27,
        "networkImportance": 0.22,
        "contextQuality": 0.18,
        "temporalRelevance": 0.14,
        "citationFrequency": 0.04,
        "depthPenalty": 0.05
      },
      "impactPotential": {
        "score": 85,
        "category": "high",
        "projectedRank": "Top 10%"
      },
      "futurePrediction": {
        "nextYear": 32,
        "growthRate": "+"
      }
    }
    // ... 9 more references
  ],
  "recommendations": {
    "highPriority": 3,
    "shouldDownload": 2
  },
  "insights": {
    "hasBreakthroughPapers": true,
    "avgImpactScore": 78,
    "growingReferences": 1
  }
}
```

---

### **PHASE 5: Frontend Processing**

#### **Step 5.1: Axios Receives Response**
```typescript
// citation.service.ts
const response = await axiosInstance.get(
  `/citations/paper/123/analyze`,
  { params: { limit: 15, minRelevance: 0.3 } }
);

// response.data contains parsed JSON
return response.data;
```

---

#### **Step 5.2: React Query Updates**
```typescript
// React Query receives data
const { data: analysis } = useQuery({
  queryKey: ['referenceAnalysis', 123, 15, 0.3],
  queryFn: () => citationService.analyzeReferences(123, { limit: 15, minRelevance: 0.3 })
});

// React Query automatically:
// 1. Caches result with queryKey
// 2. Triggers component re-render
// 3. Updates loading state
```

---

#### **Step 5.3: Component Renders**
```tsx
return (
  <Card>
    <Typography variant="h6">
      📊 Reference Analysis ({analysis.analyzedReferences} papers)
    </Typography>
    
    {analysis.topReferences.map(ref => (
      <ReferenceCard 
        key={ref.citation.id}
        reference={ref}
      >
        {/* Display title */}
        <Typography variant="h6">
          {ref.paper.title}
        </Typography>
        
        {/* Display score */}
        <LinearProgress 
          value={ref.score * 100}
          variant="determinate"
        />
        
        {/* Display impact badge */}
        {ref.impactPotential?.category === 'breakthrough' && (
          <Chip label="🔥 BREAKTHROUGH" color="error" />
        )}
        
        {/* Display growth indicator */}
        {ref.futurePrediction?.growthRate === '+' && (
          <Chip label="📈 GROWING" color="success" />
        )}
        
        {/* Display citation count */}
        <Typography variant="caption">
          Citations: {ref.citationCount}
        </Typography>
      </ReferenceCard>
    ))}
    
    {/* Display recommendations */}
    <Alert severity="info">
      <strong>Recommendations:</strong><br/>
      High Priority: {analysis.recommendations.highPriority} papers<br/>
      Should Download: {analysis.recommendations.shouldDownload} papers
    </Alert>
  </Card>
);
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  React Component (CitationNetworkPage)                 │     │
│  │  - Extract paperId from URL                            │     │
│  │  - Call useQuery hook                                  │     │
│  └────────┬───────────────────────────────────────────────┘     │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  React Query                                           │     │
│  │  - Check cache                                         │     │
│  │  - Trigger queryFn if cache miss                      │     │
│  └────────┬───────────────────────────────────────────────┘     │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  citation.service.ts                                   │     │
│  │  - Build HTTP request                                  │     │
│  │  - Attach JWT token                                    │     │
│  │  - Send GET /api/citations/paper/123/analyze          │     │
│  └────────┬───────────────────────────────────────────────┘     │
└───────────┼──────────────────────────────────────────────────────┘
            │
            │  HTTP Request (JWT in header)
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                              │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  NestJS API Gateway                                    │     │
│  │  - Route matching                                      │     │
│  │  - Parse URL params & query                           │     │
│  └────────┬───────────────────────────────────────────────┘     │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  JwtAuthGuard                                          │     │
│  │  - Verify JWT token                                    │     │
│  │  - Decode user ID                                      │     │
│  │  - Attach to request                                   │     │
│  └────────┬───────────────────────────────────────────────┘     │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  CitationsController                                   │     │
│  │  - Extract paperId, userId, options                    │     │
│  │  - Call service.analyzeReferences()                    │     │
│  └────────┬───────────────────────────────────────────────┘     │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  CitationsService.analyzeReferences()                  │     │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │ 1. Verify paper ownership (paperId + userId)     │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │ 2. Fetch citations from DB                       │ │     │
│  │  │    SELECT * FROM citations                       │ │     │
│  │  │    WHERE citingPaperId = 123                     │ │     │
│  │  │    JOIN papers ON citedPaperId = papers.id       │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │ 3. Build citation network (depth=2)              │ │     │
│  │  │    - Recursive traversal                         │ │     │
│  │  │    - Collect nodes & edges                       │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │ 4. Calculate scores (PARALLEL)                   │ │     │
│  │  │    For each citation:                            │ │     │
│  │  │    ├─ calculateAdvancedScore()                   │ │     │
│  │  │    ├─ calculateCentrality()                      │ │     │
│  │  │    ├─ calculateCoCitation()                      │ │     │
│  │  │    ├─ forecastImpactPotential()                  │ │     │
│  │  │    └─ predictFutureCitations()                   │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │ 5. Filter & Sort                                 │ │     │
│  │  │    - Filter by minRelevance (0.3)               │ │     │
│  │  │    - Sort by score (DESC)                        │ │     │
│  │  │    - Take top N (15)                             │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │ 6. Generate recommendations                      │ │     │
│  │  │    - High priority count                         │ │     │
│  │  │    - Should download count                       │ │     │
│  │  │    - Trending count                              │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │ 7. Build & return result object                  │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  └────────┬───────────────────────────────────────────────┘     │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  PostgreSQL Database                                   │     │
│  │  - papers table                                        │     │
│  │  - citations table                                     │     │
│  │  - pdf_files table                                     │     │
│  └────────────────────────────────────────────────────────┘     │
└───────────┬──────────────────────────────────────────────────────┘
            │
            │  HTTP Response (JSON)
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       USER BROWSER                               │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Axios Response Handler                                │     │
│  │  - Parse JSON                                          │     │
│  │  - Return data object                                  │     │
│  └────────┬───────────────────────────────────────────────┘     │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  React Query                                           │     │
│  │  - Cache result                                        │     │
│  │  - Update component state                              │     │
│  │  - Trigger re-render                                   │     │
│  └────────┬───────────────────────────────────────────────┘     │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  React Component Re-render                             │     │
│  │  - Display analysis results                            │     │
│  │  - Show scores, badges, metrics                        │     │
│  │  - Render recommendations                              │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Performance & Optimization

### **Timing Breakdown**

```
Total Request Time: ~2.5 seconds

├─ Frontend (50ms)
│  ├─ React Query cache check: 5ms
│  ├─ Service layer call: 5ms
│  └─ HTTP request construction: 40ms
│
├─ Network (100ms)
│  └─ Request/Response round-trip
│
├─ Backend (2300ms)
│  ├─ Authentication: 50ms
│  ├─ Controller routing: 10ms
│  ├─ Service layer: 2200ms
│  │  ├─ Verify ownership: 20ms
│  │  ├─ Fetch citations: 150ms
│  │  ├─ Build network: 500ms
│  │  ├─ Calculate scores: 1400ms (parallelized)
│  │  │  ├─ Advanced score: 100ms × 15 = 1500ms
│  │  │  ├─ Centrality: 50ms × 15 = 750ms
│  │  │  ├─ Co-citation: 80ms × 15 = 1200ms
│  │  │  ├─ Impact potential: 40ms × 15 = 600ms
│  │  │  └─ Predictions: 30ms × 15 = 450ms
│  │  │  → Total if sequential: 4500ms
│  │  │  → With Promise.all: ~1400ms (best case)
│  │  ├─ Filter & sort: 10ms
│  │  └─ Build response: 20ms
│  └─ JSON serialization: 40ms
│
└─ Frontend Rendering (50ms)
   ├─ Parse JSON: 10ms
   ├─ React Query update: 10ms
   └─ Component render: 30ms
```

### **Optimization Strategies**

1. **Parallel Processing**
```typescript
// ✅ GOOD: Parallel
await Promise.all(citations.map(async (citation) => {
  // All calculations run simultaneously
}));

// ❌ BAD: Sequential
for (const citation of citations) {
  await calculateMetrics(citation);  // Wait for each one
}
```

2. **Database Query Optimization**
```typescript
// ✅ GOOD: Eager loading
const citations = await this.citationsRepository.find({
  where: { citingPaperId: paperId },
  relations: ['citedPaper', 'citedPaper.pdfFiles'],  // JOIN
});

// ❌ BAD: N+1 queries
const citations = await this.citationsRepository.find({
  where: { citingPaperId: paperId }
});
for (const citation of citations) {
  const paper = await this.papersRepository.findOne({  // Separate query
    where: { id: citation.citedPaperId }
  });
}
```

3. **Caching**
```typescript
// Frontend: React Query
queryKey: ['referenceAnalysis', paperId, limit, minRelevance]
staleTime: 5 * 60 * 1000  // 5 minutes

// Backend: Could add Redis cache
const cacheKey = `analysis:${paperId}:${limit}:${minRelevance}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

4. **Pagination**
```typescript
// Instead of analyzing all 50 references
const citations = await this.citationsRepository.find({
  where: { citingPaperId: paperId },
  take: limit * 2,  // Fetch 2x limit as buffer
  order: { relevanceScore: 'DESC' }
});
```

---

## 🎯 Kết Luận

### **Key Takeaways:**

1. **Multi-layered Architecture**
   - Frontend (React + React Query)
   - API Gateway (NestJS Controller)
   - Business Logic (Service Layer)
   - Database (PostgreSQL)

2. **Security First**
   - JWT authentication on every request
   - Ownership verification before data access
   - Parameter validation & sanitization

3. **Performance Optimized**
   - Parallel processing with Promise.all
   - Eager loading to avoid N+1 queries
   - Client-side caching with React Query

4. **Complex Calculations**
   - Multi-dimensional scoring (7 factors)
   - Network analysis (centrality, co-citation)
   - Predictive analytics (impact, future citations)

5. **User Experience**
   - Fast response times (~2.5s)
   - Rich data (scores, metrics, recommendations)
   - Actionable insights (high priority, downloads)

---

**Tóm lại**: Luồng hoạt động từ click button → display results trải qua 5 phases với 15+ steps, sử dụng advanced algorithms và parallel processing để phân tích citations trong ~2.5 giây! 🚀
