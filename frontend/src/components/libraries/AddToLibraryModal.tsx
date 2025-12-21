import React, { useState, useEffect } from 'react';
import { Library } from '@/types';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
} from '@mui/material';
import { Close as XMarkIcon, Folder as FolderIcon, Check as CheckIcon } from '@mui/icons-material';
import { libraryService } from '@/services/library.service';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface AddToLibraryModalProps {
  paperId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddToLibraryModal: React.FC<AddToLibraryModalProps> = ({
  paperId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [librariesWithPaper, setLibrariesWithPaper] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLibraries();
    }
  }, [isOpen, paperId]);

  const loadLibraries = async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Loading libraries for paper:', paperId);
      const [allLibraries, paperLibraries] = await Promise.all([
        libraryService.getAllLibraries(),
        libraryService.getLibrariesForPaper(paperId),
      ]);

      console.log('All libraries:', allLibraries);
      console.log('Paper libraries:', paperLibraries);

      setLibraries(allLibraries);
      setLibrariesWithPaper(new Set(paperLibraries.map(lib => lib.id)));
    } catch (err: any) {
      console.error('Error loading libraries:', err);
      setError(err.response?.data?.message || 'Failed to load libraries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLibrary = async (library: Library) => {
    setIsSubmitting(true);
    setError('');

    try {
      const isInLibrary = librariesWithPaper.has(library.id);
      console.log(`Toggling library "${library.name}" (ID: ${library.id}) for paper ${paperId}, currently in library: ${isInLibrary}`);

      if (isInLibrary) {
        await libraryService.removePaperFromLibrary(library.id, paperId);
        setLibrariesWithPaper(prev => {
          const newSet = new Set(prev);
          newSet.delete(library.id);
          return newSet;
        });
        toast.success(`Removed from "${library.name}"`);
        console.log(`Successfully removed from "${library.name}"`);
      } else {
        await libraryService.addPaperToLibrary(library.id, paperId);
        setLibrariesWithPaper(prev => new Set(prev).add(library.id));
        // toast.success(`Added to "${library.name}"`);
        console.log(`Successfully added to "${library.name}"`);
      }

      // Invalidate library queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['library-papers', library.id] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['library-statistics', library.id] });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error toggling library:', err);
      const errorMsg = err.response?.data?.message || 'Failed to update library';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Add to Libraries</Typography>
          <IconButton onClick={onClose} size="small">
            <XMarkIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : libraries.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary" gutterBottom>
              No libraries found.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create a library first from the Library page.
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {libraries.map((library) => {
              const isInLibrary = librariesWithPaper.has(library.id);

              return (
                <ListItem
                  key={library.id}
                  disablePadding
                  secondaryAction={
                    isInLibrary && <CheckIcon color="primary" />
                  }
                >
                  <ListItemButton
                    onClick={() => handleToggleLibrary(library)}
                    disabled={isSubmitting}
                    sx={{
                      border: 1,
                      borderColor: isInLibrary ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: isInLibrary ? 'primary.50' : 'transparent',
                      '&:hover': {
                        bgcolor: isInLibrary ? 'primary.100' : 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon>
                      <FolderIcon color={isInLibrary ? 'primary' : 'action'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={500}>
                            {library.name}
                          </Typography>
                          {library.isDefault && (
                            <Chip label="Default" size="small" />
                          )}
                        </Box>
                      }
                      secondary={library.description}
                      secondaryTypographyProps={{
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
