# 🔍 Citation APIs - Hiện Đang Sử Dụng

## 📊 Tổng Quan

Hiện tại hệ thống đang sử dụng **4 APIs chính** để lấy references và citations về.

---

## ✅ APIs Đang Được Sử Dụng

### **1. GET `/citations/paper/:paperId/references`** 
**Service**: `citationService.getReferences(paperId)`

#### **Mục đích**
Lấy danh sách **references** (papers mà paper này cite)

#### **Nơi sử dụng**
- ✅ `CitationNetworkPage.tsx` (dòng 89, 101)
  - Load references của paper chính
  - Load references của node được chọn trong graph

#### **Response**
```typescript
Citation[] // Array of citation objects with citedPaper relation
[
  {
    id: number,
    citingPaperId: number,
    citedPaperId: number,
    citedPaper: {
      id: number,
      title: string,
      authors: string,
      year: number,
      ...
    },
    relevanceScore: number,
    isInfluential: boolean,
    citationContext: string
  }
]
```

#### **Use Case**
```tsx
// Trong CitationNetworkPage
const { data: references = [] } = useQuery({
  queryKey: ['citations', 'references', id],
  queryFn: () => citationService.getReferences(Number(id)),
  enabled: !!id,
});

// Display list of references
references.map(ref => (
  <ReferenceCard 
    key={ref.id}
    paper={ref.citedPaper}
    score={ref.relevanceScore}
  />
))
```

---

### **2. GET `/citations/network/:paperId?depth=2`**
**Service**: `citationService.getNetwork(paperId, depth)`

#### **Mục đích**
Lấy **citation network** (nodes + edges) để visualize D3.js graph

#### **Nơi sử dụng**
- ✅ `CitationNetworkPage.tsx` (dòng 95)
  - Load full network cho visualization
  - Default depth = 2

#### **Parameters**
- `paperId`: Paper ID
- `depth`: Network depth (default: 2)
  - Depth 1: Direct citations only
  - Depth 2: Citations + citations of citations

#### **Response**
```typescript
CitationNetwork {
  nodes: [
    {
      id: number,
      title: string,
      year: number,
      type: 'source' | 'reference' | 'citation',
      citationCount?: number
    }
  ],
  edges: [
    {
      source: number,      // citingPaperId
      target: number,      // citedPaperId
      citingPaperId: number,
      citedPaperId: number,
      relevanceScore?: number
    }
  ]
}
```

#### **Use Case**
```tsx
// Load network
const { data: network } = useQuery({
  queryKey: ['citationNetwork', id, depth],
  queryFn: () => citationService.getNetwork(Number(id), depth),
});

// Visualize with D3.js
<CitationNetworkD3 
  nodes={network.nodes}
  edges={network.edges}
  onNodeClick={handleNodeClick}
/>
```

---

### **3. GET `/citations/paper/:paperId/analyze?limit=15&minRelevance=0.3`**
**Service**: `citationService.analyzeReferences(paperId, { limit, minRelevance })`

#### **Mục đích**
Phân tích và xếp hạng references theo **multi-dimensional scoring**

#### **Nơi sử dụng**
- ✅ `CitationNetworkPage.tsx` (dòng 107)
  - Filter network để chỉ show top references
  - Config: `limit=15`, `minRelevance=0.3`

- ✅ `ReferenceAnalysis.tsx` (dòng 45)
  - Display analysis results với scores
  - Config: `limit=10`, `minRelevance=0.5`

#### **Parameters**
```typescript
{
  limit?: number,        // Default: 10
  minRelevance?: number  // Default: 0.5 (0-1 scale)
}
```

#### **Response**
```typescript
ReferenceAnalysisResult {
  paperId: number,
  title: string,
  totalReferences: number,
  analyzedReferences: number,
  topReferences: [
    {
      citation: {...},
      paper: {...},
      score: number,              // 0-1 composite score
      citationCount: number,
      centrality: {...},
      coCitationStrength: number,
      scoreBreakdown: {
        contentRelevance: number,
        networkImportance: number,
        contextQuality: number,
        temporalRelevance: number,
        citationFrequency: number,
        depthPenalty: number
      },
      impactPotential: {
        score: number,            // 0-100
        category: string,         // 'low' | 'moderate' | 'high' | 'breakthrough'
        projectedRank: string
      },
      futurePrediction: {
        nextYear: number,
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

#### **Use Case 1: Network Filtering**
```tsx
// Trong CitationNetworkPage - Filter network
const { data: analysis } = useQuery({
  queryKey: ['referenceAnalysis', id, 15, 0.3],
  queryFn: () => citationService.analyzeReferences(Number(id), { 
    limit: 15, 
    minRelevance: 0.3 
  }),
  enabled: !!id && showTopOnly,
});

// Get top reference IDs
const topReferenceIds = new Set(
  analysis?.topReferences.map(r => r.paper.id) || []
);

