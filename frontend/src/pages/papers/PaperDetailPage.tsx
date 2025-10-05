import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import { AccountTree, Edit, Delete, CloudUpload, PictureAsPdf, StickyNote2, LibraryAdd } from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { paperService } from '@/services/paper.service';
import { pdfService } from '@/services/pdf.service';
import { noteService } from '@/services/note.service';
import { libraryService } from '@/services/library.service';
import { ReadingStatus } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PdfUploader } from '@/components/pdf/PdfUploader';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { AiSummaryCard } from '@/components/summary/AiSummaryCard';

const PaperDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState(false);

  const { data: paper, isLoading, error } = useQuery({
    queryKey: ['paper', id],
    queryFn: () => paperService.getById(Number(id)),
    enabled: !!id,
  });

  // Fetch PDFs for this paper
  const { data: pdfFiles = [], isLoading: pdfsLoading } = useQuery({
    queryKey: ['pdfs', id],
    queryFn: () => pdfService.getByPaper(Number(id)),
    enabled: !!id,
  });

  // Fetch notes count for this paper
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => noteService.getByPaper(Number(id)),
    enabled: !!id,
  });

  // Check if paper is in library
  const { data: library = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => libraryService.getLibrary(),
  });
  
  const isInLibrary = library.some(item => item.paperId === Number(id));

  // Add to library mutation
  const addToLibraryMutation = useMutation({
    mutationFn: () => libraryService.addToLibrary({ 
      paperId: Number(id), 
      status: ReadingStatus.TO_READ 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      toast.success('Paper added to library!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add to library');
    },
  });

  // Delete paper mutation
  const deleteMutation = useMutation({
    mutationFn: () => paperService.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paperStatistics'] });
      toast.success('Paper deleted successfully!');
      navigate('/papers');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete paper');
    },
  });

  const handleAddToLibrary = () => {
    addToLibraryMutation.mutate();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this paper? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error || !paper) {
    return (
      <MainLayout>
        <Container maxWidth="md">
          <Alert severity="error">Failed to load paper details</Alert>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h4" gutterBottom sx={{ flex: 1 }}>
              {paper.title}
            </Typography>
            <Box display="flex" gap={1}>
              {!isInLibrary && (
                <Tooltip title="Add to Library">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<LibraryAdd />}
                    onClick={handleAddToLibrary}
                    disabled={addToLibraryMutation.isPending}
                    sx={{ mr: 1 }}
                  >
                    Add to Library
                  </Button>
                </Tooltip>
              )}
              {isInLibrary && (
                <Chip 
                  label="In Library" 
                  color="success" 
                  sx={{ mr: 1, height: 36 }} 
                />
              )}
              <Tooltip title="Edit Paper">
                <IconButton
                  color="primary"
                  onClick={() => navigate(`/papers/${id}/edit`)}
                  disabled={deleteMutation.isPending}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Paper">
                <IconButton
                  color="error"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            {paper.authors}
          </Typography>

          <Box mt={2} mb={2}>
            <Typography variant="body2">
              <strong>Year:</strong> {paper.publicationYear}
            </Typography>
            {paper.journal && (
              <Typography variant="body2">
                <strong>Journal:</strong> {paper.journal}
              </Typography>
            )}
            {paper.doi && (
              <Typography variant="body2">
                <strong>DOI:</strong> {paper.doi}
              </Typography>
            )}
            {paper.url && (
              <Typography variant="body2">
                <strong>URL:</strong>{' '}
                <a href={paper.url} target="_blank" rel="noopener noreferrer">
                  {paper.url}
                </a>
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Abstract
          </Typography>
          <Typography variant="body1" paragraph>
            {paper.abstract || 'No abstract available'}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Tags
            </Typography>
            <Box>
              {paper.tags && paper.tags.length > 0 ? (
                paper.tags.map((tag) => (
                  <Chip key={tag.id} label={tag.name} sx={{ mr: 1, mb: 1 }} />
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No tags
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* PDF Section */}
          <Box mt={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <PictureAsPdf /> PDF Files
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => setShowUploader(!showUploader)}
                size="small"
              >
                {showUploader ? 'Hide Uploader' : 'Upload PDF'}
              </Button>
            </Box>

            {/* PDF Uploader (Collapsible) */}
            <Collapse in={showUploader}>
              <Box mb={3}>
                <PdfUploader
                  paperId={Number(id)}
                  onUploadComplete={() => {
                    setShowUploader(false);
                  }}
                />
              </Box>
            </Collapse>

            {/* PDF Viewer */}
            {pdfsLoading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={30} />
              </Box>
            ) : (
              <PdfViewer pdfFiles={pdfFiles} paperId={Number(id)} />
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Notes Section */}
          <Box mt={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <StickyNote2 /> Notes
                {notes.length > 0 && (
                  <Chip label={notes.length} size="small" color="primary" />
                )}
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate(`/papers/${id}/notes`)}
            >
              {notes.length > 0 ? `View All ${notes.length} Notes` : 'Add Your First Note'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* AI Summary Section */}
          <Box mt={3}>
            <AiSummaryCard paperId={Number(id)} />
          </Box>

          <Box mt={4}>
            <Button
              variant="contained"
              startIcon={<AccountTree />}
              onClick={() => navigate(`/citations/${paper.id}`)}
              fullWidth
            >
              View Citation Network
            </Button>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default PaperDetailPage;
