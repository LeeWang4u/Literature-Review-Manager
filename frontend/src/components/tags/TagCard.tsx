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
import { Edit, Delete, Label } from '@mui/icons-material';
import { Tag } from '@/types';

interface TagCardProps {
  tag: Tag;
  paperCount?: number;
  onEdit: (tag: Tag) => void;
  onDelete: (id: number) => void;
  onClickTag?: (tag: Tag) => void; 
}

export const TagCard: React.FC<TagCardProps> = ({ tag, paperCount = 0, onEdit, onDelete, onClickTag }) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all papers.`)) {
      onDelete(tag.id);
    }
  };

  return (
    <Card 
      onClick={() => onClickTag && onClickTag(tag)}
      variant="outlined" 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.2s',
        borderLeft: `4px solid ${tag.color || '#1976d2'}`,
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Tag Name with Color */}
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Label sx={{ color: tag.color || '#1976d2' }} />
          <Typography variant="h6" fontWeight="bold">
            {tag.name}
          </Typography>
        </Box>

        {/* Color Preview */}
        <Box mb={2}>
          <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>
            Color:
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: 40,
              bgcolor: tag.color || '#1976d2',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        </Box>

        {/* Statistics */}
        <Box display="flex" gap={1} mb={2}>
          <Chip 
            label={`${paperCount} ${paperCount === 1 ? 'paper' : 'papers'}`} 
            size="small" 
            variant="outlined"
            color="primary"
          />
        </Box>

        {/* Created Date */}
        <Typography variant="caption" color="textSecondary">
          Created: {formatDate(tag.createdAt)}
        </Typography>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <Tooltip title="Edit Tag">
          <IconButton 
            size="small" 
            color="primary" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(tag);
            }}
          >
            <Edit />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete Tag">
          <IconButton 
            size="small" 
            color="error" 
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            <Delete />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};