// Filter network to show only top refs
const filteredNetwork = {
  nodes: network.nodes.filter(node => 
    node.id === Number(id) || topReferenceIds.has(node.id)
  ),
  edges: network.edges.filter(edge =>
    topReferenceIds.has(edge.target)
  )
};
```

#### **Use Case 2: Display Analysis**
```tsx
// Trong ReferenceAnalysis component
const { data: analysis } = useQuery({
  queryKey: ['referenceAnalysis', paperId, 10, 0.5],
  queryFn: () => citationService.analyzeReferences(paperId, { 
    limit: 10, 
    minRelevance: 0.5 
  }),
});

// Display results
<Card>
  <Typography>
    Found {analysis.analyzedReferences} references
  </Typography>
  
  {analysis.topReferences.map(ref => (
    <ReferenceCard
      key={ref.citation.id}
      paper={ref.paper}
      score={ref.score}
      citationCount={ref.citationCount}
      impactScore={ref.impactPotential?.score}
      growthRate={ref.futurePrediction?.growthRate}
    />
  ))}
  
  <Alert>
    High Priority: {analysis.recommendations.highPriority}
    Should Download: {analysis.recommendations.shouldDownload}
  </Alert>
</Card>
```

---

### **4. GET `/citations/paper/:paperId`** (ít dùng)
**Service**: `citationService.getByPaper(paperId)`

#### **Mục đích**
Lấy cả **citing** và **citedBy** trong một call

#### **Response**
```typescript
{
  citing: Paper[],   // Papers that cite this paper
  citedBy: Paper[]   // Papers cited by this paper (references)
}
```

#### **Trạng thái**
⚠️ Có trong service nhưng **KHÔNG được sử dụng** trong UI hiện tại

---

## 🚫 APIs Chưa Được Sử Dụng

Các APIs có trong service nhưng **chưa được gọi** từ UI:

### **1. GET `/citations/paper/:paperId/cited-by`**
**Service**: `citationService.getCitedBy(paperId)`

**Công dụng**: Lấy papers cite paper này (citations)

**Tại sao chưa dùng**: 
- CitationNetworkPage đang dùng `getNetwork()` thay thế
- Network API trả về cả references và citations

---

### **2. GET `/citations/stats/:paperId`**
**Service**: `citationService.getStats(paperId)`

**Công dụng**: Lấy citation statistics (counts)

**Response**:
```typescript
{
  totalCitations: number,
  totalReferences: number,
  influentialCitations: number
}
```

**Có thể dùng**: Display statistics card trong Paper Detail Page

---

### **3. POST `/citations/:id/auto-rate`**
**Service**: `citationService.autoRate(citationId)`

**Công dụng**: AI auto-rate một citation duy nhất

**Trạng thái**: Có mutation trong CitationNetworkPage nhưng UI button bị comment

```tsx
// ĐANG BỊ COMMENT
const autoRateMutation = useMutation({
  mutationFn: (citationId: number) => citationService.autoRate(citationId),
  onSuccess: (data) => {
    toast.success(`AI rated: ${(data.relevanceScore! * 100).toFixed(0)}%`);
  }
});
```

---

### **4. POST `/citations/paper/:paperId/auto-rate-all`**
**Service**: `citationService.autoRateAll(paperId)`

**Công dụng**: AI auto-rate tất cả references của paper

**Trạng thái**: Có mutation nhưng UI button bị comment

```tsx
// ĐANG BỊ COMMENT
// const autoRateAllMutation = useMutation({
//   mutationFn: () => citationService.autoRateAll(Number(id)),
//   ...
// });
```

---

## 📊 Bảng Tóm Tắt

| **API** | **Method** | **Endpoint** | **Service Function** | **Sử Dụng?** | **Nơi Dùng** |
|---------|-----------|--------------|----------------------|--------------|--------------|
| Get References | GET | `/citations/paper/:id/references` | `getReferences()` | ✅ **YES** | CitationNetworkPage (2x) |
| Get Network | GET | `/citations/network/:id` | `getNetwork()` | ✅ **YES** | CitationNetworkPage |
| Analyze References | GET | `/citations/paper/:id/analyze` | `analyzeReferences()` | ✅ **YES** | CitationNetworkPage, ReferenceAnalysis |
| Get By Paper | GET | `/citations/paper/:id` | `getByPaper()` | ❌ **NO** | - |
| Get Cited By | GET | `/citations/paper/:id/cited-by` | `getCitedBy()` | ❌ **NO** | - |
| Get Stats | GET | `/citations/stats/:id` | `getStats()` | ❌ **NO** | - |
| Auto Rate | POST | `/citations/:id/auto-rate` | `autoRate()` | 🟡 **Commented** | CitationNetworkPage |
| Auto Rate All | POST | `/citations/paper/:id/auto-rate-all` | `autoRateAll()` | 🟡 **Commented** | CitationNetworkPage |
| Update Citation | PATCH | `/citations/:id` | `update()` | ✅ **YES** | CitationNetworkPage |
| Delete Citation | DELETE | `/citations/:id` | `delete()` | ❌ **NO** | - |
| Create Citation | POST | `/citations` | `create()` | ❌ **NO** | - |

---

## 🎯 Workflow Hiện Tại

### **Citation Network Page**

```
User visits /citations/:id
    ↓
