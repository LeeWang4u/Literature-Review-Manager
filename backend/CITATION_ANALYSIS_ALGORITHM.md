# 📊 Phân Tích Thuật Toán Citation Analysis

## 🎯 Tổng Quan

Hệ thống sử dụng **hàm `analyzeReferences()`** trong `CitationsService` để phân tích và xếp hạng các references (papers được cite) dựa trên **thuật toán multi-dimensional scoring** với 7 yếu tố và predictive analytics.

---

## 🔄 Quy Trình Hoạt Động

### **1. Entry Point: `analyzeReferences()`**

**File**: `backend/src/modules/citations/citations.service.ts` (dòng 642-822)

```typescript
async analyzeReferences(
  paperId: number,      // Paper cần phân tích
  userId: number,       // User ID để verify ownership
  options: {
    limit?: number,          // Default: 10
    minRelevance?: number    // Default: 0.5
  }
): Promise<ReferenceAnalysisResult>
```

#### **Bước 1: Lấy dữ liệu**
```typescript
// 1.1. Verify paper thuộc về user
const paper = await this.papersRepository.findOne({
  where: { id: paperId, addedBy: userId }
});

// 1.2. Lấy tất cả citations (references)
const citations = await this.citationsRepository.find({
  where: { citingPaperId: paperId },
  relations: ['citedPaper', 'citedPaper.pdfFiles'],
  order: {
    isInfluential: 'DESC',
    relevanceScore: 'DESC'
  }
});
```

#### **Bước 2: Xây dựng Citation Network**
```typescript
// Lấy full citation network (depth = 2)
const network = await this.getCitationNetwork(paperId, userId, 2);

// Network structure:
{
  nodes: [{ id, title, year, type }],
  edges: [{ 
    source: citingPaperId, 
    target: citedPaperId,
    citedPaperId,
    citingPaperId 
  }]
}
```

#### **Bước 3: Tính điểm cho từng reference**

Mỗi reference được tính **7 metrics** song song:

```typescript
const scoredReferences = await Promise.all(
  citations.map(async (citation) => {
    // A. Advanced Score (0-1) - Composite của 6 factors
    const { totalScore, breakdown } = await this.citationMetricsService
      .calculateAdvancedScore(citation, network, currentYear);
    
    // B. Centrality Measures
    const centrality = await this.citationMetricsService
      .calculateCentrality(citedPaper.id, network);
    
    // C. Co-citation Similarity
    const coCitation = await this.citationMetricsService
      .calculateCoCitation(paperId, citedPaper.id, network);
    
    // D. Impact Potential (0-100)
    const impactPotential = await this.citationMetricsService
      .forecastImpactPotential(citedPaper.id);
    
    // E. Future Citations Prediction
    const predictions = await this.citationMetricsService
      .predictFutureCitations(citedPaper.id, 12);
    
    return { ...allMetrics };
  })
);
```

---

## 📐 Thuật Toán Chi Tiết

### **A. Advanced Score (0-1)** - Multi-dimensional Composite

**Hàm**: `calculateAdvancedScore()` trong `citation-metrics.service.ts`

**Công thức tổng quát**:
```
TotalScore = Σ(Factor_i × Weight_i)
```

#### **Factor 1: Content Relevance (30% weight)**

```typescript
contentScore = citation.relevanceScore || 0;  // AI-generated (Gemini AI)
breakdown.contentRelevance = contentScore × 0.3;
```

- **Nguồn**: AI analysis từ Gemini API
- **Ý nghĩa**: Mức độ liên quan về nội dung
- **Range**: 0-1
- **Tác động**: 0.0 - 0.3 points

#### **Factor 2: Network Importance (25% weight)**

```typescript
inDegree = network.edges.filter(e => e.target === citedPaperId).length;

// Logarithmic scale để tránh bias
normalizedDegree = Math.min(Math.log10(inDegree + 1) / 2, 1.0);
breakdown.networkImportance = normalizedDegree × 0.25;
```

- **Công thức**: `log10(citations + 1) / 2`
- **Mapping**:
  - 1 citation → 0.1
  - 10 citations → 0.5
  - 100 citations → 1.0
- **Tác động**: 0.0 - 0.25 points

#### **Factor 3: Context Quality (20% weight)**

```typescript
contextScore = await analyzeContextQuality(citation);
breakdown.contextQuality = contextScore × 0.2;
```

**Sub-algorithm**: Sentiment & Keyword Analysis

