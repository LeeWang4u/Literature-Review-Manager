# 🗺️ Citation Analysis - Usage Flow Map

## 📍 Nơi Sử Dụng Hàm `analyzeReferences()`

Hàm được sử dụng ở **4 nơi chính** trong hệ thống:

---

## 1️⃣ Backend Controller (API Endpoints)

### **File**: `backend/src/modules/citations/citations.controller.ts`

#### **A. Endpoint: GET `/citations/paper/:paperId/analyze`**

**Dòng 127-142**

```typescript
@Get('paper/:paperId/analyze')
@ApiOperation({ 
  summary: 'Analyze and rank references by importance using advanced algorithms',
  description: 'Uses network centrality, temporal relevance, co-citation analysis...'
})
analyzeReferences(
  @Param('paperId', ParseIntPipe) paperId: number,
  @Req() req,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  @Query('minRelevance', new DefaultValuePipe(0.5)) minRelevance: number,
) {
  // ✅ DIRECT CALL
  return this.citationsService.analyzeReferences(paperId, req.user.id, { limit, minRelevance });
}
```

**Mục đích**: 
- API endpoint trực tiếp cho frontend
- Trả về full analysis result
- Có thể customize `limit` và `minRelevance`

**URL Example**:
```
GET /api/citations/paper/123/analyze?limit=10&minRelevance=0.5
```

---

#### **B. Endpoint: GET `/citations/paper/:paperId/analyze-enhanced`**

**Dòng 144-199**

```typescript
@Get('paper/:paperId/analyze-enhanced')
@ApiOperation({ 
  summary: 'Enhanced reference analysis with temporal and similarity metrics',
  description: 'Includes citation velocity, similar papers detection...'
})
async analyzeReferencesEnhanced(
  @Param('paperId', ParseIntPipe) paperId: number,
  @Req() req,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
) {
  // ✅ CALLED AS BASE
  const analysis = await this.citationsService.analyzeReferences(
    paperId, 
    req.user.id, 
    { limit }
  );
  
  // Then enhance with temporal metrics
  const enhancedReferences = await Promise.all(
    analysis.topReferences.map(async (ref) => {
      const velocity = await this.citationMetricsService.calculateCitationVelocity(ref.paper.id);
      const aging = await this.citationMetricsService.analyzeCitationAging(ref.paper.id);
      
      return {
        ...ref,
        temporalMetrics: { velocity, aging, ... },
        interpretation: { impact, relevance }
      };
    })
  );
  
  return { ...analysis, topReferences: enhancedReferences };
}
```

**Mục đích**:
- Gọi `analyzeReferences()` để lấy base analysis
- Enhance với temporal metrics (velocity, aging)
- Thêm interpretation layer

**URL Example**:
```
GET /api/citations/paper/123/analyze-enhanced?limit=10
```

---

#### **C. Endpoint: GET `/citations/paper/:paperId/trending-references`**

**Dòng 207-270**

```typescript
@Get('paper/:paperId/trending-references')
@ApiOperation({ 
  summary: '🔥 Detect trending references that are gaining momentum'
})
async getTrendingReferences(
  @Param('paperId', ParseIntPipe) paperId: number,
  @Req() req,
  @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
) {
  // ✅ CALLED WITH LARGER SCOPE
  const allRefs = await this.citationsService.analyzeReferences(
    paperId, 
    req.user.id, 
    { limit: 50, minRelevance: 0.3 }  // Lower threshold, more refs
  );
  
  // Filter for trending ones
  const trendingCandidates = await Promise.all(
    allRefs.topReferences.map(async (ref) => {
      const impactScore = ref.impactPotential.score;
      const growthBonus = ref.futurePrediction.growthRate === '+' ? 30 : 0;
      const trendingScore = impactScore + growthBonus + ...;
      
      if (trendingScore < 70) return null;
      
      return { ...ref, trendingScore, badges: [...] };
    })
  );
  
  return trendingCandidates.filter(Boolean).slice(0, limit);
}
```

**Mục đích**:
- Gọi với `limit=50`, `minRelevance=0.3` để cast wide net
- Filter chỉ lấy trending ones (score >= 70)
- Add trending badges và indicators

**URL Example**:
```
GET /api/citations/paper/123/trending-references?limit=5
```

---

## 2️⃣ Frontend Components

### **A. Component: ReferenceAnalysis.tsx**

**File**: `frontend/src/components/citations/ReferenceAnalysis.tsx`

**Dòng 40-46**