1. Load Network (getNetwork)
   → Full citation graph với depth=2
    ↓
2. Load References (getReferences)
   → List of references với metadata
    ↓
3. Load Analysis (analyzeReferences)
   → Scored & ranked references
    ↓
4. Filter Network
   → Chỉ show top references từ analysis
    ↓
5. Visualize D3.js Graph
   → Interactive network visualization
```

### **Reference Analysis Component**

```
Component mounted với paperId
    ↓
1. Call analyzeReferences(paperId, { limit: 10, minRelevance: 0.5 })
    ↓
2. Display Results:
   - Top references với scores
   - Impact potential badges
   - Growth indicators
   - Recommendations
    ↓
3. User Actions:
   - Download metadata
   - View paper details
   - Add to library
```

---

## 🔧 Cấu Hình Hiện Tại

### **CitationNetworkPage**
```typescript
const analysisLimit = 15;
const minRelevance = 0.3;
const depth = 2;

// API Calls:
getNetwork(paperId, depth=2)
getReferences(paperId)
analyzeReferences(paperId, { limit: 15, minRelevance: 0.3 })
```

### **ReferenceAnalysis Component**
```typescript
const limit = 10;
const minRelevance = 0.5;

// API Call:
analyzeReferences(paperId, { limit: 10, minRelevance: 0.5 })
```

---

## 💡 Recommendations

### **1. APIs nên enable**

#### **A. Auto Rate Single Citation**
```tsx
// Uncomment trong CitationNetworkPage
<IconButton onClick={() => autoRateMutation.mutate(citation.id)}>
  <AutoAwesome /> AI Rate
</IconButton>
```

**Benefit**: User có thể AI-rate individual citations

---

#### **B. Auto Rate All**
```tsx
// Uncomment và thêm button
<Button onClick={() => autoRateAllMutation.mutate()}>
  🤖 AI Rate All References
</Button>
```

**Benefit**: Batch rating tiết kiệm thời gian

---

#### **C. Citation Stats**
```tsx
// Thêm vào Paper Detail Page
const { data: stats } = useQuery({
  queryKey: ['citationStats', paperId],
  queryFn: () => citationService.getStats(paperId)
});

<Card>
  <Typography>Total Citations: {stats.totalCitations}</Typography>
  <Typography>Total References: {stats.totalReferences}</Typography>
  <Typography>Influential: {stats.influentialCitations}</Typography>
</Card>
```

**Benefit**: Quick overview không cần load full network

---

### **2. APIs mới đã thêm (chưa dùng)**

Các APIs trong `citation.service.ts` đã được extend nhưng **chưa được gọi**:

```typescript
// ❌ Chưa được sử dụng trong UI
analyzeReferencesEnhanced()
getTrendingReferences()
getPageRank()
getCentrality()
getCoCitation()
getBibliographicCoupling()
findSimilarPapers()
```

**Recommendation**: Tích hợp vào các components mới (AdvancedReferenceAnalysis, SimilarPapersFinder)

---

## 📈 Performance Notes

### **Parallel Loading**
CitationNetworkPage load 3 APIs song song:
```typescript
// ✅ Good: Parallel requests
useQuery(['network', ...])      // 1
useQuery(['references', ...])   // 2  
useQuery(['analysis', ...])     // 3
// All run simultaneously
```

### **Conditional Loading**
```typescript
// ✅ Good: Only load when needed
useQuery({
  enabled: !!id && showTopOnly  // Chỉ load khi cần filter
})
```

### **Caching**
```typescript
// ✅ Good: React Query auto cache
queryKey: ['referenceAnalysis', paperId, limit, minRelevance]
// Cache invalidated khi params thay đổi
```

---

## 🎯 Kết Luận

### **APIs chính đang dùng để lấy references:**

1. ✅ **`getReferences()`** - Lấy danh sách references
2. ✅ **`getNetwork()`** - Lấy full citation graph
3. ✅ **`analyzeReferences()`** - Phân tích & xếp hạng references

### **Workflow**:
```
Load Network → Load References → Analyze → Filter → Visualize
```

### **Điểm mạnh**:
- ✅ Multi-dimensional analysis (7 factors)
- ✅ Predictive analytics (impact potential, future citations)
- ✅ Network-based filtering
- ✅ Parallel loading
- ✅ Smart caching

### **Cải tiến có thể làm**:
- 🔧 Enable AI auto-rate features
- 🔧 Add citation stats display
- 🔧 Integrate new advanced APIs (enhanced, trending, similar)
- 🔧 Add batch operations (download multiple PDFs)

---

**Tóm lại**: Hiện tại hệ thống chủ yếu dùng **3 APIs core** để lấy và phân tích references, với focus vào **network visualization** và **multi-dimensional scoring**! 🎯
