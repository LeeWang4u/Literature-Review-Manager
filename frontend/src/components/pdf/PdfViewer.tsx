import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  PictureAsPdf,
  Download,
  Delete,
  Visibility,
  Close,
  OpenInNew,
} from '@mui/icons-material';
import { pdfService } from '@/services/pdf.service';
import { PdfFile } from '@/types';
import toast from 'react-hot-toast';

interface PdfViewerProps {
  pdfFiles: PdfFile[];
  paperId: number;
}


export const PdfViewer: React.FC<PdfViewerProps> = ({ pdfFiles, paperId }) => {
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pdfService.delete(id),
    onSuccess: async (_data, deletedId) => {
      // Optimistically update cache by removing the deleted PDF
      const currentPdfs = queryClient.getQueryData(['pdfs', String(paperId)]);
      if (currentPdfs) {
        queryClient.setQueryData(
          ['pdfs', String(paperId)], 
          (currentPdfs as any[]).filter(pdf => pdf.id !== deletedId)
        );
      }
      
      // Then refetch to ensure server state is correct
      await queryClient.refetchQueries({ 
        queryKey: ['pdfs', String(paperId)],
        type: 'active'
      });
      
      toast.success('PDF deleted successfully!');
      setDeletingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete PDF');
      setDeletingId(null);
    },
  });

  const handleDownload = async (pdf: PdfFile) => {
    try {
      await pdfService.download(pdf.id, pdf.originalFilename);
      toast.success('PDF downloaded!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download PDF');
    }
  };

  const handlePreview = async (pdf: PdfFile) => {
    console.log('🔍 Preview clicked for PDF:', pdf);
    try {
      console.log('📡 Fetching PDF from API:', `/pdf/download/${pdf.id}`);
      
      // Fetch PDF with authentication
      const response = await axiosInstance.get(`/pdf/download/${pdf.id}`, {
        responseType: 'blob',
      });
      
      console.log('✅ PDF fetched successfully, size:', response.data.size, 'bytes');
      
      // Create a local blob URL for preview
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      console.log('🔗 Blob URL created:', url);
      
      setPreviewUrl(url);
      setPreviewFilename(pdf.originalFilename);
      setPreviewOpen(true);
    } catch (error) {
      console.error('❌ Error loading PDF preview:', error);
      alert('Failed to load PDF preview');
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    // Clean up blob URL to prevent memory leak
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFilename('');
  };

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId !== null) {
      setDeletingId(confirmDeleteId);
      deleteMutation.mutate(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (pdfFiles.length === 0) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.default',
        }}
      >
        <PictureAsPdf sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body2" color="textSecondary">
          No PDF files uploaded yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" flexDirection="column" gap={2}>
        {pdfFiles.map((pdf) => (
          <Card key={pdf.id} variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PictureAsPdf sx={{ fontSize: 40, color: 'error.main', flexShrink: 0 }} />
                
                <Box flex={1} minWidth={0}>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight="bold"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {pdf.originalFilename}
                  </Typography>
                  <Box display="flex" gap={1} alignItems="center" mt={0.5}>
                    <Chip
                      label={`v${pdf.version}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 0.5 }}
                    />
                    <Chip
                      label={formatFileSize(pdf.fileSize)}
                      size="small"
                      variant="outlined"
                    />
                    <Typography variant="caption" color="textSecondary">
                      Uploaded: {formatDate(pdf.uploadedAt)}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" gap={1} flexShrink={0}>
                  <Tooltip title="Preview PDF">
                    <IconButton
                      color="primary"
                      onClick={() => {
                        console.log('👆 Preview button clicked!');
                        handlePreview(pdf);
                      }}
                      size="small"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Download PDF">
                    <IconButton
                      color="primary"
                      onClick={() => handleDownload(pdf)}
                      size="small"
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete PDF">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(pdf.id)}
                      disabled={deletingId === pdf.id}
                      size="small"
                    >
                      {deletingId === pdf.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <Delete />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* PDF Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{previewFilename}</Typography>
            <IconButton onClick={handleClosePreview} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {previewUrl && (
            <iframe
              src={previewUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title={previewFilename}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>

          <Button
           variant="outlined"
           startIcon={<OpenInNew />}
           onClick={() => {
             const pdf = pdfFiles.find((p) => p.originalFilename === previewFilename);
             if (!pdf) return;
             const url = `${window.location.origin}/pdf/view/${pdf.id}`;
             window.open(url, '_blank', 'noopener,noreferrer');
           }}
           disabled={!previewFilename}
         >
           View details
         </Button>
           

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => {
              const pdf = pdfFiles.find((p) => p.originalFilename === previewFilename);
              if (pdf) handleDownload(pdf);
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteId !== null} onClose={handleCancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this PDF? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