```tsx
const ReferenceAnalysis: React.FC<ReferenceAnalysisProps> = ({
  paperId,
  limit = 10,
  minRelevance = 0.5,
}) => {
  // ✅ REACT QUERY HOOK
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['referenceAnalysis', paperId, limit, minRelevance],
    queryFn: () => citationService.analyzeReferences(paperId, { limit, minRelevance }),
  });

  // Render analysis results
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">
          📊 Reference Analysis ({analysis?.analyzedReferences} papers)
        </Typography>
        
        {/* Display top references with scores */}
        {analysis?.topReferences.map(ref => (
          <ReferenceCard 
            key={ref.citation.id}
            reference={ref}
            onDownload={handleDownload}
          />
        ))}
        
        {/* Recommendations */}
        <Alert severity="info">
          High Priority: {analysis?.recommendations.highPriority}
          Should Download: {analysis?.recommendations.shouldDownload}
        </Alert>
      </CardContent>
    </Card>
  );
};
```

**Mục đích**:
- Display reference analysis trong UI component
- Show scores, metrics, recommendations
- Provide download/view actions

**Sử dụng trong**: Paper detail pages, analysis dashboards

---

### **B. Page: CitationNetworkPage.tsx**

**File**: `frontend/src/pages/citations/CitationNetworkPage.tsx`

**Dòng 105-109**

```tsx
const CitationNetworkPage = () => {
  const { id } = useParams();
  const analysisLimit = 15;
  const minRelevance = 0.3;
  
  // ✅ FETCH ANALYSIS FOR FILTERING
  const { data: analysis } = useQuery({
    queryKey: ['referenceAnalysis', id, analysisLimit, minRelevance],
    queryFn: () => citationService.analyzeReferences(Number(id), { 
      limit: analysisLimit, 
      minRelevance 
    }),
    enabled: !!id && showTopOnly,
  });

  // Use analysis to filter network visualization
  const topReferenceIds = useMemo(() => 
    new Set(analysis?.topReferences.map(r => r.paper.id) || []),
    [analysis]
  );

  // Filter network to show only top references
  const filteredNetwork = useMemo(() => {
    if (!network || !showTopOnly) return network;
    
    return {
      nodes: network.nodes.filter(node => 
        node.id === Number(id) || topReferenceIds.has(node.id)
      ),
      edges: network.edges.filter(edge =>
        topReferenceIds.has(edge.target)
      )
    };
  }, [network, topReferenceIds, showTopOnly]);

  return (
    <MainLayout>
      {/* D3.js Citation Network Visualization */}
      <CitationNetworkD3 
        network={filteredNetwork}
        highlightedNodes={topReferenceIds}
      />
      
      {/* Side panel with analysis */}
      <Drawer>
        <ReferenceAnalysis paperId={Number(id)} />
      </Drawer>
    </MainLayout>
  );
};
```

**Mục đích**:
- Fetch analysis để filter network visualization
- Highlight top references trong D3.js graph
- Show only important nodes (reduce clutter)

**URL**: `/citations/:id` (e.g., `/citations/123`)

---

## 3️⃣ Frontend Service (New APIs)

### **File**: `frontend/src/services/citation.service.ts`

**Các API mới đã thêm**:

```typescript
export const citationService = {
  // ✅ STANDARD ANALYSIS
  analyzeReferences: async (paperId: number, options?: { 
    limit?: number; 
    minRelevance?: number 
  }): Promise<ReferenceAnalysis> => {
    const response = await axiosInstance.get(
      `/citations/paper/${paperId}/analyze`,
      { params: options }
    );
    return response.data;
  },

  // ✅ ENHANCED ANALYSIS (với temporal metrics)
  analyzeReferencesEnhanced: async (
    paperId: number, 
    limit?: number
  ): Promise<ReferenceAnalysis> => {
    const response = await axiosInstance.get(
      `/citations/paper/${paperId}/analyze-enhanced`,
      { params: { limit } }
    );
    return response.data;
  },

  // ✅ TRENDING DETECTION
  getTrendingReferences: async (
    paperId: number, 
    limit?: number
  ): Promise<TrendingReferencesResponse> => {
    const response = await axiosInstance.get(
      `/citations/paper/${paperId}/trending-references`,
      { params: { limit } }
    );
    return response.data;
  }
};
```

---

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTIONS                         │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Paper Detail  │  │ Citation      │  │ New Analysis  │
│ Page          │  │ Network Page  │  │ Components    │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                   │                   │
        │  useQuery         │  useQuery         │  useQuery
        │                   │                   │
        ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│           citationService (Frontend Service)                 │
