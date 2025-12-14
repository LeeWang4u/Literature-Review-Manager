import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import {
  Download,
  Star,
  TrendingUp,
  Info,
  OpenInNew,
  PictureAsPdf,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { citationService } from '@/services/citation.service';
import { paperService } from '@/services/paper.service';
import toast from 'react-hot-toast';

interface ReferenceAnalysisProps {
  paperId: number;
  limit?: number;
  minRelevance?: number;
}

const ReferenceAnalysis: React.FC<ReferenceAnalysisProps> = ({
  paperId,
  limit = 10,
  minRelevance = 0.0, // Changed from 0.5 to 0.0 to include low-scored references
}) => {
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['referenceAnalysis', paperId, limit, minRelevance],
    queryFn: () => citationService.analyzeReferences(paperId, { limit, minRelevance }),
  });

  const handleDownloadMetadata = async (refPaperId: number, title: string) => {
    try {
      toast.promise(
        paperService.getById(refPaperId),
        {
          loading: 'Fetching paper metadata...',
          success: `Loaded: ${title}`,
          error: 'Failed to load metadata',
        }
      );
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#4caf50';
    if (score >= 0.6) return '#8bc34a';
    if (score >= 0.4) return '#ffc107';
    return '#ff9800';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Critical';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Analyzing References...
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp color="primary" />
            Top References Analysis
          </Typography>
          <Chip
            label={`${analysis.totalReferences} Total`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>

        <Stack direction="row" spacing={2} mb={3}>
          <Alert severity="info" sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              {analysis.recommendations.highPriority} High Priority
            </Typography>
            <Typography variant="caption">
              Papers with score ≥ 80%
            </Typography>
          </Alert>
          <Alert severity="warning" sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              {analysis.recommendations.shouldDownload} Need Download
            </Typography>
            <Typography variant="caption">
              Important papers without PDF
            </Typography>
          </Alert>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Top {limit} Most Important References
        </Typography>

        <List>
          {analysis.topReferences.map((ref: any, index: number) => (
            <ListItem
              key={ref.paper.id}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                mb: 1,
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box sx={{ mr: 2, minWidth: 40, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  #{index + 1}
                </Typography>
                <Chip
                  label={`${(ref.score * 100).toFixed(0)}%`}
                  size="small"
                  sx={{
                    bgcolor: getScoreColor(ref.score),
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              </Box>

              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="body1" fontWeight="medium">
                      {ref.paper.title}
                    </Typography>
                    {ref.citation.isInfluential && (
                      <Chip
                        icon={<Star sx={{ fontSize: 14 }} />}
                        label="Influential"
                        size="small"
                        sx={{
                          bgcolor: '#ffd700',
                          color: '#000',
                          height: 20,
                          '& .MuiChip-icon': { color: '#000' },
                        }}
                      />
                    )}
                    {ref.paper.hasPdf && (
                      <Chip
                        icon={<PictureAsPdf sx={{ fontSize: 14 }} />}
                        label="PDF"
                        size="small"
                        color="success"
                        sx={{ height: 20 }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Stack spacing={0.5} mt={1}>
                    <Typography variant="caption" color="textSecondary">
                      {ref.paper.authors} • {ref.paper.year}
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        label={`Relevance: ${(ref.citation.relevanceScore * 100).toFixed(0)}%`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20 }}
                      />
                      {ref.citationCount > 0 && (
                        <Chip
                          label={`${ref.citationCount} citations`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20 }}
                        />
                      )}
                      <Chip
                        label={getScoreLabel(ref.score)}
                        size="small"
                        sx={{
                          bgcolor: getScoreColor(ref.score),
                          color: 'white',
                          height: 20,
                        }}
                      />
                    </Box>
                    {ref.citation.citationContext && (
                      <Typography variant="caption" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                        "{ref.citation.citationContext.substring(0, 150)}
                        {ref.citation.citationContext.length > 150 ? '...' : ''}"
                      </Typography>
                    )}
                  </Stack>
                }
              />

              <ListItemSecondaryAction>
                <Stack direction="column" spacing={1}>
                  {!ref.paper.hasPdf && (
                    <Tooltip title="Download metadata">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleDownloadMetadata(ref.paper.id, ref.paper.title)}
                      >
                        <Download />
                      </IconButton>
                    </Tooltip>
                  )}
                  {ref.paper.url && (
                    <Tooltip title="Open URL">
                      <IconButton
                        size="small"
                        href={ref.paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenInNew />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="View details">
                    <IconButton
                      size="small"
                      href={`/papers/${ref.paper.id}`}
                    >
                      <Info />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        {analysis.topReferences.length === 0 && (
          <Alert severity="info">
            No references found matching the criteria. Try lowering the minimum relevance score.
          </Alert>
        )}

        <Box mt={2}>
          <Typography variant="caption" color="textSecondary">
            <strong>Score Calculation:</strong> Relevance (40%) + Influential (30%) + Citation Count (30%)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ReferenceAnalysis;
