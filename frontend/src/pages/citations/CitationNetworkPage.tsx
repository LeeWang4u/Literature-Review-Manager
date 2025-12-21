import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Drawer,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Stack,
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Close,
  Circle,
  Edit,
  Save,
  Cancel,
  AccountTree,
  // AutoAwesome,
  FilterList,
  OpenInNew,
  ArrowBack,
  Add,
} from '@mui/icons-material';
import * as d3 from 'd3';
import { citationService } from '@/services/citation.service';
import { paperService } from '@/services/paper.service';
import toast from 'react-hot-toast';

// Helper function to compute impact tiers
// Compute impact tiers for a set of references
const computeImpactTiers = (references: any[], displayBudget: number = 50): any[] => {
  if (references.length === 0) return [];

  // Sort by impactScore (relevanceScore) descending
  const sortedRefs = [...references].sort((a, b) =>
    (b.relevanceScore || 0) - (a.relevanceScore || 0)
  );

  const tiers = [];
  const totalRefs = sortedRefs.length;
  const targetTierSize = Math.max(3, Math.min(15, Math.floor(displayBudget / 3)));

  let currentIndex = 0;
  let tierNum = 1;

  while (currentIndex < totalRefs && tierNum <= 10) {
    const remainingRefs = totalRefs - currentIndex;
    const proposedTierSize = Math.min(targetTierSize, remainingRefs);
    let actualTierSize = proposedTierSize;

    // Look for significant score gaps
    for (let i = 1; i < Math.min(proposedTierSize, remainingRefs - 1); i++) {
      const currentScore = sortedRefs[currentIndex + i].relevanceScore || 0;
      const nextScore = sortedRefs[currentIndex + i + 1]?.relevanceScore || 0;
      const gap = currentScore - nextScore;

      if (gap > currentScore * 0.2 && i >= 3) {
        actualTierSize = i + 1;
        break;
      }
    }

    const endIndex = currentIndex + actualTierSize;
    const tierRefs = sortedRefs.slice(currentIndex, endIndex);
    const nodeIds = tierRefs.map(ref => ref.id);

    tiers.push({
      tier: tierNum,
      nodeIds,
      nodeCount: nodeIds.length,
    });

    currentIndex = endIndex;
    tierNum++;
  }

  // Append remaining refs to last tier
  if (currentIndex < totalRefs && tiers.length > 0) {
    const lastTier = tiers[tiers.length - 1];
    const remainingRefs = sortedRefs.slice(currentIndex);
    lastTier.nodeIds.push(...remainingRefs.map(ref => ref.id));
    lastTier.nodeCount = lastTier.nodeIds.length;
  }

  return tiers;
};

