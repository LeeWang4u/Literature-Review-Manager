import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Collapse,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  AutoAwesome,
  Refresh,
  ContentCopy,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Lightbulb,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { summaryService } from '@/services/summary.service';
import type { AiSummary } from '@/types';
import toast from 'react-hot-toast';

interface AiSummaryCardProps {
  paperId: number;
}

export const AiSummaryCard: React.FC<AiSummaryCardProps> = ({ paperId }) => {
  const queryClient = useQueryClient();
  const [expandedFindings, setExpandedFindings] = useState(true);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedFindings, setCopiedFindings] = useState(false);

  // Fetch existing summary
  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<AiSummary | null>({
    queryKey: ['summary', paperId],
    queryFn: async () => {
      try {
        return await summaryService.get(paperId);
      } catch (err: any) {
        // If 404, return null (no summary yet)
        if (err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
  });

  // Generate/Regenerate summary mutation
  const generateMutation = useMutation({
    mutationFn: (forceRegenerate: boolean) =>
      summaryService.generate(paperId, { forceRegenerate }),
    onSuccess: (newSummary) => {
      queryClient.setQueryData(['summary', paperId], newSummary);
      toast.success(
        summary ? 'Summary regenerated successfully!' : 'Summary generated successfully!'
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to generate summary. Please try again.'
      );
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate(false);
  };

  const handleRegenerate = () => {
    if (
      window.confirm(
        'Are you sure you want to regenerate the summary? This will replace the existing summary.'
      )
    ) {
      generateMutation.mutate(true);
    }
  };

  const handleCopySummary = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary.summaryText);
      setCopiedSummary(true);
      toast.success('Summary copied to clipboard!');
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCopyFindings = async () => {
    if (!summary || !summary.keyFindings.length) return;

    try {
      const findingsText = summary.keyFindings
        .map((finding, index) => `${index + 1}. ${finding}`)
        .join('\n');
      await navigator.clipboard.writeText(findingsText);
      setCopiedFindings(true);
      toast.success('Key findings copied to clipboard!');
      setTimeout(() => setCopiedFindings(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress size={40} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Alert severity="error">Failed to load AI summary</Alert>
        </CardContent>
      </Card>
    );
  }

  // No summary yet - show generate button
  if (!summary) {
    return (
      <Card
        variant="outlined"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent>
          <Box textAlign="center" py={3}>
            <AutoAwesome sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              AI-Powered Summary
            </Typography>
            <Typography variant="body2" paragraph sx={{ opacity: 0.9 }}>
              Generate an AI summary to quickly understand the key points and findings of this
              research paper.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={
                generateMutation.isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <AutoAwesome />
                )
              }
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              sx={{
                mt: 2,
                bgcolor: 'white',
                color: '#667eea',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate AI Summary'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Summary exists - show content
  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesome color="primary" />
            <Typography variant="h6" fontWeight="bold">
              AI Summary
            </Typography>
          </Box>
          <Chip
            label={`Generated ${formatDate(summary.generatedAt)}`}
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Summary Text */}
        <Box mb={3}>
          <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
            {summary.summaryText}
          </Typography>
        </Box>

        {/* Key Findings Section */}
        {summary.keyFindings && summary.keyFindings.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
                sx={{ cursor: 'pointer' }}
                onClick={() => setExpandedFindings(!expandedFindings)}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Lightbulb color="warning" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Key Findings ({summary.keyFindings.length})
                  </Typography>
                </Box>
                <IconButton size="small">
                  {expandedFindings ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={expandedFindings}>
                <List dense>
                  {summary.keyFindings.map((finding, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircle color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={finding}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: { lineHeight: 1.6 },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          </>
        )}
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box display="flex" gap={1}>
          <Tooltip title="Copy summary to clipboard">
            <Button
              size="small"
              startIcon={copiedSummary ? <CheckCircle /> : <ContentCopy />}
              onClick={handleCopySummary}
              color={copiedSummary ? 'success' : 'primary'}
            >
              {copiedSummary ? 'Copied' : 'Copy Summary'}
            </Button>
          </Tooltip>
          {summary.keyFindings && summary.keyFindings.length > 0 && (
            <Tooltip title="Copy key findings to clipboard">
              <Button
                size="small"
                startIcon={copiedFindings ? <CheckCircle /> : <ContentCopy />}
                onClick={handleCopyFindings}
                color={copiedFindings ? 'success' : 'primary'}
              >
                {copiedFindings ? 'Copied' : 'Copy Findings'}
              </Button>
            </Tooltip>
          )}
        </Box>
        <Tooltip title="Generate a new summary">
          <Button
            size="small"
            startIcon={
              generateMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Refresh />
              )
            }
            onClick={handleRegenerate}
            disabled={generateMutation.isPending}
            color="secondary"
          >
            {generateMutation.isPending ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </Tooltip>
      </CardActions>
    </Card>
  );
};
