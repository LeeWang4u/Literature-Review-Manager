import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Paper as MuiPaper,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import { Add, Search, Label } from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { TagCard } from '@/components/tags/TagCard';
import { TagDialog, TagFormData } from '@/components/tags/TagDialog';
import { tagService } from '@/services/tag.service';
import { paperService } from '@/services/paper.service';
import type { Tag, Paper } from '@/types';
import toast from 'react-hot-toast';

const TagsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all tags
  const { data: tags = [], isLoading, error } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagService.getAll(),
  });

  // Fetch all papers to count tag usage (using search with no filters to get all)
  const { data: papersResponse } = useQuery({
    queryKey: ['papers-all'],
    queryFn: () => paperService.search({ page: 1, pageSize: 1000 }),
  });

  const papers: Paper[] = papersResponse?.data || [];

  // Create tag mutation
  const createMutation = useMutation({
    mutationFn: (data: TagFormData) => tagService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag created successfully!');
      setDialogOpen(false);
      setEditingTag(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create tag');
    },
  });

  // Update tag mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TagFormData }) =>
      tagService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Tag updated successfully!');
      setDialogOpen(false);
      setEditingTag(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update tag');
    },
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => tagService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Tag deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete tag');
    },
  });

  const HandleClickTag = (tag: Tag) => {
    navigate(`/tags/${tag.id}`);
  };

  const handleOpenDialog = () => {
    setEditingTag(null);
    setDialogOpen(true);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTag(null);
  };

  const handleSubmit = (data: TagFormData) => {
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteTag = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Count papers per tag
  const getTagPaperCount = (tagId: number): number => {
    return papers.filter((paper: Paper) => 
      paper.tags?.some((tag) => tag.id === tagId)
    ).length;
  };

  // Filter tags by search query
  const filteredTags = tags.filter((tag) => {
    const query = searchQuery.toLowerCase();
    return tag.name.toLowerCase().includes(query);
  });

  // Calculate statistics
  const totalTags = tags.length;
  const tagsWithPapers = tags.filter((tag) => getTagPaperCount(tag.id) > 0).length;
  const totalPaperTagAssignments = papers.reduce(
    (sum: number, paper: Paper) => sum + (paper.tags?.length || 0),
    0
  );

  if (isLoading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Container maxWidth="lg">
          <Alert severity="error">Failed to load tags</Alert>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" gutterBottom fontWeight="bold" display="flex" alignItems="center" gap={1}>
            <Label /> Tags
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Organize your papers with tags for better categorization and discovery
          </Typography>
        </Box>

        {/* Statistics */}
        <MuiPaper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Tag Statistics
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip 
              label={`${totalTags} Total Tags`} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              label={`${tagsWithPapers} Tags in Use`} 
              color="success" 
              variant="outlined"
            />
            <Chip 
              label={`${totalPaperTagAssignments} Tag Assignments`} 
              color="info" 
              variant="outlined"
            />
          </Box>
        </MuiPaper>

        {/* Action Bar */}
        <MuiPaper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            {/* Search */}
            <TextField
              placeholder="Search tags..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />

            {/* Add Tag Button */}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenDialog}
            >
              Add Tag
            </Button>
          </Box>
        </MuiPaper>

        {/* Tags Grid */}
        {filteredTags.length === 0 ? (
          <MuiPaper 
            elevation={0} 
            sx={{ 
              p: 4, 
              textAlign: 'center', 
              border: '2px dashed',
              borderColor: 'divider',
            }}
          >
            <Label sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              {searchQuery ? 'No tags found matching your search' : 'No tags yet'}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {searchQuery 
                ? 'Try a different search term'
                : 'Create tags to organize and categorize your research papers. Tags make it easier to find related papers and track research themes.'
              }
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenDialog}
                sx={{ mt: 2 }}
              >
                Create Your First Tag
              </Button>
            )}
          </MuiPaper>
        ) : (
          <Grid container spacing={3}>
            {filteredTags.map((tag) => (
              <Grid item xs={12} sm={6} md={4} key={tag.id}>

                <TagCard
                  tag={tag}
                  paperCount={getTagPaperCount(tag.id)}
                  onEdit={handleEditTag}
                  onDelete={handleDeleteTag}
                  onClickTag={HandleClickTag}

                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tag Dialog */}
        <TagDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSubmit={handleSubmit}
          existingTag={editingTag}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Container>
    </MainLayout>
  );
};

export default TagsPage;