│  - analyzeReferences()                                       │
│  - analyzeReferencesEnhanced()                               │
│  - getTrendingReferences()                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │  HTTP GET
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           CitationsController (Backend API)                  │
│                                                              │
│  GET /citations/paper/:id/analyze                           │
│  GET /citations/paper/:id/analyze-enhanced                  │
│  GET /citations/paper/:id/trending-references               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │  calls
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           CitationsService.analyzeReferences()               │
│                                                              │
│  1. Fetch citations from DB                                 │
│  2. Build citation network (depth=2)                        │
│  3. Calculate multi-dimensional scores                      │
│     ├─ Content Relevance (30%)                              │
│     ├─ Network Importance (25%)                             │
│     ├─ Context Quality (20%)                                │
│     ├─ Temporal Relevance (15%)                             │
│     ├─ Citation Frequency (5%)                              │
│     └─ Depth Penalty (5%)                                   │
│  4. Calculate additional metrics                            │
│     ├─ Centrality measures                                  │
│     ├─ Co-citation similarity                               │
│     ├─ Impact potential (0-100)                             │
│     └─ Future predictions                                   │
│  5. Filter & rank by score                                  │
│  6. Generate recommendations                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │  uses
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           CitationMetricsService                             │
│  - calculateAdvancedScore()                                  │
│  - calculateCentrality()                                     │
│  - calculateCoCitation()                                     │
│  - forecastImpactPotential()                                 │
│  - predictFutureCitations()                                  │
│  - calculatePageRank()                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Use Cases Summary

| **Use Case** | **Location** | **Purpose** | **Config** |
|--------------|--------------|-------------|------------|
| **1. Standard Analysis** | `ReferenceAnalysis.tsx` | Display top references với scores | `limit=10, minRelevance=0.5` |
| **2. Network Filtering** | `CitationNetworkPage.tsx` | Filter D3 graph chỉ show top refs | `limit=15, minRelevance=0.3` |
| **3. Enhanced Analysis** | `analyzeReferencesEnhanced` API | Add temporal metrics (velocity, aging) | `limit=10` |
| **4. Trending Detection** | `getTrendingReferences` API | Find breakthrough papers | `limit=5, minRelevance=0.3` |
| **5. Demo Page** | `CitationAnalysisDemo.tsx` (new) | Showcase all features | Customizable |

---

## 📱 API Endpoint Summary

### **Standard Analysis**
```
GET /api/citations/paper/:paperId/analyze
Params: ?limit=10&minRelevance=0.5
Returns: ReferenceAnalysis
```

### **Enhanced Analysis**
```
GET /api/citations/paper/:paperId/analyze-enhanced
Params: ?limit=10
Returns: ReferenceAnalysis + temporalMetrics + interpretation
```

### **Trending Detection**
```
GET /api/citations/paper/:paperId/trending-references
Params: ?limit=5
Returns: TrendingReferencesResponse with badges
```

---

## 🔄 Call Chain

```
User Action
    ↓
React Component (useQuery)
    ↓
citationService.analyzeReferences()
    ↓
HTTP GET /api/citations/paper/:id/analyze
    ↓
CitationsController.analyzeReferences()
    ↓
CitationsService.analyzeReferences()
    ↓
├─ getCitationNetwork()
├─ CitationMetricsService.calculateAdvancedScore()
├─ CitationMetricsService.calculateCentrality()
├─ CitationMetricsService.calculateCoCitation()
├─ CitationMetricsService.forecastImpactPotential()
└─ CitationMetricsService.predictFutureCitations()
    ↓
Return ReferenceAnalysisResult
    ↓
Display in UI (scores, metrics, recommendations)
```

---

## 💡 Key Insights

### **1. Reusability**
- `analyzeReferences()` được dùng làm **base function**
- Các endpoint khác (enhanced, trending) build on top of nó
- Single source of truth cho analysis logic

### **2. Flexibility**
- Có thể customize `limit` và `minRelevance` theo use case
- Enhanced version thêm metrics mà không modify core
- Trending detection filter kết quả của base function

### **3. Performance**
- Frontend cache results với React Query
- Backend calculate intensive metrics một lần
- Network filtering giảm số nodes cần render

### **4. Separation of Concerns**
- **Service**: Business logic (scoring, ranking)
- **Controller**: API endpoints (routing, validation)
- **Component**: UI rendering (display, interaction)
- **Metrics Service**: Complex calculations (isolated)

---

## 🚀 Future Extensions

Có thể extend thêm:

1. **Batch Analysis**: Analyze multiple papers cùng lúc
2. **Comparative Analysis**: So sánh references của 2 papers
3. **Historical Tracking**: Track changes in scores over time
4. **Export Features**: Export analysis results (CSV, JSON)
5. **Recommendation System**: Suggest papers based on analysis
6. **Real-time Updates**: WebSocket updates khi có citations mới

---

**Tóm lại**: Hàm `analyzeReferences()` là **core function** được sử dụng ở:
- ✅ 3 API endpoints (standard, enhanced, trending)
- ✅ 2 frontend components (ReferenceAnalysis, CitationNetworkPage)
- ✅ New components (AdvancedReferenceAnalysis, SimilarPapersFinder)

Mỗi nơi sử dụng với mục đích và configuration khác nhau! 🎯
