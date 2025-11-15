import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  Button,
  Rating,
  Stack,
  Divider,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  OpenInNew,
  Star,
  FormatQuote,
  Timeline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Citation } from '@/types';

interface CitationListProps {
  paperId: number;
  citations: Citation[];
  type: 'references' | 'citedBy';
}

export const CitationList: React.FC<CitationListProps> = ({ paperId: _paperId, citations, type }) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getPaperFromCitation = (citation: Citation) => {
    return type === 'references' 
      ? citation.citedPaper 
      : citation.citingPaper;
  };

  // Sort: influential first, then by relevance score, then by year
  const sortedCitations = [...citations].sort((a, b) => {
    if (a.isInfluential && !b.isInfluential) return -1;
    if (!a.isInfluential && b.isInfluential) return 1;
    
    const scoreA = a.relevanceScore || 0;
    const scoreB = b.relevanceScore || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    
    const yearA = getPaperFromCitation(a)?.publicationYear || 0;
    const yearB = getPaperFromCitation(b)?.publicationYear || 0;
    return yearB - yearA;
  });

  if (citations.length === 0) {
    return (
      <Alert severity="info">
        No {type === 'references' ? 'references' : 'citations'} available for this paper.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Typography variant="body2" color="textSecondary">
          {citations.length} {type === 'references' ? 'References' : 'Citing Papers'}
        </Typography>
        {citations.some(c => c.isInfluential) && (
          <Chip 
            icon={<Star sx={{ fontSize: 16 }} />}
            label={`${citations.filter(c => c.isInfluential).length} Influential`}
            size="small"
            sx={{ 
              bgcolor: '#ffd700',
              color: '#000',
              fontWeight: 'bold'
            }}
          />
        )}
      </Stack>

      <List disablePadding>
        {sortedCitations.map((citation, index) => {
          const paper = getPaperFromCitation(citation);
          if (!paper) return null;

          const isExpanded = expandedId === citation.id;

          return (
            <Paper 
              key={citation.id} 
              variant="outlined" 
              sx={{ 
                mb: 1.5,
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: 2,
                  borderColor: 'primary.main'
                }
              }}
            >
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  <Box display="flex" gap={1}>
                    <Tooltip title="View Details">
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={() => navigate(`/papers/${paper.id}`)}
                      >
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton 
                      edge="end" 
                      size="small"
                      onClick={() => toggleExpand(citation.id)}
                    >
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                }
                sx={{ 
                  pr: 10,
                  bgcolor: citation.isInfluential ? 'rgba(255, 215, 0, 0.05)' : 'transparent',
                  borderLeft: citation.isInfluential ? '4px solid #ffd700' : 'none',
                  pl: citation.isInfluential ? 2 : 2
                }}
              >
                <ListItemText
                  primary={
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                        <Typography 
                          variant="body1" 
                          fontWeight={citation.isInfluential ? 600 : 400}
                          sx={{ 
                            flex: 1,
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main' }
                          }}
                          onClick={() => navigate(`/papers/${paper.id}`)}
                        >
                          {index + 1}. {paper.title}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" mb={0.5}>
                        {citation.isInfluential && (
                          <Chip 
                            icon={<Star sx={{ fontSize: 14 }} />}
                            label="Influential"
                            size="small"
                            sx={{ 
                              height: 20,
                              bgcolor: '#ffd700',
                              color: '#000',
                              fontWeight: 'bold',
                              fontSize: '0.7rem'
                            }}
                          />
                        )}
                        {paper.publicationYear && (
                          <Chip 
                            label={paper.publicationYear} 
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {citation.relevanceScore && (
                          <Tooltip title={`Relevance: ${citation.relevanceScore}/1.0`}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Rating 
                                value={citation.relevanceScore * 5} 
                                precision={0.1}
                                readOnly 
                                size="small"
                                sx={{ fontSize: '1rem' }}
                              />
                              <Typography variant="caption" color="textSecondary">
                                ({citation.relevanceScore.toFixed(2)})
                              </Typography>
                            </Box>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {paper.authors}
                      </Typography>
                      {paper.journal && (
                        <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                          {paper.journal}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider />
                <Box p={2} bgcolor="grey.50">
                  {citation.citationContext && (
                    <Box mb={2}>
                      <Typography 
                        variant="subtitle2" 
                        display="flex" 
                        alignItems="center" 
                        gap={0.5}
                        gutterBottom
                        color="primary"
                      >
                        <FormatQuote fontSize="small" />
                        Citation Context
                      </Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          bgcolor: 'background.paper',
                          fontStyle: 'italic',
                          borderLeft: '3px solid',
                          borderLeftColor: 'primary.main'
                        }}
                      >
                        <Typography variant="body2">
                          "{citation.citationContext}"
                        </Typography>
                      </Paper>
                    </Box>
                  )}

                  {paper.abstract && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom color="textSecondary">
                        Abstract
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {paper.abstract.substring(0, 300)}
                        {paper.abstract.length > 300 && '...'}
                      </Typography>
                    </Box>
                  )}

                  <Box mt={2} display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<OpenInNew />}
                      onClick={() => navigate(`/papers/${paper.id}`)}
                    >
                      View Full Paper
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<Timeline />}
                      onClick={() => navigate(`/citations/${paper.id}`)}
                    >
                      Citation Network
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </List>
    </Box>
  );
};