```typescript
score = 0.5; // Start neutral

// Positive keywords (+0.1 each, max +0.5)
positiveKeywords = [
  'important', 'seminal', 'foundational', 'key', 'significant',
  'pioneering', 'influential', 'comprehensive', 'critical', 'essential',
  'breakthrough', 'landmark', 'novel', 'innovative', 'groundbreaking'
];

// Negative keywords (-0.15 each, max -0.5)
negativeKeywords = [
  'limited', 'flawed', 'insufficient', 'contradicts', 'challenges',
  'outdated', 'problematic', 'questionable', 'inadequate', 'disputed'
];

// Methodology keywords (+0.15 each, max +0.3)
methodKeywords = [
  'method', 'approach', 'technique', 'algorithm', 'framework',
  'model', 'system', 'procedure', 'protocol', 'methodology'
];

// Calculate
score += min(positiveCount × 0.1, 0.5);
score -= min(negativeCount × 0.15, 0.5);
score += min(methodCount × 0.15, 0.3);

// Override if marked influential
if (citation.isInfluential) {
  score = max(score, 0.8);
}
```

- **Tác động**: 0.0 - 0.2 points

#### **Factor 4: Temporal Relevance (15% weight)**

```typescript
age = currentYear - citedPaper.publicationYear;

// Exponential decay: half-life = 10 years
recencyScore = Math.exp(-age / 14.427);  // ln(2)/14.427 ≈ 0.048

breakdown.temporalRelevance = recencyScore × 0.15;
```

**Công thức**: `e^(-age / 14.427)`

**Mapping**:
- 0 years → 1.0 (mới nhất)
- 5 years → 0.7
- 10 years → 0.5
- 20 years → 0.25

- **Tác động**: 0.0 - 0.15 points

#### **Factor 5: Citation Frequency (5% weight)**

```typescript
// Dựa trên độ dài citation context
frequencyScore = Math.min(citation.citationContext.length / 500, 1.0);
breakdown.citationFrequency = frequencyScore × 0.05;
```

- **Giả định**: Context dài → được mention nhiều lần
- **Tác động**: 0.0 - 0.05 points

#### **Factor 6: Depth Penalty (5% weight)**

```typescript
depth = citation.citationDepth || 0;

// Penalty theo depth
depthScore = Math.max(1.0 - (depth × 0.3), 0.3);
breakdown.depthPenalty = depthScore × 0.05;
```

**Mapping**:
- Depth 0 (direct) → 1.0
- Depth 1 → 0.7
- Depth 2 → 0.5
- Depth 3+ → 0.3

- **Tác động**: 0.015 - 0.05 points

---

### **B. Centrality Measures**

**Hàm**: `calculateCentrality()`

```typescript
{
  inDegree: number,              // Số papers cite paper này
  outDegree: number,             // Số papers mà paper này cite
  totalDegree: number,           // inDegree + outDegree
  clusteringCoefficient: number, // Mức độ neighbors connect với nhau
  normalizedInDegree: number     // inDegree / (total nodes - 1)
}
```

#### **Clustering Coefficient**

**Công thức**:
```
C = (actual edges between neighbors) / (possible edges between neighbors)
C = 2E / (k(k-1))

Trong đó:
- E = số edges giữa neighbors
- k = số neighbors
```

**Ý nghĩa**: 
- C = 1.0 → All neighbors connect (tightly clustered)
- C = 0.0 → No connections between neighbors
- High clustering → Paper nằm trong "research community" chặt chẽ

---

### **C. Co-Citation Similarity**

**Hàm**: `calculateCoCitation()`

**Định nghĩa**: Hai papers được "co-cited" nếu chúng được cite cùng nhau bởi paper thứ 3.

**Công thức**:

```typescript
// Jaccard Index
J = |A ∩ B| / |A ∪ B|

// Normalized Strength
S = |A ∩ B| / min(|A|, |B|)

Trong đó:
- A = set of papers citing paper 1
- B = set of papers citing paper 2
- |A ∩ B| = papers citing both
```

**Ví dụ**:
```
Paper A cited by: [P1, P2, P3, P4]
Paper B cited by: [P2, P3, P5]

Common: [P2, P3] → 2 papers
Union: [P1, P2, P3, P4, P5] → 5 papers
Jaccard = 2/5 = 0.4

Min(4, 3) = 3
Strength = 2/3 = 0.67
```

**Ý nghĩa**:
- High co-citation → Papers thường được dùng cùng nhau
- Gợi ý papers tương tự về topic/method

---

### **D. Impact Potential (0-100)**

**Hàm**: `forecastImpactPotential()`

**Composite Score** từ 8 indicators:

```typescript
impactScore = 
  velocityScore +        // Citation velocity (0-20)
  growthScore +          // Growth trajectory (0-15)
  agingScore +           // Aging pattern (0-10)
  freshnessScore +       // Recency bonus (0-10)
  burstScore +           // Citation burst (0-15)
  consistencyScore +     // Citation consistency (0-10)
  recentActivityScore +  // Recent 2-year activity (0-15)
  predictionScore        // Future prediction (0-5)

Total: 0-100
```

