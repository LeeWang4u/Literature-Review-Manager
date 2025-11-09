import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Note } from '@/types';

interface NoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NoteFormData) => void;
  existingNote?: Note | null;
  isLoading?: boolean;
}

export interface NoteFormData {
  title: string;
  content: string;
  highlightedText?: string;
  pageNumber?: number;
}

// export interface NoteFormDataSubmit {
//   content: string;
//   highlightedText?: string;
//   pageNumber?: number;
// }

export const NoteDialog: React.FC<NoteDialogProps> = ({
  open,
  onClose,
  onSubmit,
  existingNote,
  isLoading = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteFormData>({
    defaultValues: {
      title: '',
      content: '',
      highlightedText: '',
      pageNumber: undefined,
    },
  });

  // Reset form when dialog opens with existing note
  useEffect(() => {
    if (open && existingNote) {
      reset({
        title: existingNote.title,
        content: existingNote.content,
        highlightedText: existingNote.highlightedText || '',
        pageNumber: existingNote.pageNumber || undefined,
      });
    } else if (open && !existingNote) {
      reset({
        title: '',
        content: '',
        highlightedText: '',
        pageNumber: undefined,
      });
    }
  }, [open, existingNote, reset]);

  const handleFormSubmit = (data: NoteFormData) => {


    onSubmit(data);
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {existingNote ? 'Edit Note' : 'Create New Note'}
          </Typography>
          <IconButton onClick={handleClose} disabled={isLoading}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Title */}
            <Controller
              name="title"
              control={control}
              rules={{
                required: 'Title is required',
                minLength: {
                  value: 3,
                  message: 'Title must be at least 3 characters',
                },
                maxLength: {
                  value: 200,
                  message: 'Title must not exceed 200 characters',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Note Title"
                  placeholder="Enter a descriptive title for your note"
                  fullWidth
                  required
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  disabled={isLoading}
                  autoFocus
                />
              )}
            />

            {/* Content */}
            <Controller
              name="content"
              control={control}
              rules={{
                required: 'Content is required',
                minLength: {
                  value: 10,
                  message: 'Content must be at least 10 characters',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Note Content"
                  placeholder="Write your note here... You can include observations, questions, or insights about the paper."
                  fullWidth
                  required
                  multiline
                  rows={8}
                  error={!!errors.content}
                  helperText={errors.content?.message}
                  disabled={isLoading}
                />
              )}
            />

            {/* Highlighted Text */}
            <Controller
              name="highlightedText"
              control={control}
              rules={{
                maxLength: {
                  value: 1000,
                  message: 'Highlighted text must not exceed 1000 characters',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Highlighted Text (Optional)"
                  placeholder="Copy and paste text from the paper that you want to reference"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.highlightedText}
                  helperText={errors.highlightedText?.message || 'Optional: Text from the paper you want to highlight'}
                  disabled={isLoading}
                />
              )}
            />

            {/* Page Number */}
            <Controller
              name="pageNumber"
              control={control}
              rules={{
                min: {
                  value: 1,
                  message: 'Page number must be at least 1',
                },
                max: {
                  value: 10000,
                  message: 'Page number must not exceed 10000',
                },
              }}
              render={({ field: { value, onChange, ...field } }) => (
                <TextField
                  {...field}
                  value={value || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange(val === '' ? undefined : Number(val));
                  }}
                  label="Page Number (Optional)"
                  placeholder="Enter the page number where you found this information"
                  type="number"
                  fullWidth
                  error={!!errors.pageNumber}
                  helperText={errors.pageNumber?.message || 'Optional: Reference page number in the paper'}
                  disabled={isLoading}
                  InputProps={{
                    inputProps: { min: 1, max: 10000 },
                  }}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : (existingNote ? 'Update Note' : 'Create Note')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
