import React, { useEffect, useState } from 'react';
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
  Paper,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Tag } from '@/types';

interface TagDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TagFormData) => void;
  existingTag?: Tag | null;
  isLoading?: boolean;
}

export interface TagFormData {
  name: string;
  color?: string;
}

// Predefined color palette
const COLOR_PALETTE = [
  '#f44336', // Red
  '#e91e63', // Pink
  '#9c27b0', // Purple
  '#673ab7', // Deep Purple
  '#3f51b5', // Indigo
  '#2196f3', // Blue
  '#03a9f4', // Light Blue
  '#00bcd4', // Cyan
  '#009688', // Teal
  '#4caf50', // Green
  '#8bc34a', // Light Green
  '#cddc39', // Lime
  '#ffeb3b', // Yellow
  '#ffc107', // Amber
  '#ff9800', // Orange
  '#ff5722', // Deep Orange
  '#795548', // Brown
  '#607d8b', // Blue Grey
];

export const TagDialog: React.FC<TagDialogProps> = ({
  open,
  onClose,
  onSubmit,
  existingTag,
  isLoading = false,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('#2196f3');
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormData>({
    defaultValues: {
      name: '',
      color: '#2196f3',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open && existingTag) {
      reset({
        name: existingTag.name,
        color: existingTag.color || '#2196f3',
      });
      setSelectedColor(existingTag.color || '#2196f3');
    } else if (open && !existingTag) {
      reset({
        name: '',
        color: '#2196f3',
      });
      setSelectedColor('#2196f3');
    }
  }, [open, existingTag, reset]);

  const handleFormSubmit = (data: TagFormData) => {
    onSubmit({
      ...data,
      color: selectedColor,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      setSelectedColor('#2196f3');
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {existingTag ? 'Edit Tag' : 'Create New Tag'}
          </Typography>
          <IconButton onClick={handleClose} disabled={isLoading}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Tag Name */}
            <Controller
              name="name"
              control={control}
              rules={{
                required: 'Tag name is required',
                minLength: {
                  value: 2,
                  message: 'Tag name must be at least 2 characters',
                },
                maxLength: {
                  value: 50,
                  message: 'Tag name must not exceed 50 characters',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tag Name"
                  placeholder="Enter tag name (e.g., Machine Learning, Deep Learning)"
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  disabled={isLoading}
                  autoFocus
                />
              )}
            />

            {/* Color Picker */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tag Color
              </Typography>
              
              {/* Selected Color Preview */}
              <Paper
                elevation={0}
                sx={{
                  width: '100%',
                  height: 60,
                  bgcolor: selectedColor,
                  borderRadius: 1,
                  border: '2px solid',
                  borderColor: 'divider',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'white',
                    textShadow: '0 0 4px rgba(0,0,0,0.5)',
                    fontWeight: 'bold',
                  }}
                >
                  {selectedColor}
                </Typography>
              </Paper>

              {/* Color Palette */}
              <Box display="grid" gridTemplateColumns="repeat(6, 1fr)" gap={1}>
                {COLOR_PALETTE.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    sx={{
                      width: '100%',
                      paddingTop: '100%', // Square aspect ratio
                      bgcolor: color,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '3px solid',
                      borderColor: selectedColor === color ? 'primary.main' : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: 2,
                      },
                    }}
                  />
                ))}
              </Box>

              {/* Custom Color Input */}
              <Box mt={2}>
                <TextField
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  fullWidth
                  label="Custom Color"
                  helperText="Or enter a custom hex color"
                  disabled={isLoading}
                />
              </Box>
            </Box>
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
            {isLoading ? 'Saving...' : (existingTag ? 'Update Tag' : 'Create Tag')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