**Categories**:
- **80-100**: 🔴 Breakthrough
- **60-79**: 🟠 High
- **40-59**: 🟡 Moderate
- **0-39**: ⚪ Low

**Projected Rank**:
```typescript
if (score >= 90) return 'Top 1%';
if (score >= 80) return 'Top 5%';
if (score >= 70) return 'Top 10%';
if (score >= 60) return 'Top 25%';
return 'Standard';
```

---

### **E. Future Citations Prediction**

**Hàm**: `predictFutureCitations()`

**Thuật toán**: Linear Regression với confidence interval

```typescript
// 1. Lấy citation history
citations = await getCitationHistory(paperId);

// 2. Prepare data points
data = citations.map((c, i) => ({
  x: i,                    // Month index
  y: c.count              // Citation count
}));

// 3. Linear regression: y = mx + b
const n = data.length;
const sumX = Σx_i;
const sumY = Σy_i;
const sumXY = Σ(x_i × y_i);
const sumX2 = Σ(x_i²);

m = (n×sumXY - sumX×sumY) / (n×sumX2 - sumX²);  // Slope
b = (sumY - m×sumX) / n;                        // Intercept

// 4. Predict future
predicted_t = m × t + b;

// 5. Calculate confidence interval (95%)
residuals = actual_i - predicted_i;
stdError = sqrt(Σ(residuals²) / (n-2));
margin = 1.96 × stdError;

confidenceInterval = {
  lower: predicted - margin,
  upper: predicted + margin
};
```

**Output**:
```typescript
{
  predictions: [
    { month: 1, predicted: 25, confidenceInterval: { lower: 20, upper: 30 } },
    { month: 2, predicted: 27, confidenceInterval: { lower: 22, upper: 32 } },
    ...
  ],
  overallTrend: 'growing' | 'stable' | 'declining',
  growthRate: number  // slope of regression
}
```

---

## 🎯 Quy Trình Filtering & Ranking

### **Step 1: Filter by Minimum Relevance**

```typescript
filteredReferences = scoredReferences.filter(ref => 
  ref.citation.relevanceScore >= minRelevance ||  // Default: 0.5
  ref.citation.isInfluential                      // Override
);
```

### **Step 2: Sort by Total Score**

```typescript
sortedReferences = filteredReferences.sort((a, b) => 
  b.score - a.score  // Descending
);
```

### **Step 3: Take Top N**

```typescript
topReferences = sortedReferences.slice(0, limit);  // Default: 10
```

---

## 📊 Recommendations Logic

### **High Priority**

References nên đọc **ngay**:

```typescript
highPriority = references.filter(ref => 
  ref.score >= 0.8 ||                            // Very high composite score
  (ref.centrality.inDegree >= 5 && 
   ref.score >= 0.6) ||                          // Highly cited + good score
  ref.coCitationStrength >= 0.7 ||               // Strong co-citation
  ref.impactPotential?.score >= 80               // Breakthrough potential
);
```

### **Should Download**

References nên download PDF:

```typescript
shouldDownload = references.filter(ref => 
  (ref.score >= 0.6 ||                           // Good score
   ref.citation.isInfluential ||                 // Marked influential
   ref.centrality.inDegree >= 3 ||               // Reasonably cited
   ref.impactPotential?.score >= 60) &&          // High potential
  !ref.paper.hasPdf                              // No PDF yet
);
```

### **Trending References**

References đang "hot":

```typescript
trending = references.filter(ref => 
  ref.futurePrediction?.growthRate === '+' &&    // Positive growth
  (ref.impactPotential?.category === 'high' || 
   ref.impactPotential?.category === 'breakthrough')
);
```

---

## 📈 Overall Insights

```typescript
insights = {
  hasBreakthroughPapers: references.some(ref => 
    ref.impactPotential?.score >= 80
  ),
  
  avgImpactScore: Math.round(
    Σ(impactScores) / referencesWithImpact.length
  ),
  
  growingReferences: references.filter(ref => 
    ref.futurePrediction?.growthRate === '+'
  ).length
};
```

---

## 🔍 API Response Structure

