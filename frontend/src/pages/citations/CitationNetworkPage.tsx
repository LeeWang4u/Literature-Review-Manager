import React, { useEffect, useRef, useState } from 'react';
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
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Close,
  Circle,
  Visibility,
  Timeline,
  Star,
  Edit,
  Save,
  Cancel,
  AccountTree,
  AutoAwesome,
  Psychology,
  FilterList,
  TrendingUp,
  OpenInNew,
} from '@mui/icons-material';
import * as d3 from 'd3';
import { citationService } from '@/services/citation.service';
import { paperService } from '@/services/paper.service';
import toast from 'react-hot-toast';

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [depth, setDepth] = useState<number>(2);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [editingNode, setEditingNode] = useState<number | null>(null);
  const [tempRelevance, setTempRelevance] = useState<number>(0);
  const [tempContext, setTempContext] = useState<string>('');
  const [showTopOnly, setShowTopOnly] = useState(true);
  const analysisLimit = 15;
  const minRelevance = 0.3;
  const [filteredCount, setFilteredCount] = useState({ nodes: 0, edges: 0 });

  // Fetch references of selected node
  const { data: selectedNodeReferences = [], isLoading: loadingNodeRefs } = useQuery({
    queryKey: ['citations', 'references', selectedNode?.id],
    queryFn: () => citationService.getReferences(selectedNode!.id),
    enabled: !!selectedNode && selectedNode.id !== Number(id),
  });

  const { data: network, isLoading } = useQuery({
    queryKey: ['citationNetwork', id, depth],
    queryFn: () => citationService.getNetwork(Number(id), depth),
    enabled: !!id,
  });

  const { data: references = [] } = useQuery({
    queryKey: ['citations', 'references', id],
    queryFn: () => citationService.getReferences(Number(id)),
    enabled: !!id,
  });

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['referenceAnalysis', id, analysisLimit, minRelevance],
    queryFn: () => citationService.analyzeReferences(Number(id), { limit: analysisLimit, minRelevance }),
    enabled: !!id && showTopOnly, // Only fetch when showTopOnly is true
  });

  const updateCitationMutation = useMutation({
    mutationFn: ({ citationId, data }: { citationId: number; data: any }) =>
      citationService.update(citationId, data),
    onSuccess: () => {
      toast.success('Updated citation relevance!');
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
      setEditingNode(null);
      setDrawerOpen(false);
    },
    onError: () => {
      toast.error('Failed to update citation');
    },
  });

  const autoRateMutation = useMutation({
    mutationFn: (citationId: number) => citationService.autoRate(citationId),
    onSuccess: (data) => {
      toast.success(`AI rated: ${(data.relevanceScore! * 100).toFixed(0)}% relevance`);
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
      setEditingNode(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'AI rating failed');
    },
  });

  const autoRateAllMutation = useMutation({
    mutationFn: () => citationService.autoRateAll(Number(id)),
    onSuccess: (result) => {
      toast.success(`AI rated ${result.rated} citations successfully!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Batch AI rating failed');
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['citationNetwork', id] });
      queryClient.invalidateQueries({ queryKey: ['citations', 'references', id] });
      setDrawerOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to fetch nested references');
    },
  });

  useEffect(() => {
    if (!network || !svgRef.current || !containerRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    // Debug: Check network data structure
    console.log('📊 Network Data Analysis:');
    console.log(`   Total nodes: ${network.nodes.length}`);
    console.log(`   Total edges: ${network.edges.length}`);
    console.log('   Node types distribution:');
    const nodeTypes = network.nodes.reduce((acc: any, node: any) => {
      const type = node.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    Object.entries(nodeTypes).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    
    console.log('   Network depth distribution:');
    const depthDist = network.nodes.reduce((acc: any, node: any) => {
      const depth = node.networkDepth ?? node.citationDepth ?? 0;
      acc[depth] = (acc[depth] || 0) + 1;
      return acc;
    }, {});
    Object.entries(depthDist).forEach(([depth, count]) => {
      console.log(`     Depth ${depth}: ${count}`);
    });

    console.log('\n   Sample nodes (first 5):');
    network.nodes.slice(0, 5).forEach((node: any) => {
      console.log(`     [${node.type || 'unknown'}] ${node.id}: "${node.title?.substring(0, 40)}..." year=${node.year} depth=${node.networkDepth ?? node.citationDepth ?? 0}`);
    });
    
    console.log('\n   Sample edges (first 5):');
    network.edges.slice(0, 5).forEach((edge: any) => {
      console.log(`     ${edge.source} → ${edge.target} (depth: ${edge.citationDepth})`);
    });

    // Filter nodes based on showTopOnly - don't create copies to preserve D3 references
    let filteredNodes = network.nodes;
    let filteredEdges = network.edges;

    if (showTopOnly && analysis?.topReferences) {
      // Top references return { citation, paper, score } - use paper.id
      const topRefIds = new Set(analysis.topReferences.map((ref: any) => ref.paper.id));
      const mainPaperId = Number(id);
      
      console.log('Analysis top references:', analysis.topReferences.length);
      console.log('Top ref IDs:', Array.from(topRefIds));
      console.log('Main paper ID:', mainPaperId);
      console.log('Total nodes before filter:', network.nodes.length);
      
      // Keep main paper + top references + their nested references (depth 2+)
      filteredNodes = network.nodes.filter((node: any) => {
        // Always keep main paper
        if (node.id === mainPaperId) return true;
        
        // Keep top references (depth 1)
        if (topRefIds.has(node.id)) return true;
        
        // Keep nested references (depth 2+) that are connected to top references
        const depth = node.networkDepth ?? node.citationDepth ?? 0;
        if (depth >= 2) {
          // Check if this node has edges connecting to any top reference
          const hasConnectionToTopRef = network.edges.some((edge: any) => {
            const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
            const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
            
            // This node is cited by a top reference
            if (targetId === node.id && topRefIds.has(sourceId)) return true;
            // This node cites a top reference
            if (sourceId === node.id && topRefIds.has(targetId)) return true;
            
            return false;
          });
          
          return hasConnectionToTopRef;
        }
        
        return false;
      });
      
      console.log('Filtered nodes (with nested):', filteredNodes.length, filteredNodes.map((n: any) => `${n.id}(d${n.networkDepth ?? n.citationDepth ?? 0})`));
      
      const filteredNodeIds = new Set(filteredNodes.map((n: any) => n.id));
      
      console.log('Total edges before filter:', network.edges.length);
      filteredEdges = network.edges.filter((edge: any) => {
        // Handle both number IDs and object references
        const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
        return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
      });
      
      console.log('Filtered edges:', filteredEdges.length);
    }

    // Update filtered counts
    setFilteredCount({ nodes: filteredNodes.length, edges: filteredEdges.length });

    const containerWidth = containerRef.current.clientWidth;
    const width = Math.max(containerWidth - 40, 1200);
    const height = 900;

    // Initialize node positions to prevent undefined errors
    filteredNodes.forEach((node: any) => {
      if (node.x === undefined) node.x = width / 2;
      if (node.y === undefined) node.y = height / 2;
    });

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height] as any)
      .style('background', 'linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%)');

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

    // Improved arrow markers with better visibility
    [
      { id: 0, color: '#999', size: 6 },
      { id: 1, color: '#4caf50', size: 8 },
      { id: 2, color: '#ffd700', size: 9 }
    ].forEach(({ id, color, size }) => {
      defs.append('marker')
        .attr('id', `arrowhead-${id}`)
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', size)
        .attr('markerHeight', size)
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
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

    // Improved force simulation for better layout
    const simulation = d3
      .forceSimulation(filteredNodes as any)
      .force(
        'link',
        d3
          .forceLink(filteredEdges)
          .id((d: any) => d.id)
          .distance(250)
          .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-1200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60))
      .force('x', d3.forceX(width / 2).strength(0.08))
      .force('y', d3.forceY(height / 2).strength(0.08))
      .alphaDecay(0.015);

    // Enhanced links with curved paths
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(filteredEdges)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (d: any) => {
        if (d.isInfluential) return '#ffd700';
        if (d.relevanceScore && d.relevanceScore >= 0.8) return '#4caf50';
        if (d.relevanceScore && d.relevanceScore >= 0.6) return '#8bc34a';
        if (d.relevanceScore && d.relevanceScore >= 0.4) return '#ffc107';
        if (d.relevanceScore && d.relevanceScore > 0) return '#ff9800';
        return '#bdbdbd';
      })
      .attr('stroke-opacity', (d: any) => {
        if (d.relevanceScore) return 0.4 + d.relevanceScore * 0.5;
        return 0.3;
      })
      .attr('stroke-width', (d: any) => {
        if (d.isInfluential) return 4;
        if (d.relevanceScore && d.relevanceScore >= 0.7) return 3.5;
        if (d.relevanceScore && d.relevanceScore >= 0.4) return 3;
        return 2;
      })
      .attr('marker-end', (d: any) => {
        if (d.isInfluential) return 'url(#arrowhead-2)';
        if (d.relevanceScore && d.relevanceScore >= 0.7) return 'url(#arrowhead-1)';
        return 'url(#arrowhead-0)';
      })
      .attr('stroke-dasharray', (d: any) => {
        if (!d.relevanceScore || d.relevanceScore < 0.3) return '5,5';
        return 'none';
      });

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
      .call(
        d3.drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Main node circle with shadow
    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', (d: any) => {
        if (d.id === Number(id)) return 20;
        if (d.isInfluential) return 16;
        if (d.relevanceScore && d.relevanceScore >= 0.7) return 14;
        return 11;
      })
      .attr('fill', (d: any) => {
        // Prioritize depth-based coloring for better hierarchy visualization
        const depth = d.networkDepth ?? d.citationDepth ?? 0;
        
        if (d.id === Number(id)) return 'url(#current-paper-gradient)';
        
        // Depth-based colors with influence overlay
        if (d.isInfluential) {
          // Influential papers with depth tint
          if (depth === 0) return 'url(#influential-gradient)';
          if (depth === 1) return '#FFB300'; // Gold for depth 1 influential
          if (depth === 2) return '#FFA726'; // Orange for depth 2 influential
          return '#FF8A65'; // Coral for depth 3+ influential
        }
        
        // Non-influential papers colored by depth
        if (depth === 0) {
          // Depth 0: Green shades (direct references)
          if (d.relevanceScore >= 0.8) return '#4CAF50';
          if (d.relevanceScore >= 0.6) return '#66BB6A';
          if (d.relevanceScore >= 0.4) return '#81C784';
          return '#A5D6A7';
        } else if (depth === 1) {
          // Depth 1: Blue shades (references of references)
          if (d.relevanceScore >= 0.8) return '#2196F3';
          if (d.relevanceScore >= 0.6) return '#42A5F5';
          if (d.relevanceScore >= 0.4) return '#64B5F6';
          return '#90CAF9';
        } else if (depth === 2) {
          // Depth 2: Purple shades
          if (d.relevanceScore >= 0.8) return '#9C27B0';
          if (d.relevanceScore >= 0.6) return '#AB47BC';
          if (d.relevanceScore >= 0.4) return '#BA68C8';
          return '#CE93D8';
        } else {
          // Depth 3+: Gray shades
          return '#90A4AE';
        }
      })
      .attr('stroke', (d: any) => {
        if (d.id === Number(id)) return '#ff1744';
        if (d.isInfluential) return '#ffb300';
        
        const depth = d.networkDepth ?? d.citationDepth ?? 0;
        if (depth === 0) return '#2E7D32'; // Dark green
        if (depth === 1) return '#1565C0'; // Dark blue
        if (depth === 2) return '#6A1B9A'; // Dark purple
        return '#546E7A'; // Dark gray
      })
      .attr('stroke-width', (d: any) => {
        if (d.id === Number(id)) return 4;
        if (d.isInfluential) return 3.5;
        if (d.relevanceScore && d.relevanceScore >= 0.7) return 3;
        return 2.5;
      })
      .attr('filter', 'url(#node-shadow)')
      .on('mouseenter', function(this: any, _: any, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', () => {
            const currentR = d.id === Number(id) ? 20 : d.isInfluential ? 16 : d.relevanceScore && d.relevanceScore >= 0.7 ? 14 : 11;
            return currentR * 1.3;
          })
          .attr('stroke-width', 4);
      })
      .on('mouseleave', function(this: any, _: any, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d.id === Number(id) ? 20 : d.isInfluential ? 16 : d.relevanceScore && d.relevanceScore >= 0.7 ? 14 : 11)
          .attr('stroke-width', d.id === Number(id) ? 4 : d.isInfluential ? 3.5 : d.relevanceScore && d.relevanceScore >= 0.7 ? 3 : 2.5);
      });

    // Improved relevance score badge
    node.filter((d: any) => d.relevanceScore && d.relevanceScore > 0)
      .append('circle')
      .attr('r', 12)
      .attr('cx', 18)
      .attr('cy', -18)
      .attr('fill', (d: any) => {
        const score = d.relevanceScore;
        if (score >= 0.8) return '#4caf50';
        if (score >= 0.6) return '#8bc34a';
        if (score >= 0.4) return '#ffc107';
        return '#ff9800';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#node-shadow)');

    node.filter((d: any) => d.relevanceScore && d.relevanceScore > 0)
      .append('text')
      .attr('x', 18)
      .attr('y', -13)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('stroke', 'none')
      .text((d: any) => (d.relevanceScore * 10).toFixed(1));

    // Add influential star icon
    node.filter((d: any) => d.isInfluential)
      .append('text')
      .attr('x', 0)
      .attr('y', 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .attr('fill', '#fff')
      .attr('stroke', 'none')
      .style('pointer-events', 'none')
      .text('⭐');

    // Enhanced tooltip
    node.append('title')
      .text((d: any) => {
        const depth = d.networkDepth ?? d.citationDepth ?? 0;
        const depthLabel = depth === 0 ? 'Direct Reference' : 
                          depth === 1 ? 'Nested Reference (Lv1)' : 
                          depth === 2 ? 'Deep Reference (Lv2)' : 
                          `Very Deep Reference (Lv${depth})`;
        
        const parts = [
          `📄 ${d.title || 'Untitled'}`,
          '',
          `🔗 ${depthLabel}`,
          d.year ? `📅 Year: ${d.year}` : '',
          d.authors ? `✍️ Authors: ${typeof d.authors === 'string' ? d.authors.substring(0, 100) : d.authors.slice(0, 3).join(', ')}${typeof d.authors === 'string' && d.authors.length > 100 ? '...' : ''}` : '',
          '',
          d.relevanceScore ? `⭐ Relevance: ${(d.relevanceScore * 100).toFixed(0)}% ${d.relevanceScore >= 0.8 ? '(High)' : d.relevanceScore >= 0.6 ? '(Good)' : d.relevanceScore >= 0.4 ? '(Medium)' : '(Low)'}` : '❓ Not rated yet',
          d.isInfluential ? '🌟 Influential Reference' : '',
          '',
          '💡 Click to view details and rate'
        ];
        return parts.filter(Boolean).join('\n');
      });

    // Enhanced labels with background
    const label = g
      .append('g')
      .attr('class', 'labels')
      .selectAll('g')
      .data(network.nodes)
      .join('g')
      .attr('pointer-events', 'none')
      .attr('display', showLabels ? 'block' : 'none');

    // Label background for better readability
    label.append('rect')
      .attr('x', 24)
      .attr('y', -18)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(255, 255, 255, 0.95)')
      .attr('stroke', (d: any) => {
        if (d.id === Number(id)) return '#dc004e';
        if (d.isInfluential) return '#ffd700';
        if (d.relevanceScore && d.relevanceScore >= 0.7) return '#4caf50';
        return '#e0e0e0';
      })
      .attr('stroke-width', 1.5)
      .attr('width', (d: any) => {
        const title = d.title?.substring(0, 50) || '';
        return Math.min(title.length * 6 + 20, 320);
      })
      .attr('height', 24)
      .attr('filter', 'url(#node-shadow)');

    // Label text
    label.append('text')
      .attr('x', 28)
      .attr('y', -3)
      .attr('font-size', 12)
      .attr('font-weight', (d: any) => (d.id === Number(id) ? 'bold' : d.isInfluential ? '600' : 'normal'))
      .attr('fill', (d: any) => {
        if (d.id === Number(id)) return '#dc004e';
        if (d.isInfluential) return '#f57c00';
        return '#424242';
      })
      .text((d: any) => {
        const title = d.title?.substring(0, 50) + (d.title?.length > 50 ? '...' : '') || 'Untitled';
        const year = d.year || d.publicationYear;
        const yearText = year ? ` (${year})` : '';
        const badge = d.isInfluential ? ' ⭐' : '';
        return `${title}${yearText}${badge}`;
      });

    simulation.on('tick', () => {
      // Straight links for clarity
      link.attr('d', (d: any) => {
        const sourceX = d.source.x ?? width / 2;
        const sourceY = d.source.y ?? height / 2;
        const targetX = d.target.x ?? width / 2;
        const targetY = d.target.y ?? height / 2;
        return `M${sourceX},${sourceY}L${targetX},${targetY}`;
      });

      node.attr('transform', (d: any) => {
        const x = d.x ?? width / 2;
        const y = d.y ?? height / 2;
        return `translate(${x},${y})`;
      });

      label.attr('transform', (d: any) => {
        const x = d.x ?? width / 2;
        const y = d.y ?? height / 2;
        return `translate(${x},${y})`;
      });
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    (svg as any).simulation = simulation;

    return () => {
      simulation.stop();
    };
  }, [network, id, showLabels]);

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
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4">Citation Network</Typography>
          {network && network.nodes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {network.nodes.find((n: any) => n.type === 'main')?.title || 'Loading...'}
            </Typography>
          )}
        </Box>
        
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Button
            variant={showTopOnly ? "contained" : "outlined"}
            startIcon={<FilterList />}
            onClick={() => setShowTopOnly(!showTopOnly)}
            color={showTopOnly ? "primary" : "inherit"}
          >
            {showTopOnly ? `Top ${analysisLimit} Only` : 'Show All'}
          </Button>

          <Button
            variant="contained"
            startIcon={autoRateAllMutation.isPending ? <CircularProgress size={20} /> : <Psychology />}
            onClick={() => autoRateAllMutation.mutate()}
            disabled={autoRateAllMutation.isPending}
            sx={{
              background: 'linear-gradient(45deg, #9c27b0 30%, #e91e63 90%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #7b1fa2 30%, #c2185b 90%)',
              },
            }}
          >
            {autoRateAllMutation.isPending ? 'AI Rating...' : '🤖 AI Rate All'}
          </Button>

          <Button
            variant="contained"
            startIcon={fetchNestedMutation.isPending ? <CircularProgress size={20} /> : <AccountTree />}
            onClick={() => fetchNestedMutation.mutate({ paperId: Number(id), depth: 1, maxDepth: 2 })}
            disabled={fetchNestedMutation.isPending}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #00ACC1 90%)',
              },
            }}
          >
            {fetchNestedMutation.isPending ? 'Fetching...' : '🔗 Fetch Nested Refs'}
          </Button>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Depth</InputLabel>
            <Select
              value={depth}
              label="Depth"
              onChange={(e) => setDepth(e.target.value as number)}
            >
              <MenuItem value={1}>1 Level</MenuItem>
              <MenuItem value={2}>2 Levels</MenuItem>
              <MenuItem value={3}>3 Levels</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Reference Analysis Section */}
      {showTopOnly && (
        <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <TrendingUp color="primary" />
              <Typography variant="h6">Top References Analysis</Typography>
              {analysisLoading && <CircularProgress size={20} />}
            </Box>
            
            {analysis ? (
              <>
                <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
                  <Chip
                    icon={<Star />}
                    label={`${analysis.topReferences?.length || 0} Top References`}
                    color="primary"
                  />
                  {analysis.highPriorityCount > 0 && (
                    <Chip
                      icon={<TrendingUp />}
                      label={`${analysis.highPriorityCount} High Priority`}
                      color="success"
                    />
                  )}
                  {analysis.recommendedDownloads > 0 && (
                    <Chip
                      label={`${analysis.recommendedDownloads} Recommended Downloads`}
                      color="warning"
                    />
                  )}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Network filtered to show only the most relevant references based on:
                  Relevance (40%) + Influential Status (30%) + Citation Count (30%)
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Loading analysis...
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <Chip
          icon={<Circle />}
          label={`${network.nodes.length} Total Papers`}
          color="default"
          variant="outlined"
        />
        {showTopOnly && filteredCount.nodes > 0 && (
          <Chip
            icon={<FilterList />}
            label={`Showing ${filteredCount.nodes} Papers`}
            color="primary"
          />
        )}
        <Chip
          icon={<Timeline />}
          label={showTopOnly ? `${filteredCount.edges} Citations (${network.edges.length} total)` : `${network.edges.length} Citations`}
          color="secondary"
          variant="outlined"
        />
        {references.filter(r => r.isInfluential).length > 0 && (
          <Chip
            icon={<Star />}
            label={`${references.filter(r => r.isInfluential).length} Influential`}
            sx={{ bgcolor: '#ffd700', color: '#000', fontWeight: 'bold' }}
          />
        )}
        {references.filter(r => r.relevanceScore && r.relevanceScore > 0.7).length > 0 && (
          <Chip
            icon={<Star />}
            label={`${references.filter(r => r.relevanceScore && r.relevanceScore > 0.7).length} High Relevance`}
            sx={{ bgcolor: '#4caf50', color: '#fff' }}
          />
        )}
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
            <Tooltip title={showLabels ? 'Hide Labels' : 'Show Labels'} placement="left">
              <IconButton
                onClick={() => setShowLabels(!showLabels)}
                sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Visibility />
              </IconButton>
            </Tooltip>
          </Box>

          <Box ref={containerRef} display="flex" justifyContent="center" sx={{ bgcolor: '#fafafa' }}>
            <svg ref={svgRef}></svg>
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
                <Circle sx={{ color: '#4CAF50', fontSize: 18 }} />
                <Typography variant="body2">Depth 0 (Direct)</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Circle sx={{ color: '#2196F3', fontSize: 18 }} />
                <Typography variant="body2">Depth 1 (Nested)</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Circle sx={{ color: '#9C27B0', fontSize: 18 }} />
                <Typography variant="body2">Depth 2 (Deep)</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Circle sx={{ color: '#90A4AE', fontSize: 16 }} />
                <Typography variant="body2">Depth 3+</Typography>
              </Box>
            </Stack>

            {/* Relevance scores */}
            <Typography variant="caption" color="textSecondary" gutterBottom display="block">
              Relevance (darker = higher score):
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Circle sx={{ color: '#ffd700', fontSize: 20, filter: 'drop-shadow(0 0 3px #ff8c00)' }} />
                <Typography variant="body2">⭐ Influential</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Circle sx={{ fontSize: 18 }}>
                  <svg width="18" height="18">
                    <circle cx="9" cy="9" r="8" fill="#4caf50" />
                  </svg>
                </Circle>
                <Typography variant="body2">80-100%</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Circle sx={{ fontSize: 18 }}>
                  <svg width="18" height="18">
                    <circle cx="9" cy="9" r="8" fill="#66BB6A" />
                  </svg>
                </Circle>
                <Typography variant="body2">60-80%</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Circle sx={{ fontSize: 18 }}>
                  <svg width="18" height="18">
                    <circle cx="9" cy="9" r="8" fill="#81C784" />
                  </svg>
                </Circle>
                <Typography variant="body2">40-60%</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Circle sx={{ fontSize: 18 }}>
                  <svg width="18" height="18">
                    <circle cx="9" cy="9" r="8" fill="#A5D6A7" />
                  </svg>
                </Circle>
                <Typography variant="body2">&lt;40%</Typography>
              </Box>
            </Stack>

            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Tip:</strong> Click papers to rate • Drag to rearrange • Scroll to zoom • Use "Fetch Nested Refs" to load deeper levels
            </Alert>
          </Paper>
        </Paper>

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
                    r => r.citedPaper?.id === selectedNode.id
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
                  {selectedNode.isInfluential && (
                    <Chip
                      label="⭐ Influential"
                      size="small"
                      sx={{ bgcolor: '#ffd700', color: '#000', fontWeight: 'bold' }}
                    />
                  )}
                  {selectedNode.relevanceScore && selectedNode.relevanceScore > 0.7 && (
                    <Chip
                      label="High Relevance"
                      size="small"
                      sx={{ bgcolor: '#4caf50', color: '#fff' }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>

            <Stack spacing={1}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Visibility />}
                onClick={() => {
                  navigate(`/papers/${selectedNode.id}`);
                  setDrawerOpen(false);
                }}
              >
                View Full Details
              </Button>

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

                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={fetchNestedMutation.isPending ? <CircularProgress size={20} /> : <AccountTree />}
                    onClick={() => {
                      fetchNestedMutation.mutate({ 
                        paperId: selectedNode.id, 
                        depth: 1, 
                        maxDepth: 2 
                      });
                    }}
                    disabled={fetchNestedMutation.isPending}
                    sx={{
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1976D2 30%, #00ACC1 90%)',
                      },
                    }}
                  >
                    {fetchNestedMutation.isPending ? 'Fetching...' : '🔗 Fetch References of This Paper'}
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
                            r => r.citedPaper?.id === selectedNode.id
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

                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={autoRateMutation.isPending ? <CircularProgress size={20} /> : <AutoAwesome />}
                        onClick={() => {
                          const citation = references.find(
                            r => r.citedPaper?.id === selectedNode.id
                          );
                          if (citation) {
                            autoRateMutation.mutate(citation.id);
                          }
                        }}
                        disabled={autoRateMutation.isPending}
                        sx={{
                          borderColor: '#9c27b0',
                          color: '#9c27b0',
                          '&:hover': {
                            borderColor: '#7b1fa2',
                            bgcolor: 'rgba(156, 39, 176, 0.04)',
                          },
                        }}
                      >
                        {autoRateMutation.isPending ? 'AI Rating...' : 'AI Auto-Rate'}
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
                                    
                                    {ref.isInfluential && (
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
                                    )}
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
