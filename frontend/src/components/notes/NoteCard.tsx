import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import { Edit, Delete, Article } from '@mui/icons-material';
import { Note } from '@/types';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onView?: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete, onView }) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength: number = 200): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      onDelete(note.id);
    }
  };

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent 
        sx={{ 
          flexGrow: 1,
          cursor: onView ? 'pointer' : 'default',
          '&:hover': onView ? {
            bgcolor: 'action.hover',
          } : {}
        }}
        onClick={() => onView?.(note)}
      >
        {/* Title */}
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Article color="primary" />
          {note.title}
        </Typography>

        {/* Content Preview */}
        <Typography 
          variant="body2" 
          color="textSecondary" 
          paragraph
          sx={{ mb: 2 }}
        >
          {truncateContent(note.content)}
        </Typography>

        {/* Metadata */}
        <Box display="flex" flexDirection="column" gap={1}>
          {/* Page Number */}
          {note.pageNumber && (
            <Chip 
              label={`Page ${note.pageNumber}`} 
              size="small" 
              variant="outlined"
              color="primary"
            />
          )}

          {/* Timestamps */}
          <Box>
            <Typography variant="caption" color="textSecondary">
              Created: {formatDate(note.createdAt)}
            </Typography>
            {note.updatedAt !== note.createdAt && (
              <Typography variant="caption" color="textSecondary" display="block">
                Updated: {formatDate(note.updatedAt)}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <Tooltip title="Edit Note">
          <IconButton size="small" color="primary" onClick={() => onEdit(note)}>
            <Edit />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete Note">
          <IconButton size="small" color="error" onClick={handleDelete}>
            <Delete />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};