```typescript
{
  paperId: number,
  title: string,
  totalReferences: number,      // Tổng số references
  analyzedReferences: number,   // Số references được phân tích
  
  topReferences: [
    {
      citation: {
        id: number,
        citedPaperId: number,
        relevanceScore: number,
        isInfluential: boolean,
        citationContext: string
      },
      
      paper: {
        id: number,
        title: string,
        authors: string,
        year: number,
        doi: string,
        url: string,
        hasPdf: boolean
      },
      
      // Multi-dimensional score (0-1)
      score: number,
      
      // Citation metrics
      citationCount: number,
      
      // Network metrics
      centrality: {
        inDegree: number,
        outDegree: number,
        totalDegree: number,
        clusteringCoefficient: number,
        normalizedInDegree: number
      },
      
      // Similarity metrics
      coCitationStrength: number,  // 0-1
      
      // Score breakdown (6 factors)
      scoreBreakdown: {
        contentRelevance: number,    // 0-0.3
        networkImportance: number,   // 0-0.25
        contextQuality: number,      // 0-0.2
        temporalRelevance: number,   // 0-0.15
        citationFrequency: number,   // 0-0.05
        depthPenalty: number         // 0.015-0.05
      },
      
      // Impact prediction (0-100)
      impactPotential: {
        score: number,
        category: 'low' | 'moderate' | 'high' | 'breakthrough',
        projectedRank: string,
        timeToImpact: number,
        indicators: {...}
      },
      
      // Future prediction
      futurePrediction: {
        nextYear: number,
        confidenceInterval: { lower, upper },
        growthRate: '+' | '=' | '-'
      }
    }
  ],
  
  recommendations: {
    highPriority: number,
    shouldDownload: number
  },
  
  insights: {
    hasBreakthroughPapers: boolean,
    avgImpactScore: number,
    growingReferences: number
  }
}
```

---

## 🎓 Ví Dụ Cụ Thể

### **Input**

```
paperId: 123
userId: 1
options: { limit: 5, minRelevance: 0.5 }
```

### **Processing**

1. **Lấy 15 references** của paper 123
2. **Xây dựng network** với 50 nodes, 80 edges
3. **Tính điểm** cho 15 references:

| Ref | Content | Network | Context | Temporal | Frequency | Depth | **Total** |
|-----|---------|---------|---------|----------|-----------|-------|-----------|
| R1  | 0.27    | 0.22    | 0.18    | 0.14     | 0.04      | 0.05  | **0.90**  |
| R2  | 0.24    | 0.19    | 0.16    | 0.12     | 0.03      | 0.05  | **0.79**  |
| R3  | 0.21    | 0.18    | 0.14    | 0.10     | 0.03      | 0.04  | **0.70**  |
| ... |         |         |         |          |           |       |           |

4. **Filter**: 12 references có score >= 0.5
5. **Sort & Slice**: Top 5 references
6. **Calculate recommendations**:
   - High Priority: 3 references
   - Should Download: 2 references
   - Trending: 1 reference

### **Output**

```json
{
  "paperId": 123,
  "title": "Deep Learning for NLP",
  "totalReferences": 15,
  "analyzedReferences": 12,
  "topReferences": [
    {
      "citation": { "id": 456, "relevanceScore": 0.9 },
      "paper": { "id": 789, "title": "Attention Is All You Need" },
      "score": 0.90,
      "citationCount": 25,
      "centrality": { "inDegree": 25, "clusteringCoefficient": 0.6 },
      "impactPotential": { "score": 92, "category": "breakthrough" },
      "futurePrediction": { "nextYear": 35, "growthRate": "+" }
    }
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

## 🚀 Ưu Điểm

1. **Multi-dimensional**: Xét 7 yếu tố khác nhau
2. **Balanced weighting**: Không bias vào 1 factor duy nhất
3. **Logarithmic scaling**: Tránh domination của highly-cited papers
4. **Temporal awareness**: Xét cả recency và aging patterns
5. **Predictive**: Dự đoán future impact
6. **Context-aware**: Analyze sentiment trong citation context
7. **Network-based**: Xét vị trí trong citation network

---

## ⚠️ Limitations

1. **Cần nhiều data**: Prediction yêu cầu citation history
2. **Computational cost**: Nhiều async operations cho mỗi reference
3. **AI dependency**: Content relevance phụ thuộc Gemini API
4. **Context quality**: Giả định context dài = important
5. **Linear prediction**: Chỉ dùng linear regression (simple)

---

## 🔧 Configuration

### **Weights có thể điều chỉnh**:

```typescript
// Trong calculateAdvancedScore()
const WEIGHTS = {
  CONTENT_RELEVANCE: 0.30,
  NETWORK_IMPORTANCE: 0.25,
  CONTEXT_QUALITY: 0.20,
  TEMPORAL_RELEVANCE: 0.15,
  CITATION_FREQUENCY: 0.05,
  DEPTH_PENALTY: 0.05
};
```

### **Thresholds**:

```typescript
const THRESHOLDS = {
  HIGH_PRIORITY_SCORE: 0.8,
  DOWNLOAD_SCORE: 0.6,
  MIN_CITATIONS: 3,
  HIGH_IMPACT: 80,
  MODERATE_IMPACT: 60,
  TRENDING_SCORE: 70
};
```

---

**Tóm lại**: Hệ thống sử dụng thuật toán **multi-dimensional scoring với 7 factors + predictive analytics** để phân tích và xếp hạng references, giúp người dùng xác định được papers quan trọng nhất cần đọc và download! 🎯