interface NodeData {
  id: number;
  title: string;
  year: number;
  authors: string[];
  doi?: string;
  isInfluential?: boolean;
  relevanceScore?: number;
  isReference?: boolean;
  type?: string;
  networkDepth?: number;
  citationDepth?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

const CitationNetworkPage: React.FC = () => {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle case where id might be undefined
  if (!idParam) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Invalid paper ID</Alert>
      </Container>
    );
  }

  const id = idParam;

  const [depth, setDepth] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<number | null>(null);
  const [tempRelevance, setTempRelevance] = useState<number>(0);
  const [tempContext, setTempContext] = useState<string>('');
  const [useTreeLayout, setUseTreeLayout] = useState(true); // Toggle tree vs force layout
  const [filteredCount, setFilteredCount] = useState({ nodes: 0, edges: 0 });
  // const [selectedTiers, setSelectedTiers] = useState<any[]>([]); // Tier UI removed
  const [selectedTierLevel, setSelectedTierLevel] = useState<number>(1); // 1 = Tier 1, 2 = Tier 1+2, etc., 0 = All
  const [selectedTierLevelDepth2, setSelectedTierLevelDepth2] = useState<number>(0); // 0 = None, 1 = parent 1, 2 = parents 1-2, etc.
  const [selectedDepth2TierLevels, setSelectedDepth2TierLevels] = useState<{ [parentId: number]: number }>({}); // Per-parent tier selection
  
  // Add manual node state
  const [addNodeDialog, setAddNodeDialog] = useState(false);
  const [newNodeData, setNewNodeData] = useState({
    title: '',
    authors: '',
    year: new Date().getFullYear(),
    doi: '',
    relevanceScore: 0.5,
    citationContext: '',
  });

  // Fetch references of selected node
  const { data: selectedNodeReferences = [], isLoading: loadingNodeRefs } = useQuery({
    queryKey: ['citations', 'references', selectedNode?.id],
    queryFn: () => citationService.getReferences(selectedNode!.id),
    enabled: !!selectedNode && selectedNode.id !== Number(id),
  });

  const { data: network, isLoading, error: networkError } = useQuery({
    queryKey: ['citationNetwork', id, depth],
    queryFn: () => citationService.getNetwork(Number(id), depth),
    enabled: !!id,
    retry: false,
  });

  // Handle network errors with redirect
  useEffect(() => {
    if (networkError) {
      const err = networkError as any;
      if (err?.response?.status === 404 || err?.response?.status === 403) {
        // toast.error('Paper not found or you do not have access');
        navigate('/papers');
      }
    }
  }, [networkError, navigate]);

  const { data: references = [] } = useQuery({
    queryKey: ['citations', 'references', id],
    queryFn: () => citationService.getReferences(Number(id)),
    enabled: !!id,
  });

  // Auto-enable tier selection when references are available
  const showTopOnly = references.length > 0;

  // Compute depth 1 tiers (from network.tiers)
  const depth1Tiers = network?.tiers || [];
  
  // Compute depth 2 per-parent tiers
  const depth2ParentData = React.useMemo(() => {
    if (!network?.nodes || !network?.edges) return [];
    
    const depth1Nodes = (network.nodes as NodeData[]).filter((n) => 
      ((n as any).networkDepth ?? (n as any).citationDepth ?? 0) === 1
    );
    const depth2Nodes = (network.nodes as NodeData[]).filter((n) => 
      ((n as any).networkDepth ?? (n as any).citationDepth ?? 0) === 2
    );

    if (depth1Nodes.length === 0) return [];

    // For each depth 1 node (parent), find its depth 2 children (references)
    const parentData = depth1Nodes.map((parent) => {
      // Find all depth 2 nodes that are children of this parent
      const childEdges = network.edges.filter((edge: any) => {
        const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
        return sourceId === parent.id;
      });

      const children = childEdges
        .map((edge: any) => {
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return depth2Nodes.find(n => n.id === targetId);
        })
        .filter(Boolean) as NodeData[];

      // Add relevanceScore from edges if available
      const childrenWithScores = children.map(child => {
        const edge = network.edges.find((e: any) => {
          const sourceId = typeof e.source === 'object' ? e.source.id : e.source;
          const targetId = typeof e.target === 'object' ? e.target.id : e.target;
          return sourceId === parent.id && targetId === child.id;
        });
        return {
          ...child,
          relevanceScore: (edge as any)?.relevanceScore ?? child.relevanceScore ?? 0
        };
      });

      // Compute tiers for this parent's children
      const displayBudget = 15; // Per-parent display budget
      const tiers = computeImpactTiers(childrenWithScores, displayBudget);

      return {
        parentId: parent.id,
        parentNode: parent,
        children: childrenWithScores,
        tiers,
        totalChildren: children.length
      };
    }).filter(p => p.children.length > 0); // Only keep parents with children

    // Sort by total children descending (most connected parents first)
    return parentData.sort((a, b) => b.totalChildren - a.totalChildren);
  }, [network]);

  // Simplified depth2Tiers for UI - represents parent selection
  const depth2Tiers = React.useMemo(() => {
    return depth2ParentData.map((parent, index) => ({
      tier: index + 1,
      parentId: parent.parentId,
      nodeCount: parent.totalChildren,
      nodeIds: [parent.parentId],
      nodes: [parent.parentNode]
    }));
  }, [depth2ParentData]);

  // Update selectedDepth2TierLevels when selectedTierLevelDepth2 or depth2ParentData changes
  useEffect(() => {
    console.log('🔄 useEffect: Updating selectedDepth2TierLevels');
    console.log(`   selectedTierLevelDepth2: ${selectedTierLevelDepth2}, depth2ParentData.length: ${depth2ParentData.length}`);

    if (depth2ParentData.length > 0) {
      const newTierLevels = { ...selectedDepth2TierLevels };

      // Ensure all currently selected parents have tier levels
      if (selectedTierLevelDepth2 > 0) {
        const selectedParents = depth2ParentData.slice(0, selectedTierLevelDepth2);
        selectedParents.forEach(parentData => {
          if (!(parentData.parentId in newTierLevels)) {
            newTierLevels[parentData.parentId] = 1; // Default to tier 1
            console.log(`   ➕ Added default tier 1 for parent ${parentData.parentId}`);
          }
        });
      }

      // Remove tier levels for parents that are no longer in the first selectedTierLevelDepth2 parents
      Object.keys(newTierLevels).forEach(parentId => {
        const parentIndex = depth2ParentData.findIndex(p => p.parentId === Number(parentId));
        const shouldKeep = parentIndex >= 0 && parentIndex < selectedTierLevelDepth2;
        if (!shouldKeep) {
          delete newTierLevels[Number(parentId)];
          console.log(`   ➖ Removed tier level for parent ${parentId} (no longer in selection)`);
        }
      });

      console.log('   📊 Final selectedDepth2TierLevels:', newTierLevels);
      setSelectedDepth2TierLevels(newTierLevels);
    } else {
      setSelectedDepth2TierLevels({});
    }
  }, [selectedTierLevelDepth2, depth2ParentData]);

  const updateCitationMutation = useMutation({
    mutationFn: ({ citationId, data }: { citationId: number; data: any }) =>
      citationService.update(citationId, data),
    onSuccess: () => {
      toast.success('Updated citation relevance!');
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id, depth] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
      setEditingNode(null);
      setDrawerOpen(false);
    },
    onError: () => {
      toast.error('Failed to update citation');
    },
  });

  /*
  const autoRateMutation = useMutation({
    mutationFn: (citationId: number) => citationService.autoRate(citationId),
    onSuccess: (data) => {
      toast.success(`AI rated: ${(data.relevanceScore! * 100).toFixed(0)}% relevance`);
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id, depth] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
      setEditingNode(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'AI rating failed');
    },
  });
  */

  // Uncomment if needed for batch AI rating
  // const autoRateAllMutation = useMutation({
  //   mutationFn: () => citationService.autoRateAll(Number(id)),
  //   onSuccess: (result) => {
  //     toast.success(`AI rated ${result.rated} citations successfully!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
  //     queryClient.invalidateQueries({ queryKey: ['citationNetwork', id] });
  //     queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
  //   },
  //   onError: (error: any) => {
  //     toast.error(error.response?.data?.message || 'Batch AI rating failed');
  //   },
  // });

  // Fetch nested references mutation (commented out - not currently used)
  /*
  const fetchNestedMutation = useMutation({
    mutationFn: ({ paperId, depth, maxDepth }: { paperId: number; depth: number; maxDepth: number }) =>
      paperService.fetchNestedReferences(paperId, depth, maxDepth),
    onSuccess: (result) => {
      const method = result.stats.method || 'API';
      const methodIcon =
        method === 'Metadata Search' ? '🔍' :
          method === 'AI PDF Extraction' ? '🤖' :
            method === 'AI DOI Finder + API' ? '🤖🔑' :
              method === 'DOI API' ? '🔑' :
                method.includes('Failed') ? '⏳' : '📡';

      let message = `${methodIcon} ${result.message}\n`;
      message += `📊 Found ${result.stats.newReferencesFound} references`;

      if (result.stats.updatedDoi) {
        message += `\n✅ Updated DOI: ${result.stats.updatedDoi.substring(0, 30)}...`;
      }

      toast.success(message, { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id, depth] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
      setDrawerOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to fetch nested references');
    },
  });
  */

  const addManualNodeMutation = useMutation({
    mutationFn: async (data: typeof newNodeData) => {
      // First, create the paper
      const paperResponse = await paperService.create({
        title: data.title,
        authors: data.authors,
        publicationYear: data.year, // Use publicationYear instead of year
        doi: data.doi || undefined,
        abstract: '', // Add empty abstract as it's optional
        isReference: true, // Manual papers are references
      });

      // Then create citation linking it to current paper
      const citation = await citationService.create({
        citingPaperId: Number(id),
        citedPaperId: paperResponse.id,
        relevanceScore: data.relevanceScore,
        citationContext: data.citationContext || undefined,
      });

      return { paper: paperResponse, citation };
    },
    onSuccess: (result) => {
      toast.success(`Added "${result.paper.title}" with ${(result.citation.relevanceScore! * 100).toFixed(0)}% relevance`);
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id, depth] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
      setAddNodeDialog(false);
      setNewNodeData({
        title: '',
        authors: '',
        year: new Date().getFullYear(),
        doi: '',
        relevanceScore: 0.5,
        citationContext: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add node');
    },
  });

  const fetchReferencesMutation = useMutation({
    mutationFn: (paperId: number) => paperService.fetchReferences(paperId),
    onSuccess: (result) => {
      toast.success(result.message, { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id, depth] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', selectedNode?.id] });
      setDrawerOpen(false);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to fetch references';

      // Handle multi-line error messages better
      if (errorMessage.includes('\n')) {
        toast.error(
          <div>
            <div className="font-semibold mb-2">Reference Fetch Failed</div>
            <div className="text-sm whitespace-pre-line">{errorMessage}</div>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error(errorMessage);
      }
    },
  });

  // Compute filtered nodes and edges based on tier selections
  const { filteredNodes, filteredEdges } = useMemo(() => {
    console.log('🔄 useMemo: Computing filtered nodes and edges');
    console.log('   Dependencies changed:', {
      network: !!network,
      showTopOnly,
      depth1Tiers: depth1Tiers?.length,
      selectedTierLevel,
      selectedTierLevelDepth2,
      depth2ParentData: depth2ParentData.length,
      selectedDepth2TierLevels: Object.keys(selectedDepth2TierLevels).length,
      references: references.length,
      id
    });

    if (!network) return { filteredNodes: [], filteredEdges: [] };

    // Filter nodes based on showTopOnly - don't create copies to preserve D3 references
    let filteredNodes = network.nodes;
    let filteredEdges = network.edges;

    // Apply tier-aware selection algorithm
    if (showTopOnly && depth1Tiers && depth1Tiers.length > 0) {
      console.log('🔍 Tier-aware selection algorithm activated');
      console.log(`   References: ${references.length}, Selected Tier Level: ${selectedTierLevel}, Depth2 Tier Level: ${selectedTierLevelDepth2}`);
      console.log(`   Depth1 Tiers: ${depth1Tiers.length}, Depth2 Tiers: ${depth2Tiers.length}`);

      const selectedNodeIds = new Set<number>();
      const selectedTiersList: typeof depth1Tiers = [];
      const mainPaperId = Number(id);

      // Select depth 1 tiers based on selectedTierLevel
      let currentCount = 0;

      if (selectedTierLevel === 0) {
        // Show all depth 1 tiers
        console.log('🎯 Target: show all depth 1 tiers');
        let beforeSize = selectedNodeIds.size;
        for (const tier of depth1Tiers) {
          const beforeTierSize = selectedNodeIds.size;
          tier.nodeIds.forEach((id: number) => selectedNodeIds.add(id));
          const addedCount = selectedNodeIds.size - beforeTierSize;
          currentCount += tier.nodeCount;
          selectedTiersList.push(tier);
          console.log(`   ✅ Depth1 Tier ${tier.tier}: claimed ${tier.nodeCount} nodes, actually added ${addedCount} unique nodes (Total claimed: ${currentCount}, Total unique: ${selectedNodeIds.size})`);
        }
        console.log(`   📊 Depth1 OVERALL: claimed ${currentCount} nodes, actually selected ${selectedNodeIds.size} unique nodes (${selectedNodeIds.size - beforeSize} added)`);
      } else {
        // Show up to selectedTierLevel for depth 1
        console.log(`🎯 Target: show up to Depth1 Tier ${selectedTierLevel}`);
        let beforeSize = selectedNodeIds.size;
        for (const tier of depth1Tiers) {
          if (tier.tier <= selectedTierLevel) {
            const beforeTierSize = selectedNodeIds.size;
            tier.nodeIds.forEach((id: number) => selectedNodeIds.add(id));
            const addedCount = selectedNodeIds.size - beforeTierSize;
            currentCount += tier.nodeCount;
            selectedTiersList.push(tier);
            console.log(`   ✅ Depth1 Tier ${tier.tier}: claimed ${tier.nodeCount} nodes, actually added ${addedCount} unique nodes (Total claimed: ${currentCount}, Total unique: ${selectedNodeIds.size})`);
          } else {
            break;
          }
        }
        console.log(`   📊 Depth1 OVERALL: claimed ${currentCount} nodes, actually selected ${selectedNodeIds.size} unique nodes (${selectedNodeIds.size - beforeSize} added)`);
      }

      console.log(`📊 After depth1 selection: ${selectedTiersList.length} tiers, ${currentCount} refs (tier counts sum), actual selected nodes: ${selectedNodeIds.size}`);

      // Select depth 2 nodes using per-parent tier-aware selection
      let depth2Count = 0;
      if (selectedTierLevelDepth2 > 0 && depth2ParentData.length > 0) {
        console.log(`🎯 Target: show up to ${selectedTierLevelDepth2} depth 2 parent(s)`);

        // Select parents based on selectedTierLevelDepth2
        const selectedParents = depth2ParentData.slice(0, selectedTierLevelDepth2);

        selectedParents.forEach((parentData, index) => {
          const parentId = parentData.parentId;

          // Get tier selection for this parent (default to tier 1)
          const parentTierLevel = selectedDepth2TierLevels[parentId] ?? 1;

          console.log(`   📄 Parent ${index + 1} (ID: ${parentId}): selecting tier level ${parentTierLevel}`);

          // Select nodes from this parent's tiers up to parentTierLevel
          let parentSelectedCount = 0;
          const maxTierLevel = parentData.tiers.length;
          const effectiveTierLevel = parentTierLevel >= 999 ? maxTierLevel : parentTierLevel;

          for (const tier of parentData.tiers) {
            if (tier.tier <= effectiveTierLevel) {
              tier.nodeIds.forEach((id: number) => {
                selectedNodeIds.add(id);
                parentSelectedCount++;
              });
            }
          }

          depth2Count += parentSelectedCount;
          console.log(`      ✅ Selected ${parentSelectedCount} children from ${parentData.tiers.length} tier(s)`);
        });
      }

      console.log(`📊 After depth2 selection: depth2 added ${depth2Count} refs, total nodes in set: ${selectedNodeIds.size}`);
      console.log(`📊 FINAL SUMMARY: depth1 (${currentCount} refs from tiers) + depth2 (${depth2Count} refs) = ${selectedNodeIds.size} unique selected nodes`);
      console.log(`   Expected total papers: ${selectedNodeIds.size + 1} (including main paper ${mainPaperId})`);

      // Filter nodes: Keep main paper + selected tier nodes from both depths
      console.log(`🔍 Filtering: ${selectedNodeIds.size} selected nodes + 1 main paper (${mainPaperId}) from ${network.nodes.length} total nodes`);
      
      filteredNodes = network.nodes.filter((node: any) => {
        // Always keep main paper (depth 0)
        if (node.id === mainPaperId) return true;

        // Keep selected tier nodes
        return selectedNodeIds.has(node.id);
      });

      console.log(`   Result: ${filteredNodes.length} nodes kept (should be ${selectedNodeIds.size + 1} with main paper)`);
      
      // Verify depth distribution
      const depth0Count = filteredNodes.filter((n: any) => ((n as any).networkDepth ?? (n as any).citationDepth ?? 0) === 0).length;
      const depth1Count = filteredNodes.filter((n: any) => ((n as any).networkDepth ?? (n as any).citationDepth ?? 0) === 1).length;
      const depth2Count_actual = filteredNodes.filter((n: any) => ((n as any).networkDepth ?? (n as any).citationDepth ?? 0) === 2).length;
      console.log(`   Distribution: depth0=${depth0Count}, depth1=${depth1Count}, depth2=${depth2Count_actual}`);

      const filteredNodeIds = new Set(filteredNodes.map((n: any) => n.id));
      filteredEdges = network.edges.filter((edge: any) => {
        const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
        return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
      });
    } else if (filteredNodes.length > (selectedTierLevel === 0 ? 1000 : 50)) {
      // Fallback: Simple limit when no references or no tiers (keep most connected nodes)
      const limit = selectedTierLevel === 0 ? 1000 : 50;
      const sortedNodes = [...filteredNodes].sort((a: any, b: any) => {
        const aConnections = network.edges.filter((e: any) =>
          (typeof e.source === 'object' ? e.source.id : e.source) === a.id ||
          (typeof e.target === 'object' ? e.target.id : e.target) === a.id
        ).length;
        const bConnections = network.edges.filter((e: any) =>
          (typeof e.source === 'object' ? e.source.id : e.source) === b.id ||
          (typeof e.target === 'object' ? e.target.id : e.target) === b.id
        ).length;
        return bConnections - aConnections;
      });

      filteredNodes = sortedNodes.slice(0, limit);
      const filteredNodeIds = new Set(filteredNodes.map((n: any) => n.id));
      filteredEdges = network.edges.filter((edge: any) => {
        const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
        return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
      });
    }

    return { filteredNodes, filteredEdges };
  }, [network, showTopOnly, depth1Tiers, selectedTierLevel, selectedTierLevelDepth2, depth2ParentData, selectedDepth2TierLevels, references.length, id]);

  // Update filtered counts when filtered data changes
  useEffect(() => {
    setFilteredCount({ nodes: filteredNodes.length, edges: filteredEdges.length });
  }, [filteredNodes.length, filteredEdges.length]);

  useEffect(() => {
    if (!network || !svgRef.current || !containerRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const width = Math.max(containerWidth - 40, 1200);
    const height = 900;

    // Initialize ALL node positions BEFORE creating links (prevents links from being invisible)
    network.nodes.forEach((node: any) => {
      if (node.x === undefined) node.x = width / 2 + (Math.random() - 0.5) * 100;
      if (node.y === undefined) node.y = height / 2 + (Math.random() - 0.5) * 100;
    });
    
    // Ensure filtered nodes also have positions
    filteredNodes.forEach((node: any) => {
      if (node.x === undefined) node.x = width / 2 + (Math.random() - 0.5) * 100;
      if (node.y === undefined) node.y = height / 2 + (Math.random() - 0.5) * 100;
    });

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height] as any)
      .style('background', 'radial-gradient(circle at 50% 50%, #f5f7fa 0%, #e8ecf1 50%, #dfe3e8 100%)')
      .style('border-radius', '12px')
      .style('box-shadow', '0 4px 20px rgba(0,0,0,0.08)');

    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);
    (svg as any).zoomBehavior = zoom;

    const defs = svg.append('defs');

    // Enhanced gradients with better visibility
    defs.append('radialGradient')
      .attr('id', 'influential-gradient')
      .html(`
        <stop offset="0%" style="stop-color:#ffeb3b;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#ffd700;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ff8c00;stop-opacity:0.9" />
      `);

    defs.append('radialGradient')
      .attr('id', 'high-relevance-gradient')
      .html(`
        <stop offset="0%" style="stop-color:#66bb6a;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#4caf50;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#2e7d32;stop-opacity:0.9" />
      `);

    defs.append('radialGradient')
      .attr('id', 'current-paper-gradient')
      .html(`
        <stop offset="0%" style="stop-color:#ff6b9d;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#dc004e;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#9a0036;stop-opacity:0.9" />
      `);

    // Improved arrow markers with better visibility - pointing back to citing paper
    [
      { id: 0, color: '#999', size: 6 },
      { id: 1, color: '#4caf50', size: 8 },
      { id: 2, color: '#ffd700', size: 9 },
      { id: 3, color: '#ff9800', size: 8 }, // Orange marker for deep2 links
      { id: 4, color: '#1565c0', size: 8 }  // Blue marker for deep1 links
    ].forEach(({ id, color, size }) => {
      defs.append('marker')
        .attr('id', `arrowhead-${id}`)
        .attr('viewBox', '-10 -5 10 10')
        .attr('refX', -5) // Position at line start (edge of path)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', size)
        .attr('markerHeight', size)
        .append('svg:path')
        .attr('d', 'M 0,-5 L -10,0 L 0,5') // Arrow pointing left (toward source)
        .attr('fill', color)
        .attr('stroke', color)
        .attr('stroke-width', 0.5);
    });

    // Add shadow filter for better depth
    const filter = defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3);

    filter.append('feOffset')
      .attr('dx', 0)
      .attr('dy', 2)
      .attr('result', 'offsetblur');

    filter.append('feComponentTransfer')
      .append('feFuncA')
      .attr('type', 'linear')
      .attr('slope', 0.3);

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create node map for edge resolution
    const nodeMap = new Map(filteredNodes.map((node: any) => [node.id, node]));

    // Resolve edges to use node objects instead of IDs and filter out invalid edges
    const resolvedEdges = filteredEdges
      .map((edge: any) => ({
        ...edge,
        source: nodeMap.get(typeof edge.source === 'object' ? edge.source.id : edge.source),
        target: nodeMap.get(typeof edge.target === 'object' ? edge.target.id : edge.target),
      }))
      .filter((edge: any) => edge.source && edge.target); // Remove edges with undefined nodes

    // Enhanced links with curved paths - CREATE FIRST before layout logic
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(resolvedEdges)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (d: any) => {
        // Calculate edge depth based on source node's network depth (edges from level N point to level N+1)
        const sourceDepth = d.source?.networkDepth ?? d.source?.citationDepth ?? 0;
        
        // Check source depth - edges from level 1 nodes go to level 2 nodes
        if (sourceDepth === 1) return '#ff9800'; // Orange color for edges from depth 1 nodes (to depth 2)
        if (sourceDepth === 0) return '#1565c0'; // Blue color for edges from depth 0 nodes (to depth 1)
        
        // if (d.isInfluential) return '#ffd700'; // Commented out influential color
        if (d.relevanceScore && d.relevanceScore >= 0.8) return '#4caf50';
        if (d.relevanceScore && d.relevanceScore >= 0.6) return '#8bc34a';
        if (d.relevanceScore && d.relevanceScore >= 0.4) return '#ffc107';
        if (d.relevanceScore && d.relevanceScore > 0) return '#ff9800';
        return '#bdbdbd';
      })
      .attr('stroke-opacity', (d: any) => {
        const sourceDepth = d.source?.networkDepth ?? d.source?.citationDepth ?? 0;
        if (sourceDepth === 1) return 0.8; // Higher opacity for edges from depth 1
        if (sourceDepth === 0) return 0.7; // Medium opacity for edges from depth 0
        if (d.relevanceScore) return 0.4 + d.relevanceScore * 0.5;
        return 0.3;
      })
      .attr('stroke-width', (d: any) => {
        const sourceDepth = d.source?.networkDepth ?? d.source?.citationDepth ?? 0;
        if (sourceDepth === 1) return 3.5; // Thicker for edges from depth 1
        if (sourceDepth === 0) return 3; // Medium thickness for edges from depth 0
        // if (d.isInfluential) return 4; // Commented out influential radius
        if (d.relevanceScore && d.relevanceScore >= 0.7) return 3.5;
        if (d.relevanceScore && d.relevanceScore >= 0.4) return 3;
        return 2;
      })
      .attr('marker-start', (d: any) => { // Changed to marker-start for reversed arrow
        const sourceDepth = d.source?.networkDepth ?? d.source?.citationDepth ?? 0;
        if (sourceDepth === 1) return 'url(#arrowhead-3)'; // Orange arrow for edges from depth 1
        if (sourceDepth === 0) return 'url(#arrowhead-4)'; // Blue arrow for edges from depth 0
        // if (d.isInfluential) return 'url(#arrowhead-2)'; // Commented out influential marker
        if (d.relevanceScore && d.relevanceScore >= 0.7) return 'url(#arrowhead-1)';
        return 'url(#arrowhead-0)';
      })
      .attr('stroke-dasharray', (d: any) => {
        const sourceDepth = d.source?.networkDepth ?? d.source?.citationDepth ?? 0;
        if (sourceDepth === 1) return 'none'; // Solid line for edges from depth 1
        if (sourceDepth === 0) return 'none'; // Solid line for edges from depth 0
        if (!d.relevanceScore || d.relevanceScore < 0.3) return '5,5';
        return 'none';
      })
      .attr('pointer-events', 'none') // Disable pointer events on links
      .style('cursor', 'default'); // Remove pointer cursor
    
    // Add tooltips to links
    link.append('title')
      .text((d: any) => {
        const sourceTitle = d.source?.title || 'Unknown';
        const targetTitle = d.target?.title || 'Unknown';
        const sourceDepth = d.source?.networkDepth ?? d.source?.citationDepth ?? 0;
        const parts = [
          `📄 From: ${sourceTitle.substring(0, 50)}${sourceTitle.length > 50 ? '...' : ''}`,
          `📄 To: ${targetTitle.substring(0, 50)}${targetTitle.length > 50 ? '...' : ''}`,
          '',
          sourceDepth === 1 ? '🔗 Level 2 Connection (from Level 1)' : sourceDepth === 0 ? '🔗 Level 1 Connection (from root)' : '🔗 Other Connection',
          d.relevanceScore ? `⭐ Relevance: ${(d.relevanceScore * 100).toFixed(0)}%` : '❓ Not rated',
          // d.isInfluential ? '🌟 Highly Influential Citation' : '', // Commented out influential tooltip
        ];
        return parts.filter(Boolean).join('\n');
      });

    // Layout logic based on toggle
    if (useTreeLayout) {
      // === TREE TIMELINE LAYOUT ===
      
      // Group nodes by year
      const nodesByYear = d3.group(filteredNodes, (d: any) => d.year || 'Unknown');
      const years = Array.from(nodesByYear.keys()).sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return Number(b) - Number(a); // Descending (newest first, top to bottom)
      });

      // console.log('📅 Years in network:', years);
      // console.log('📊 Nodes per year:', Array.from(nodesByYear.entries()).map(([y, nodes]) => `${y}: ${nodes.length}`));

      // Calculate layout
      const yearHeight = 150; // Space between year groups (reduced from 200)
      const yearLabelOffset = 120; // Left margin for year labels
      const nodeSpacing = 200; // Horizontal spacing between nodes in same year (reduced from 180 to 200 for better wrapping)
      let currentY = 120; // Starting Y position

      // Position nodes by year
      filteredNodes.forEach((node: any) => {
        const yearNodes = nodesByYear.get(node.year || 'Unknown')!;
        const yearIndex = years.indexOf(node.year || 'Unknown');
        const nodeIndexInYear = yearNodes.indexOf(node);
        
        // Calculate position
        const nodesInThisYear = yearNodes.length;
        const totalWidth = nodesInThisYear * nodeSpacing;
        const startX = (width - totalWidth) / 2 + yearLabelOffset;
        
        node.x = startX + nodeIndexInYear * nodeSpacing;
        node.y = currentY + yearIndex * yearHeight;
        node.fx = node.x; // Fix position
        node.fy = node.y;
      });

      // Draw year separators and labels
      const yearGroups = g.append('g').attr('class', 'year-groups');
      
      years.forEach((year, index) => {
        const y = currentY + index * yearHeight;
        const nodes = nodesByYear.get(year)!;
        
        // Year separator line
        yearGroups.append('line')
          .attr('x1', 100)
          .attr('y1', y - 80)
          .attr('x2', width - 50)
          .attr('y2', y - 80)
          .attr('stroke', '#dee2e6')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('opacity', 0.5);
        
        // Year label background
        yearGroups.append('rect')
          .attr('x', 15)
          .attr('y', y - 95)
          .attr('width', 80)
          .attr('height', 50)
          .attr('fill', '#fff')
          .attr('stroke', '#90caf9')
          .attr('stroke-width', 2)
          .attr('rx', 8);
        
        // Year label text
        yearGroups.append('text')
          .attr('x', 55)
          .attr('y', y - 75)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .attr('fill', '#1976d2')
          .text(year);
        
        // Node count
        yearGroups.append('text')
          .attr('x', 55)
          .attr('y', y - 55)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('fill', '#666')
          .text(`${nodes.length} ${nodes.length === 1 ? 'paper' : 'papers'}`);
      });

    } else {
      // === FORCE-DIRECTED LAYOUT ===
      
      // Improved force simulation for better layout
      const simulation = d3
        .forceSimulation(filteredNodes as any)
        .force(
          'link',
          d3
            .forceLink(resolvedEdges)
            .id((d: any) => d.id)
            .distance(250)
            .strength(0.3)
        )
        .force('charge', d3.forceManyBody().strength(-800))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(50))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05))
        .alphaDecay(0.02)
        .alphaTarget(0);

      // Update positions on tick
      simulation.on('tick', () => {
        link.attr('d', linkArc as any);
        node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });
    }

    // Create nodes after links (for proper z-order)
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(filteredNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => {
        event.stopPropagation();
        setSelectedNode(d);
        setDrawerOpen(true);
      })
      .on('mouseenter', function(_event, d: any) {
        d3.select(this)
          .raise()
          .transition()
          .duration(200)
          .attr('transform', `translate(${d.x},${d.y}) scale(1.15)`);
        
        link.attr('stroke-opacity', (l: any) => {
          if (l.source.id === d.id || l.target.id === d.id) return 0.9;
          return 0.08;
        });
        
        node.attr('opacity', (n: any) => {
          if (n.id === d.id) return 1;
          const isConnected = filteredEdges.some((e: any) => 
            (e.source.id === d.id && e.target.id === n.id) || 
            (e.target.id === d.id && e.source.id === n.id)
          );
          return isConnected ? 0.7 : 0.2;
        });
      })
      .on('mouseleave', function(_event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', `translate(${d.x},${d.y}) scale(1)`);
        
        link.attr('stroke-opacity', (l: any) => {
          const targetDepth = l.target.networkDepth;
          if (targetDepth === 2) return 0.8;
          if (targetDepth === 1) return 0.7;
          if (l.relevanceScore) return 0.4 + l.relevanceScore * 0.5;
          return 0.3;
        });
        
        node.attr('opacity', 1);
      })
      .call(
        d3.drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Rectangle node with title inside (instead of circle + separate label)
    const nodeWidth = 180;
    const nodeHeight = 75; // Increased height to accommodate wrapped text
    
    // Add gradient definitions for nodes
    const nodeGradients = [
      { id: 'grad-main', color1: '#e91e63', color2: '#c2185b' },
      { id: 'grad-influential-0', color1: '#ffa726', color2: '#f57c00' },
      { id: 'grad-influential-1', color1: '#ffb74d', color2: '#ff9800' },
      { id: 'grad-influential-depth2', color1: '#ffb74d', color2: '#4caf50' }, // Yellow-green for influential depth 2
      { id: 'grad-influential-2', color1: '#ffcc80', color2: '#ffb74d' },
      { id: 'grad-depth-0', color1: '#66bb6a', color2: '#43a047' },
      { id: 'grad-depth-1', color1: '#42a5f5', color2: '#1e88e5' },
      { id: 'grad-depth-2', color1: '#4caf50', color2: '#2e7d32' }, // Green gradient for depth 2 - distinct from blue level 1
      { id: 'grad-default', color1: '#90a4ae', color2: '#607d8b' }
    ];

    nodeGradients.forEach(({ id, color1, color2 }) => {
      const gradient = defs.append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color1);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color2);
    });
    
    node.append('rect')
      .attr('class', 'node-rect')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', (d: any) => {
        const depth = d.networkDepth ?? d.citationDepth ?? 0;
        if (d.id === Number(id)) return 'url(#grad-main)';
        
        // Depth colors have HIGHEST priority for visual distinction
        // if (depth === 0) return d.isInfluential ? 'url(#grad-influential-0)' : 'url(#grad-depth-0)'; // Commented out influential gradients
        // if (depth === 1) return d.isInfluential ? 'url(#grad-influential-1)' : 'url(#grad-depth-1)'; // Commented out influential gradients
        // if (depth === 2) return d.isInfluential ? 'url(#grad-influential-depth2)' : 'url(#grad-depth-2)'; // Commented out influential gradients
        
        // For deeper levels, use influential or default
        // return d.isInfluential ? 'url(#grad-influential-2)' : 'url(#grad-default)'; // Commented out influential gradients
        if (depth === 0) return 'url(#grad-depth-0)';
        if (depth === 1) return 'url(#grad-depth-1)';
        if (depth === 2) return 'url(#grad-depth-2)';
        return 'url(#grad-default)';
      })
      .attr('stroke', (d: any) => {
        if (d.id === Number(id)) return '#ad1457';
        // if (d.isInfluential) return '#e65100'; // Commented out influential stroke color
        const depth = d.networkDepth ?? d.citationDepth ?? 0;
        if (depth === 0) return '#2e7d32';
        if (depth === 1) return '#1565c0';
        if (depth === 2) return '#d84315'; // Dark orange for depth 2 stroke
        return '#455a64';
      })
      .attr('stroke-width', (d: any) => {
        if (d.id === Number(id)) return 3.5;
        // if (d.isInfluential) return 3; // Commented out influential stroke width
        return 2;
      })
      .attr('filter', 'url(#node-shadow)')
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function (this: any) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr('stroke-width', 5)
          .attr('rx', 12)
          .attr('ry', 12);
      })
      .on('mouseleave', function (this: any, _: any, d: any) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr('stroke-width', d.id === Number(id) ? 3.5 : d.isInfluential ? 3 : 2)
          .attr('rx', 10)
          .attr('ry', 10);
      });

    // Title text with word wrapping using foreignObject
    node.append('foreignObject')
      .attr('x', -nodeWidth / 2 + 5)
      .attr('y', -nodeHeight / 2 + 5)
      .attr('width', nodeWidth - 10)
      .attr('height', nodeHeight - 25) // Leave space for year badge
      .style('pointer-events', 'none') // Allow drag events to pass through
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('text-align', 'center')
      .style('font-size', '11px')
      .style('font-weight', (d: any) => (d.id === Number(id) ? 'bold' : /* d.isInfluential ? '600' : */ 'normal'))
      .style('color', '#fff')
      .style('line-height', '1.3')
      .style('overflow', 'hidden')
      .style('word-wrap', 'break-word')
      .style('padding', '2px')
      .style('pointer-events', 'none') // Also on the div
      .text((d: any) => {
        const title = d.title || 'Untitled';
        // Allow longer titles since they can wrap
        return title.length > 60 ? title.substring(0, 60) + '...' : title;
      });

    // Year and badge at bottom
    node.append('text')
      .attr('x', 0)
      .attr('y', nodeHeight / 2 - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#fff')
      .attr('opacity', 0.9)
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const year = d.year || d.publicationYear || '';
        // const badge = d.isInfluential ? ' ⭐' : ''; // Commented out influential badge
        return `${year}`.trim();
      });

    // Relevance score badge (small circle on top-right corner)
    node.filter((d: any) => d.relevanceScore && d.relevanceScore > 0)
      .append('circle')
      .attr('r', 11)
      .attr('cx', nodeWidth / 2 - 12)
      .attr('cy', -nodeHeight / 2 + 12)
      .attr('fill', (d: any) => {
        const score = d.relevanceScore;
        if (score >= 0.8) return '#4caf50';
        if (score >= 0.6) return '#8bc34a';
        if (score >= 0.4) return '#ffc107';
        return '#ff9800';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.filter((d: any) => d.relevanceScore && d.relevanceScore > 0)
      .append('text')
      .attr('x', nodeWidth / 2 - 12)
      .attr('y', -nodeHeight / 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', 8)
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d: any) => Math.round(d.relevanceScore * 100));

    // Enhanced tooltip
    node.append('title')
      .text((d: any) => {
        const depth = d.networkDepth ?? d.citationDepth ?? 0;
        const depthLabel = depth === 0 ? 'Direct Reference' :
          depth === 1 ? 'Nested Reference (Lv1)' :
            depth === 2 ? 'Deep Reference (Lv2)' :
              `Very Deep Reference (Lv${depth})`;

        const parts = [
          `📄 Title: ${d.title || 'Untitled'}`,
          '',
          `🔗 ${depthLabel}`,
          d.year ? `📅 Year: ${d.year}` : '',
          d.authors ? `✍️ Authors: ${typeof d.authors === 'string' ? d.authors.substring(0, 100) : d.authors.slice(0, 3).join(', ')}${typeof d.authors === 'string' && d.authors.length > 100 ? '...' : ''}` : '',
          d.doi ? `🔗 DOI: ${d.doi}` : '',
          '',
          d.relevanceScore ? `⭐ Relevance: ${(d.relevanceScore * 100).toFixed(0)}% ${d.relevanceScore >= 0.8 ? '(High)' : d.relevanceScore >= 0.6 ? '(Good)' : d.relevanceScore >= 0.4 ? '(Medium)' : '(Low)'}` : '❓ Not rated yet',
          // d.isInfluential ? '🌟 Influential Reference' : '', // Commented out influential tooltip
          '',
          '🖱️ Hover: Highlight connections',
          '💡 Click: View details and rate'
        ];
        return parts.filter(Boolean).join('\n');
      });

    // NO separate labels - text is inside rectangles now

// Helper function for link paths - straight lines from edge to edge
    function linkArc(d: any) {
      const nodeWidth = 180;
      const nodeHeight = 75;

      const sourceX = d.source?.x ?? width / 2;
      const sourceY = d.source?.y ?? height / 2;
      const targetX = d.target?.x ?? width / 2;
      const targetY = d.target?.y ?? height / 2;

      // Calculate angle from source to target
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const angle = Math.atan2(dy, dx);

      // Calculate edge intersection points for rectangles
      function getEdgePoint(centerX: number, centerY: number, angle: number) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const halfW = nodeWidth / 2;
        const halfH = nodeHeight / 2;

        // Check which edge the line intersects
        if (Math.abs(cos) > Math.abs(sin) * (halfW / halfH)) {
          // Intersects left or right edge
          const x = centerX + (cos > 0 ? halfW : -halfW);
          const y = centerY + (cos > 0 ? halfW : -halfW) * sin / cos;
          return { x, y };
        } else {
          // Intersects top or bottom edge
          const x = centerX + (sin > 0 ? halfH : -halfH) * cos / sin;
          const y = centerY + (sin > 0 ? halfH : -halfH);
          return { x, y };
        }
      }

      const sourceEdge = getEdgePoint(sourceX, sourceY, angle);
      const targetEdge = getEdgePoint(targetX, targetY, angle + Math.PI);

      // Draw STRAIGHT LINE from source edge to target edge
      return `M${sourceEdge.x},${sourceEdge.y} L${targetEdge.x},${targetEdge.y}`;
    }

    // Drag functions
    function dragstarted(_event: any, d: any) {
      if (useTreeLayout) {
        // In tree layout, temporarily unfix position
        d.fx = d.x;
        d.fy = d.y;
      } else {
        // In force layout, fix position and restart simulation
        d.fx = d.x;
        d.fy = d.y;
        if ((svg as any).simulation) {
          (svg as any).simulation.alphaTarget(0.3).restart();
        }
      }
    }

    function dragged(event: any, d: any) {
      // Update fixed position as user drags
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(_event: any, _d: any) {
      if (useTreeLayout) {
        // Keep node at dragged position in tree layout
        // d.fx and d.fy remain set
      } else {
        // In force layout, keep node fixed at dragged position
        // Don't release fx/fy - let user decide if they want to unfix
        if ((svg as any).simulation) {
          (svg as any).simulation.alphaTarget(0);
        }
      }
    }

    // Update link and node positions
    if (useTreeLayout) {
      // Static positions for tree layout - set positions immediately
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      // Force immediate link update - nodes already have x,y from positioning logic above
      link.attr('d', linkArc as any);
    }

    // Store simulation reference for cleanup
    if (!useTreeLayout && (svg as any).simulation) {
      (svg as any).cleanup = () => {
        (svg as any).simulation.stop();
      };
    }

    return () => {
      if ((svg as any).cleanup) (svg as any).cleanup();
    };
  }, [network, id, useTreeLayout, selectedTierLevel, selectedTierLevelDepth2, selectedDepth2TierLevels, depth1Tiers, depth2Tiers, references, showTopOnly]);

  const handleZoomIn = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = (svg as any).zoomBehavior;
      if (zoom) svg.transition().duration(300).call(zoom.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = (svg as any).zoomBehavior;
      if (zoom) svg.transition().duration(300).call(zoom.scaleBy, 0.7);
    }
  };

  const handleResetView = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = (svg as any).zoomBehavior;
      const simulation = (svg as any).simulation;

      if (zoom) svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      if (simulation) simulation.alpha(1).restart();
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!network) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error">Failed to load citation network</Alert>
      </Container>
    );
  }

  return (
    // <Container maxWidth="xl">
    <Container maxWidth="xl" sx={{ position: 'relative' }}>
      {/* Back button top-left */}
      <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1300 }}>
        <Tooltip title="Back">
          <IconButton
            onClick={() => navigate(-1)}
            aria-label="back"
            size="large"
            sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <ArrowBack />
          </IconButton>
        </Tooltip>
      </Box>
      {/* <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}> */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={2}
        sx={{ pl: 6 }} // shift header right so Back button doesn't overlap
      >
        <Box>
          <Typography variant="h4">Citation Network</Typography>
          {network && network.nodes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {network.nodes.find((n: any) => n.type === 'main')?.title || 'Loading...'}
            </Typography>
          )}
        </Box>

        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Depth</InputLabel>
            <Select
              value={depth}
              label="Depth"
              onChange={(e) => setDepth(e.target.value as number)}
            >
              <MenuItem value={1}>1 Level</MenuItem>
              <MenuItem value={2}>2 Levels</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddNodeDialog(true)}
            size="small"
          >
            Add Reference
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>
          Legend
        </Typography>

        {/* Depth-based colors */}
        <Typography variant="caption" color="textSecondary" gutterBottom display="block">
          Citation Depth:
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Circle sx={{ color: '#dc004e', fontSize: 22 }} />
            <Typography variant="body2">Main Paper</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Circle sx={{ color: '#1565c0', fontSize: 18 }} />
            <Typography variant="body2">Level 1 (Direct)</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Circle sx={{ color: '#ff9800', fontSize: 18 }} />
            <Typography variant="body2">Level 2 (Nested)</Typography>
          </Box>
        </Stack>

      </Paper>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <Chip
          icon={<Circle />}
          label={`${network.nodes.length} Total Papers`}
          color="default"
          variant="outlined"
        />
        {showTopOnly && depth1Tiers && depth1Tiers.length > 0 ? (
          <>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Depth 1 Tier Level</InputLabel>
              <Select
                value={selectedTierLevel}
                label="Depth 1 Tier Level"
                onChange={(e) => setSelectedTierLevel(Number(e.target.value))}
              >
                {depth1Tiers.map((tier) => {
                  return (
                    <MenuItem key={tier.tier} value={tier.tier}>
                      Tier 1-{tier.tier} ({tier.nodeCount} papers)
                    </MenuItem>
                  );
                })}
                <MenuItem value={0}>All Depth 1 Tiers ({depth1Tiers.reduce((sum, t) => sum + t.nodeCount, 0) || 0} papers)</MenuItem>
              </Select>
            </FormControl>
            {depth2Tiers.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Depth 2 Tier Level</InputLabel>
                <Select
                  value={selectedTierLevelDepth2}
                  label="Depth 2 Tier Level"
                  onChange={(e) => setSelectedTierLevelDepth2(Number(e.target.value))}
                >
                  <MenuItem value={0}>None</MenuItem>
                  {depth2Tiers.map((tier, index) => {
                    const parentData = depth2ParentData[index];
                    const parentName = parentData?.parentNode.title?.substring(0, 30) || `Parent ${tier.parentId}`;
                    return (
                      <MenuItem key={tier.tier} value={tier.tier}>
                        Show {tier.tier} parent{tier.tier > 1 ? 's' : ''} ({parentName}...)
                      </MenuItem>
                    );
                  })}
                  <MenuItem value={depth2Tiers.length}>All Parents ({depth2Tiers.reduce((sum, t) => sum + t.nodeCount, 0)} refs)</MenuItem>
                </Select>
              </FormControl>
            )}
            {/* Per-parent tier controls */}
            {selectedTierLevelDepth2 > 0 && depth2ParentData.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Per-Parent Tier Selection:</Typography>
                {depth2ParentData.slice(0, selectedTierLevelDepth2).map((parentData, index) => {
                  const currentTierLevel = selectedDepth2TierLevels[parentData.parentId] ?? 1;
                  const parentName = parentData.parentNode.title?.substring(0, 25) || `Parent ${parentData.parentId}`;
                  return (
                    <Box key={parentData.parentId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ minWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {index + 1}. {parentName}
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={currentTierLevel}
                          onChange={(e) => setSelectedDepth2TierLevels(prev => ({
                            ...prev,
                            [parentData.parentId]: Number(e.target.value)
                          }))}
                          sx={{ fontSize: '0.75rem', py: 0.5 }}
                        >
                          {parentData.tiers.map((tier) => (
                            <MenuItem key={tier.tier} value={tier.tier}>
                              Tier {tier.tier} ({tier.nodeCount})
                            </MenuItem>
                          ))}
                          <MenuItem value={999}>All ({parentData.totalChildren})</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        ) : (
          <Tooltip title="Enable tier selection by adding references">
            <Chip
              icon={<FilterList />}
              label="Tier Selection"
              color="default"
              variant="outlined"
              sx={{ opacity: 0.6 }}
            />
          </Tooltip>
        )}
        {showTopOnly && filteredCount.nodes > 0 && (
          <>
            <Chip
              label={`Showing ${filteredCount.nodes} Papers`}
              color="primary"
              variant="outlined"
            />
          </>
        )}
        {!showTopOnly && (
          <Chip
            label={`Showing ${filteredCount.nodes} Papers`}
            color="primary"
            variant="outlined"
          />
        )}

        {/* {references.filter(r => r.isInfluential).length > 0 && (
          <Chip
            icon={<Star />}
            label={`${references.filter(r => r.isInfluential).length} Influential`}
            sx={{ bgcolor: '#ffd700', color: '#000', fontWeight: 'bold' }}
          />
        )} */}
      </Box>

      <Paper elevation={3} sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
        <Box
          position="absolute"
          top={16}
          right={16}
          zIndex={1}
          display="flex"
          flexDirection="column"
          gap={1}
        >
          <Tooltip title="Zoom In" placement="left">
            <IconButton
              onClick={handleZoomIn}
              sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out" placement="left">
            <IconButton
              onClick={handleZoomOut}
              sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View" placement="left">
            <IconButton
              onClick={handleResetView}
              sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <RestartAlt />
            </IconButton>
          </Tooltip>
          <Tooltip title={useTreeLayout ? 'Force Layout' : 'Tree Layout'} placement="left">
            <IconButton
              onClick={() => setUseTreeLayout(!useTreeLayout)}
              sx={{ 
                bgcolor: useTreeLayout ? 'primary.main' : 'background.paper', 
                color: useTreeLayout ? 'white' : 'inherit',
                '&:hover': { bgcolor: useTreeLayout ? 'primary.dark' : 'action.hover' } 
              }}
            >
              <AccountTree />
            </IconButton>
          </Tooltip>
        </Box>

        <Box ref={containerRef} display="flex" justifyContent="center" sx={{ bgcolor: '#fafafa' }}>
          <svg ref={svgRef}></svg>
        </Box>

      </Paper>

      {/* Add Manual Node Dialog */}
      <Dialog
        open={addNodeDialog}
        onClose={() => setAddNodeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Reference Manually</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Paper Title"
              fullWidth
              required
              value={newNodeData.title}
              onChange={(e) => setNewNodeData({ ...newNodeData, title: e.target.value })}
              helperText="Enter the full title of the paper"
            />

            <TextField
              label="Authors"
              fullWidth
              required
              value={newNodeData.authors}
              onChange={(e) => setNewNodeData({ ...newNodeData, authors: e.target.value })}
              helperText="Separate multiple authors with commas"
            />

            <TextField
              label="Publication Year"
              type="number"
              fullWidth
              required
              value={newNodeData.year}
              onChange={(e) => setNewNodeData({ ...newNodeData, year: parseInt(e.target.value) || new Date().getFullYear() })}
              inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
            />

            <TextField
              label="DOI (Optional)"
              fullWidth
              value={newNodeData.doi}
              onChange={(e) => setNewNodeData({ ...newNodeData, doi: e.target.value })}
              helperText="Digital Object Identifier, e.g., 10.1234/example"
            />

            <Box>
              <Typography gutterBottom>
                Relevance Score: {(newNodeData.relevanceScore * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={newNodeData.relevanceScore}
                onChange={(_, value) => setNewNodeData({ ...newNodeData, relevanceScore: value as number })}
                min={0}
                max={1}
                step={0.05}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.25, label: '25%' },
                  { value: 0.5, label: '50%' },
                  { value: 0.75, label: '75%' },
                  { value: 1, label: '100%' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Typography variant="caption" color="text.secondary">
                How relevant is this paper to your research?
              </Typography>
            </Box>

            <TextField
              label="Citation Context (Optional)"
              fullWidth
              multiline
              rows={3}
              value={newNodeData.citationContext}
              onChange={(e) => setNewNodeData({ ...newNodeData, citationContext: e.target.value })}
              helperText="Add notes about why this paper is relevant"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddNodeDialog(false)}>Cancel</Button>
          <Button
            onClick={() => addManualNodeMutation.mutate(newNodeData)}
            variant="contained"
            disabled={!newNodeData.title || !newNodeData.authors || addManualNodeMutation.isPending}
          >
            {addManualNodeMutation.isPending ? <CircularProgress size={24} /> : 'Add Reference'}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        disableRestoreFocus
        ModalProps={{
          keepMounted: false,
          disableRestoreFocus: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 450 },
          },
        }}
      >
        {selectedNode && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
              <Typography variant="h6">Paper Details</Typography>
              <IconButton onClick={() => setDrawerOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Title
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedNode.title}
                </Typography>

                <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
                  Authors
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedNode.authors}
                </Typography>

                {(() => {
                  // Find citation context from references
                  const citation = references.find(
                    (r: any) => r.citedPaper?.id === selectedNode.id
                  );
                  return citation?.citationContext ? (
                    <>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
                        📝 Citation Context / Note
                      </Typography>
                      <Typography
                        variant="body2"
                        gutterBottom
                        sx={{
                          p: 1.5,
                          bgcolor: 'rgba(25, 118, 210, 0.08)',
                          borderLeft: '3px solid #1976d2',
                          borderRadius: 1,
                          fontStyle: 'italic',
                        }}
                      >
                        {citation.citationContext}
                      </Typography>
                    </>
                  ) : null;
                })()}

                <Box display="flex" gap={2} mt={2}>
                  <Box flex={1}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Citation Depth
                    </Typography>
                    <Chip
                      label={(() => {
                        const depth = selectedNode.networkDepth ?? selectedNode.citationDepth ?? 0;
                        if (depth === 0) return 'Direct Reference';
                        if (depth === 1) return 'Nested (Level 1)';
                        if (depth === 2) return 'Deep (Level 2)';
                        return `Very Deep (Level ${depth})`;
                      })()}
                      size="small"
                      color={(() => {
                        const depth = selectedNode.networkDepth ?? selectedNode.citationDepth ?? 0;
                        if (depth === 0) return 'success';
                        if (depth === 1) return 'info';
                        if (depth === 2) return 'secondary';
                        return 'default';
                      })()}
                    />
                  </Box>

                  <Box flex={1}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Year
                    </Typography>
                    <Typography variant="body2">{selectedNode.year || 'N/A'}</Typography>
                  </Box>
                </Box>

                {/* DOI Information */}
                {selectedNode.doi && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      🔑 DOI
                    </Typography>
                    <Box
                      sx={{
                        p: 1,
                        bgcolor: 'rgba(76, 175, 80, 0.08)',
                        borderRadius: 1,
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          wordBreak: 'break-all',
                          flex: 1,
                        }}
                      >
                        {selectedNode.doi}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => {
                          window.open(`https://doi.org/${selectedNode.doi}`, '_blank');
                        }}
                        title="Open DOI link"
                      >
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                )}

                <Box display="flex" gap={2} mt={2}>
                  <Box flex={1}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Relevance Score
                    </Typography>
                    {selectedNode.relevanceScore ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={`${(selectedNode.relevanceScore * 100).toFixed(0)}%`}
                          size="small"
                          sx={{
                            bgcolor: selectedNode.relevanceScore >= 0.8 ? '#4caf50' :
                              selectedNode.relevanceScore >= 0.6 ? '#8bc34a' :
                                selectedNode.relevanceScore >= 0.4 ? '#ffc107' : '#ff9800',
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        />
                        <Rating
                          value={selectedNode.relevanceScore * 5}
                          precision={0.1}
                          readOnly
                          size="small"
                        />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">Not rated</Typography>
                    )}
                  </Box>
                </Box>

                <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                  {selectedNode.id === Number(id) && (
                    <Chip label="Current Paper" color="error" size="small" />
                  )}
                  {/* {selectedNode.isInfluential && (
                    <Chip
                      label="⭐ Influential"
                      size="small"
                      sx={{ bgcolor: '#ffd700', color: '#000', fontWeight: 'bold' }}
                    />
                  )} */}
                </Box>
              </CardContent>
            </Card>

            <Stack spacing={1}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<OpenInNew />}
                onClick={() => {
                  navigate(`/papers/${selectedNode.id}`);
                  setDrawerOpen(false);
                }}
              >
                View Full Details
              </Button>

              {(() => {
                // Check if this node already has references in the network
                const hasReferences = network?.edges?.some((edge: any) => 
                  (typeof edge.source === 'object' ? edge.source.id : edge.source) === selectedNode.id
                ) || selectedNodeReferences.length > 0;

                return (
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={fetchReferencesMutation.isPending ? <CircularProgress size={20} /> : <AccountTree />}
                    onClick={() => {
                      const loadingToast = toast.loading('Fetching references for this paper...');
                      fetchReferencesMutation.mutate(selectedNode.id, {
                        onSettled: () => {
                          toast.dismiss(loadingToast);
                        },
                      });
                    }}
                    disabled={fetchReferencesMutation.isPending || hasReferences}
                    sx={{
                      background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #7B1FA2 30%, #C2185B 90%)',
                      },
                    }}
                  >
                    {hasReferences ? '✅ References Already Loaded' : fetchReferencesMutation.isPending ? 'Fetching...' : '📚 Fetch References (Depth 1)'}
                  </Button>
                );
              })()}

              {selectedNode.id !== Number(id) && (
                <>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AccountTree />}
                    onClick={() => {
                      navigate(`/citations/${selectedNode.id}`);
                      setDrawerOpen(false);
                    }}
                  >
                    View Citation Network
                  </Button>

                  <Divider sx={{ my: 2 }} />

                  {!editingNode ? (
                    <Stack spacing={1}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Edit />}
                        onClick={() => {
                          const citation = references.find(
                            (r: any) => r.citedPaper?.id === selectedNode.id
                          );
                          if (citation) {
                            setEditingNode(citation.id);
                            setTempRelevance(citation.relevanceScore || 0);
                            setTempContext(citation.citationContext || '');
                          }
                        }}
                        color="primary"
                      >
                        Manual Rate
                      </Button>
                    </Stack>
                  ) : (
                    <Box p={2} bgcolor="grey.50" borderRadius={2}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">
                        ⭐ Rate Relevance
                      </Typography>

                      <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" fontWeight="medium">
                              Relevance Score:
                            </Typography>
                            <Chip
                              label={`${(tempRelevance * 100).toFixed(0)}%`}
                              size="small"
                              sx={{
                                bgcolor: tempRelevance >= 0.8 ? '#4caf50' :
                                  tempRelevance >= 0.6 ? '#8bc34a' :
                                    tempRelevance >= 0.4 ? '#ffc107' :
                                      tempRelevance > 0 ? '#ff9800' : '#999',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                minWidth: 60,
                              }}
                            />
                          </Box>
                          <Box display="flex" justifyContent="center" py={1}>
                            <Rating
                              value={tempRelevance * 5}
                              precision={0.5}
                              onChange={(_, value) => setTempRelevance((value || 0) / 5)}
                              size="large"
                              sx={{
                                fontSize: '2.5rem',
                                '& .MuiRating-iconFilled': {
                                  color: '#ffd700',
                                },
                                '& .MuiRating-iconHover': {
                                  color: '#ffed4e',
                                },
                              }}
                            />
                          </Box>
                          <Typography variant="caption" color="textSecondary" align="center" display="block">
                            {tempRelevance === 0 ? 'Not relevant' :
                              tempRelevance < 0.4 ? 'Low relevance' :
                                tempRelevance < 0.6 ? 'Medium relevance' :
                                  tempRelevance < 0.8 ? 'Good relevance' :
                                    'High relevance'}
                          </Typography>
                        </Box>

                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          value={tempContext}
                          onChange={(e) => setTempContext(e.target.value)}
                          label="Notes (Optional)"
                          placeholder="Why is this paper relevant to your research?"
                          variant="outlined"
                          size="small"
                        />

                        <Box display="flex" gap={1}>
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<Save />}
                            onClick={() => {
                              updateCitationMutation.mutate({
                                citationId: editingNode,
                                data: {
                                  relevanceScore: tempRelevance,
                                  citationContext: tempContext,
                                },
                              });
                            }}
                            disabled={updateCitationMutation.isPending}
                          >
                            {updateCitationMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<Cancel />}
                            onClick={() => setEditingNode(null)}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Stack>

            {/* 📚 References of this node (citations of citation) */}
            {selectedNode && selectedNode.id !== Number(id) && (
              <>
                <Divider sx={{ my: 3 }} />

                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📚 References of this Paper
                    {loadingNodeRefs && <CircularProgress size={20} />}
                  </Typography>

                  {loadingNodeRefs ? (
                    <Box display="flex" justifyContent="center" py={3}>
                      <CircularProgress />
                    </Box>
                  ) : selectedNodeReferences.length > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        This paper cites {selectedNodeReferences.length} other paper(s):
                      </Typography>

                      <Stack spacing={1.5} mt={2}>
                        {selectedNodeReferences.slice(0, 10).map((ref: any) => (
                          <Card
                            key={ref.id}
                            variant="outlined"
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                boxShadow: 2,
                                borderColor: 'primary.main',
                              }
                            }}
                            onClick={() => {
                              if (ref.citedPaper) {
                                setSelectedNode(ref.citedPaper);
                              }
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Box display="flex" alignItems="start" gap={1}>
                                <Circle sx={{ fontSize: 8, mt: 1, color: 'primary.main' }} />
                                <Box flex={1}>
                                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                                    {ref.citedPaper?.title || 'Unknown Title'}
                                  </Typography>

                                  <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                                    {ref.citedPaper?.year && (
                                      <Chip
                                        label={ref.citedPaper.year}
                                        size="small"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                    )}

                                    {ref.relevanceScore && (
                                      <Chip
                                        label={`${(ref.relevanceScore * 100).toFixed(0)}%`}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '0.7rem',
                                          bgcolor: ref.relevanceScore >= 0.7 ? '#4caf50' :
                                            ref.relevanceScore >= 0.5 ? '#8bc34a' : '#ffc107',
                                          color: '#fff',
                                        }}
                                      />
                                    )}

                                    {/* {ref.isInfluential && (
                                      <Chip
                                        label="⭐ Influential"
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '0.7rem',
                                          bgcolor: '#ffd700',
                                          color: '#000',
                                        }}
                                      />
                                    )} */}
                                  </Box>

                                  {ref.citationContext && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        mt: 0.5,
                                        fontStyle: 'italic',
                                      }}
                                    >
                                      "{ref.citationContext}"
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}

                        {selectedNodeReferences.length > 10 && (
                          <Typography variant="caption" color="text.secondary" textAlign="center">
                            ... and {selectedNodeReferences.length - 10} more references
                          </Typography>
                        )}
                      </Stack>

                      <Button
                        variant="outlined"
                        fullWidth
                        size="small"
                        startIcon={<AccountTree />}
                        onClick={() => {
                          navigate(`/citations/${selectedNode.id}`);
                          setDrawerOpen(false);
                        }}
                        sx={{ mt: 2 }}
                      >
                        View Full Citation Network of This Paper
                      </Button>
                    </>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      No references found for this paper.
                      {selectedNode.isReference && (
                        <Typography variant="caption" display="block" mt={1}>
                          This is a reference paper. References will be automatically fetched if this paper has high priority.
                        </Typography>
                      )}
                    </Alert>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
      </Drawer>
    </Container>
  );
};

export default CitationNetworkPage;
