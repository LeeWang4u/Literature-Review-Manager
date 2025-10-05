import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert,
  Typography,
  InputAdornment,
} from '@mui/material';
import { AutoAwesome, Save, Close } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paperService } from '@/services/paper.service';
import { paperMetadataService } from '@/services/paper-metadata.service';
import { pdfService } from '@/services/pdf.service';
import { CreatePaperData } from '@/types';
import toast from 'react-hot-toast';

interface QuickAddDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (paperId: number) => void;
}

export const QuickAddDialog: React.FC<QuickAddDialogProps> = ({ open, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [doiInput, setDoiInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [showMetadata, setShowMetadata] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreatePaperData) => paperService.create(data),
    onSuccess: async (createdPaper) => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paperStatistics'] });
      toast.success('Paper added successfully!');

      // Auto-upload ArXiv PDF if available
      if (metadata?.pdfAvailable && metadata?.arxivId) {
        try {
          toast.loading('Uploading PDF from ArXiv...', { id: 'arxiv-upload-dialog' });
          
          // Download PDF from ArXiv
          const result = await paperService.downloadArxivPdf(metadata.url || metadata.arxivId);
          
          // Convert base64 to blob
          const binaryString = atob(result.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          
          // Upload to server
          await pdfService.uploadBlob(createdPaper.id, blob, result.filename);
          queryClient.invalidateQueries({ queryKey: ['pdfs', createdPaper.id] });
          
          toast.success('PDF uploaded successfully!', { id: 'arxiv-upload-dialog' });
        } catch (pdfError: any) {
          console.error('Error auto-uploading PDF:', pdfError);
          toast.error('Paper saved but PDF upload failed', { id: 'arxiv-upload-dialog' });
        }
      }
      
      // Reset state
      setDoiInput('');
      setMetadata(null);
      setShowMetadata(false);
      
      onClose();
      
      // Call success callback with paper ID
      if (onSuccess) {
        onSuccess(createdPaper.id);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add paper');
    },
  });

  const handleExtract = async () => {
    if (!doiInput.trim()) {
      toast.error('Please enter a DOI or URL');
      return;
    }

    setIsExtracting(true);
    try {
      const extractedMetadata = await paperMetadataService.extractMetadata(doiInput.trim());
      setMetadata(extractedMetadata);
      setShowMetadata(true);
      toast.success('Metadata extracted! Review and save below.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to extract metadata');
      setShowMetadata(false);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = () => {
    if (!metadata) {
      toast.error('Please extract metadata first');
      return;
    }

    const paperData: CreatePaperData = {
      title: metadata.title || '',
      authors: metadata.authors || '',
      abstract: metadata.abstract || '',
      publicationYear: metadata.publicationYear || new Date().getFullYear(),
      journal: metadata.journal || '',
      doi: metadata.doi || '',
      url: metadata.url || '',
    };

    createMutation.mutate(paperData);
  };

  const handleClose = () => {
    setDoiInput('');
    setMetadata(null);
    setShowMetadata(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Quick Add Paper</Typography>
          <Button onClick={handleClose} size="small">
            <Close />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Enter a DOI or URL (ArXiv, CrossRef, etc.) to automatically fetch and save the paper.
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="DOI or URL"
            placeholder="e.g., 10.1038/nature12373 or https://arxiv.org/abs/1706.03762"
            value={doiInput}
            onChange={(e) => setDoiInput(e.target.value)}
            disabled={isExtracting}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleExtract();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AutoAwesome color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleExtract}
            disabled={isExtracting || !doiInput.trim()}
            startIcon={isExtracting ? <CircularProgress size={20} /> : <AutoAwesome />}
          >
            {isExtracting ? 'Extracting Metadata...' : 'Extract Metadata'}
          </Button>

          {/* Show extracted metadata */}
          {showMetadata && metadata && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Preview:
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                <strong>Title:</strong> {metadata.title}
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                <strong>Authors:</strong> {metadata.authors}
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                <strong>Year:</strong> {metadata.publicationYear}
              </Typography>
              
              {metadata.journal && (
                <Typography variant="body2" gutterBottom>
                  <strong>Journal:</strong> {metadata.journal}
                </Typography>
              )}
              
              {metadata.abstract && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Abstract:</strong> {metadata.abstract.substring(0, 200)}
                  {metadata.abstract.length > 200 ? '...' : ''}
                </Typography>
              )}

              {metadata.pdfAvailable && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    ✅ PDF available from ArXiv
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={createMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!showMetadata || createMutation.isPending}
          startIcon={createMutation.isPending ? <CircularProgress size={20} /> : <Save />}
        >
          {createMutation.isPending ? 'Saving...' : 'Save Paper'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
