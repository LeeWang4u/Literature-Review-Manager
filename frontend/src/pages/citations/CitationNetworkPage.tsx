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
  Timeline,
  Star,
  Edit,
  Save,
  Cancel,
  AccountTree,
  AutoAwesome,
  FilterList,
  OpenInNew,
  ArrowBack,
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
  const [editingNode, setEditingNode] = useState<number | null>(null);
  const [tempRelevance, setTempRelevance] = useState<number>(0);
  const [tempContext, setTempContext] = useState<string>('');
  const [showTopOnly] = useState(true);
  const [useTreeLayout, setUseTreeLayout] = useState(true); // Toggle tree vs force layout
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

  const { data: analysis } = useQuery({
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

  const fetchNestedMutation = useMutation({
    mutationFn: ({ paperId, depth, maxDepth }: { paperId: number; depth: number; maxDepth: number }) =>
      paperService.fetchNestedReferences(paperId, depth, maxDepth),
    // call single eager endpoint that finds DOI (if missing) then fetches references in one operation
    // mutationFn: ({ paperId, depth, maxDepth }: { paperId: number; depth: number; maxDepth: number }) =>
    //   paperService.fetchNestedReferencesEager(paperId, depth, maxDepth),
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

    // Enhanced links with curved paths - CREATE FIRST before layout logic
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
      })
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d: any) {
        // Highlight this link only
        d3.select(this)
          .raise()
          .transition()
          .duration(200)
          .attr('stroke-opacity', 0.95)
          .attr('stroke-width', d.isInfluential ? 6 : 5);
      })
      .on('mouseleave', function(event, d: any) {
        // Reset this link
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-opacity', d.relevanceScore ? 0.4 + d.relevanceScore * 0.5 : 0.3)
          .attr('stroke-width', d.isInfluential ? 4 : d.relevanceScore && d.relevanceScore >= 0.7 ? 3.5 : d.relevanceScore && d.relevanceScore >= 0.4 ? 3 : 2);
      });
    
    // Add tooltips to links
    link.append('title')
      .text((d: any) => {
        const sourceTitle = d.source.title || 'Unknown';
        const targetTitle = d.target.title || 'Unknown';
        const parts = [
          `📄 From: ${sourceTitle.substring(0, 50)}${sourceTitle.length > 50 ? '...' : ''}`,
          `📄 To: ${targetTitle.substring(0, 50)}${targetTitle.length > 50 ? '...' : ''}`,
          '',
          d.relevanceScore ? `⭐ Relevance: ${(d.relevanceScore * 100).toFixed(0)}%` : '❓ Not rated',
          d.isInfluential ? '🌟 Highly Influential Citation' : '',
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

      console.log('📅 Years in network:', years);
      console.log('📊 Nodes per year:', Array.from(nodesByYear.entries()).map(([y, nodes]) => `${y}: ${nodes.length}`));

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
      .on('mouseenter', function(event, d: any) {
        // Scale up the node
        d3.select(this)
          .raise() // Bring to front
          .transition()
          .duration(200)
          .attr('transform', `translate(${d.x},${d.y}) scale(1.1)`);
        
        // Highlight connected links
        link
          .transition()
          .duration(200)
          .attr('stroke-opacity', (l: any) => {
            if (l.source.id === d.id || l.target.id === d.id) {
              return 0.8;
            }
            return 0.1;
          })
          .attr('stroke-width', (l: any) => {
            if (l.source.id === d.id || l.target.id === d.id) {
              return l.isInfluential ? 5 : 4;
            }
            return l.isInfluential ? 4 : 2;
          });
        
        // Dim other nodes
        node
          .transition()
          .duration(200)
          .attr('opacity', (n: any) => n.id === d.id ? 1 : 0.3);
      })
      .on('mouseleave', function(event, d: any) {
        // Reset node scale
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', `translate(${d.x},${d.y}) scale(1)`);
        
        // Reset links
        link
          .transition()
          .duration(200)
          .attr('stroke-opacity', (l: any) => {
            if (l.relevanceScore) return 0.4 + l.relevanceScore * 0.5;
            return 0.3;
          })
          .attr('stroke-width', (l: any) => {
            if (l.isInfluential) return 4;
            if (l.relevanceScore && l.relevanceScore >= 0.7) return 3.5;
            if (l.relevanceScore && l.relevanceScore >= 0.4) return 3;
            return 2;
          });
        
        // Reset all nodes
        node
          .transition()
          .duration(200)
          .attr('opacity', 1);
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
    
    node.append('rect')
      .attr('class', 'node-rect')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', (d: any) => {
        const depth = d.networkDepth ?? d.citationDepth ?? 0;
        if (d.id === Number(id)) return '#e91e63';
        if (d.isInfluential) {
          if (depth === 0) return '#ffa726';
          if (depth === 1) return '#ffb74d';
          return '#ffcc80';
        }
        if (depth === 0) return '#66bb6a';
        if (depth === 1) return '#42a5f5';
        if (depth === 2) return '#ab47bc';
        return '#90a4ae';
      })
      .attr('stroke', (d: any) => {
        if (d.id === Number(id)) return '#c2185b';
        if (d.isInfluential) return '#f57c00';
        const depth = d.networkDepth ?? d.citationDepth ?? 0;
        if (depth === 0) return '#388e3c';
        if (depth === 1) return '#1976d2';
        if (depth === 2) return '#7b1fa2';
        return '#546e7a';
      })
      .attr('stroke-width', (d: any) => {
        if (d.id === Number(id)) return 3;
        if (d.isInfluential) return 2.5;
        return 2;
      })
      .attr('filter', 'url(#node-shadow)')
      .on('mouseenter', function (this: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', 4)
          .attr('filter', 'url(#node-shadow) brightness(1.1)');
      })
      .on('mouseleave', function (this: any, _: any, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', d.id === Number(id) ? 3 : d.isInfluential ? 2.5 : 2)
          .attr('filter', 'url(#node-shadow)');
      });

    // Title text with word wrapping using foreignObject
    node.append('foreignObject')
      .attr('x', -nodeWidth / 2 + 5)
      .attr('y', -nodeHeight / 2 + 5)
      .attr('width', nodeWidth - 10)
      .attr('height', nodeHeight - 25) // Leave space for year badge
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('text-align', 'center')
      .style('font-size', '11px')
      .style('font-weight', (d: any) => (d.id === Number(id) ? 'bold' : d.isInfluential ? '600' : 'normal'))
      .style('color', '#fff')
      .style('line-height', '1.3')
      .style('overflow', 'hidden')
      .style('word-wrap', 'break-word')
      .style('padding', '2px')
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
        const badge = d.isInfluential ? ' ⭐' : '';
        return `${year}${badge}`.trim();
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
          d.isInfluential ? '🌟 Influential Reference' : '',
          '',
          '🖱️ Hover: Highlight connections',
          '💡 Click: View details and rate'
        ];
        return parts.filter(Boolean).join('\n');
      });

    // NO separate labels - text is inside rectangles now

    // Helper function for orthogonal (right-angle) link paths
    function linkArc(d: any) {
      const sourceX = d.source.x ?? width / 2;
      const sourceY = d.source.y ?? height / 2;
      const targetX = d.target.x ?? width / 2;
      const targetY = d.target.y ?? height / 2;
      
      // Orthogonal path with right angles
      const midY = (sourceY + targetY) / 2;
      
      // Vertical then horizontal path (L-shape or Z-shape)
      return `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`;
    }

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (useTreeLayout) {
        // In tree layout, temporarily unfix position
        d.fx = d.x;
        d.fy = d.y;
      } else {
        if (!event.active && (svg as any).simulation) (svg as any).simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
      
      // Update visual position immediately for tree layout
      if (useTreeLayout) {
        d3.select(event.sourceEvent.target.parentNode)
          .attr('transform', `translate(${event.x},${event.y})`);
        link.attr('d', linkArc as any);
      }
    }

    function dragended(event: any) {
      if (useTreeLayout) {
        // Keep node at dragged position in tree layout
        // d.fx and d.fy remain set
      } else {
        if (!event.active && (svg as any).simulation) (svg as any).simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
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
  }, [network, id, useTreeLayout]);

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
              <MenuItem value={3}>3 Levels</MenuItem>
            </Select>
          </FormControl>
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
                startIcon={<OpenInNew />}
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
