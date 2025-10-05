import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Button,
  ButtonGroup,
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
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Download,
  Close,
  Circle,
  Visibility,
  Timeline,
} from '@mui/icons-material';
import * as d3 from 'd3';
import { citationService } from '@/services/citation.service';

interface NodeData {
  id: number;
  title: string;
  year: number;
  authors: string[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

const CitationNetworkPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [depth, setDepth] = useState<number>(2);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Query with depth parameter
  const { data: network, isLoading } = useQuery({
    queryKey: ['citationNetwork', id, depth],
    queryFn: () => citationService.getNetwork(Number(id), depth),
    enabled: !!id,
  });

  useEffect(() => {
    if (!network || !svgRef.current || !containerRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const width = Math.max(containerWidth - 40, 800);
    const height = 600;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height] as any);

    // Create zoom behavior
    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Store zoom behavior for external controls
    (svg as any).zoomBehavior = zoom;

    // Create force simulation
    const simulation = d3
      .forceSimulation(network.nodes as any)
      .force(
        'link',
        d3
          .forceLink(network.edges)
          .id((d: any) => d.id)
          .distance(150)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Add arrow markers for directed edges
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999');

    // Draw edges
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(network.edges)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Draw nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(network.nodes)
      .join('circle')
      .attr('r', (d: any) => (d.id === Number(id) ? 12 : 8))
      .attr('fill', (d: any) => (d.id === Number(id) ? '#dc004e' : '#1976d2'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => {
        event.stopPropagation();
        setSelectedNode(d);
        setDrawerOpen(true);
      })
      .on('mouseenter', (event, d: any) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', (d.id === Number(id) ? 16 : 12));
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', (d: any) => (d.id === Number(id) ? 12 : 8));
      })
      .call(
        d3.drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Add labels
    const label = g
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(network.nodes)
      .join('text')
      .text((d: any) => d.title?.substring(0, 30) + (d.title?.length > 30 ? '...' : '') || '')
      .attr('font-size', 12)
      .attr('font-weight', (d: any) => (d.id === Number(id) ? 'bold' : 'normal'))
      .attr('dx', 15)
      .attr('dy', 4)
      .attr('pointer-events', 'none')
      .attr('display', showLabels ? 'block' : 'none');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
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

    // Store simulation for external controls
    (svg as any).simulation = simulation;

    return () => {
      simulation.stop();
    };
  }, [network, id, showLabels]);

  // Zoom controls
  const handleZoomIn = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = (svg as any).zoomBehavior;
      if (zoom) {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
      }
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = (svg as any).zoomBehavior;
      if (zoom) {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
      }
    }
  };

  const handleResetView = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = (svg as any).zoomBehavior;
      const simulation = (svg as any).simulation;
      
      if (zoom) {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      }
      
      if (simulation) {
        simulation.alpha(1).restart();
      }
    }
  };

  // Export functionality
  const handleExportSVG = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `citation-network-${id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = svgRef.current!.clientWidth;
      canvas.height = svgRef.current!.clientHeight;
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `citation-network-${id}.png`;
          link.click();
          URL.revokeObjectURL(pngUrl);
        }
      });
    };

    img.src = url;
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
      {/* Header with Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Citation Network</Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          {/* Depth Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Network Depth</InputLabel>
            <Select
              value={depth}
              label="Network Depth"
              onChange={(e) => setDepth(e.target.value as number)}
            >
              <MenuItem value={1}>1 Level</MenuItem>
              <MenuItem value={2}>2 Levels</MenuItem>
              <MenuItem value={3}>3 Levels</MenuItem>
            </Select>
          </FormControl>

          {/* Export Buttons */}
          <ButtonGroup variant="outlined" size="small">
            <Tooltip title="Export as SVG">
              <Button onClick={handleExportSVG} startIcon={<Download />}>
                SVG
              </Button>
            </Tooltip>
            <Tooltip title="Export as PNG">
              <Button onClick={handleExportPNG}>PNG</Button>
            </Tooltip>
          </ButtonGroup>
        </Box>
      </Box>

      {/* Statistics */}
      <Box display="flex" gap={2} mb={2}>
        <Chip
          icon={<Circle />}
          label={`${network.nodes.length} Papers`}
          color="primary"
          variant="outlined"
        />
        <Chip
          icon={<Timeline />}
          label={`${network.edges.length} Citations`}
          color="secondary"
          variant="outlined"
        />
      </Box>

      {/* Main Visualization */}
      <Paper elevation={3} sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Zoom Controls */}
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

        {/* SVG Canvas */}
        <Box ref={containerRef} display="flex" justifyContent="center" sx={{ bgcolor: '#fafafa' }}>
          <svg ref={svgRef}></svg>
        </Box>
      </Paper>

      {/* Legend */}
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Legend
        </Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <Circle sx={{ color: '#dc004e', fontSize: 20 }} />
            <Typography variant="body2">Current Paper</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Circle sx={{ color: '#1976d2', fontSize: 16 }} />
            <Typography variant="body2">Related Papers</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              component="span"
              sx={{
                width: 30,
                height: 2,
                bgcolor: '#999',
                display: 'inline-block',
              }}
            />
            <Typography variant="body2">Citation Link</Typography>
          </Box>
        </Stack>
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Interactions:</strong> Click nodes to view details • Drag nodes to rearrange • Scroll
          to zoom • Drag background to pan
        </Alert>
      </Paper>

      {/* Node Details Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400 },
          },
        }}
      >
        {selectedNode && (
          <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
              <Typography variant="h6">Paper Details</Typography>
              <IconButton onClick={() => setDrawerOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Paper Information */}
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

                <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
                  Year
                </Typography>
                <Typography variant="body2">{selectedNode.year}</Typography>

                {selectedNode.id === Number(id) && (
                  <Chip
                    label="Current Paper"
                    color="error"
                    size="small"
                    sx={{ mt: 2 }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Actions */}
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
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 1 }}
                onClick={() => {
                  navigate(`/citations/${selectedNode.id}`);
                  setDrawerOpen(false);
                }}
              >
                View Citation Network
              </Button>
            )}
          </Box>
        )}
      </Drawer>
    </Container>
  );
};

export default CitationNetworkPage;
