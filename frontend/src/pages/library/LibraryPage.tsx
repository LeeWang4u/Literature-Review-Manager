import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Rating,
  Tabs,
  Tab,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Tooltip,
  Alert,
  Snackbar,
  Paper as MuiPaper,
} from '@mui/material';
import {
  Visibility,
  CheckBoxOutlineBlank,
  CheckBox,
  Delete,
  Edit,
  FilterList,
} from '@mui/icons-material';
import { libraryService } from '@/services/library.service';
import { ReadingStatus, LibraryItem } from '@/types';

const statusColors = {
  [ReadingStatus.TO_READ]: 'default',
  [ReadingStatus.READING]: 'primary',
  [ReadingStatus.READ]: 'success',
  [ReadingStatus.COMPLETED]: 'success',
  [ReadingStatus.FAVORITE]: 'warning',
} as const;

const statusLabels = {
  [ReadingStatus.TO_READ]: 'To Read',
  [ReadingStatus.READING]: 'Reading',
  [ReadingStatus.READ]: 'Read',
  [ReadingStatus.COMPLETED]: 'Completed',
  [ReadingStatus.FAVORITE]: 'Favorites',
};

interface TabValue {
  value: string;
  label: string;
  count?: number;
}

const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ anchor: HTMLElement; itemId: number } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Queries
  const { data: library, isLoading, error } = useQuery({
    queryKey: ['library'],
    queryFn: async () => {
      console.log('📚 Fetching library data...');
      const result = await libraryService.getLibrary();
      console.log('✅ Library data received:', result);
      return result;
    },
  });
  
  console.log('📊 Library Page State:', { library, isLoading, error });

  const { data: stats } = useQuery({
    queryKey: ['library-statistics'],
    queryFn: () => libraryService.getStatistics(),
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReadingStatus }) =>
      libraryService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['library-statistics'] });
      showSnackbar('Status updated successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to update status', 'error');
    },
  });

  const ratePaperMutation = useMutation({
    mutationFn: ({ id, rating }: { id: number; rating: number }) =>
      libraryService.ratePaper(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['library-statistics'] });
      showSnackbar('Rating updated successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to update rating', 'error');
    },
  });

  const removeFromLibraryMutation = useMutation({
    mutationFn: (id: number) => libraryService.removeFromLibrary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['library-statistics'] });
      showSnackbar('Removed from library', 'success');
    },
    onError: () => {
      showSnackbar('Failed to remove from library', 'error');
    },
  });

  // Filtered library items
  const filteredLibrary = useMemo(() => {
    if (!library) return [];

    let filtered = library;

    // Filter by status tab
    if (currentTab !== 'all') {
      filtered = filtered.filter((item) => item.status === currentTab);
    }

    // Filter by rating
    if (ratingFilter !== 'all') {
      filtered = filtered.filter((item) => item.rating === ratingFilter);
    }

    return filtered;
  }, [library, currentTab, ratingFilter]);

  // Tab values with counts
  const tabs: TabValue[] = useMemo(() => {
    const allCount = library?.length || 0;
    return [
      { value: 'all', label: 'All', count: allCount },
      { value: ReadingStatus.TO_READ, label: 'To Read', count: stats?.byStatus[ReadingStatus.TO_READ] || 0 },
      { value: ReadingStatus.READING, label: 'Reading', count: stats?.byStatus[ReadingStatus.READING] || 0 },
      { value: ReadingStatus.READ, label: 'Read', count: stats?.byStatus[ReadingStatus.READ] || 0 },
      { value: ReadingStatus.COMPLETED, label: 'Completed', count: stats?.byStatus[ReadingStatus.COMPLETED] || 0 },
      { value: ReadingStatus.FAVORITE, label: 'Favorites', count: stats?.byStatus[ReadingStatus.FAVORITE] || 0 },
    ];
  }, [library, stats]);

  // Handlers
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
    setSelectedItems(new Set());
  };

  const handleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredLibrary.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredLibrary.map((item) => item.id)));
    }
  };

  const handleBulkAction = (action: 'status' | 'rate' | 'remove', value?: any) => {
    const itemsToUpdate = Array.from(selectedItems);
    
    if (action === 'status' && value) {
      itemsToUpdate.forEach((id) => {
        updateStatusMutation.mutate({ id, status: value });
      });
    } else if (action === 'rate' && value) {
      itemsToUpdate.forEach((id) => {
        ratePaperMutation.mutate({ id, rating: value });
      });
    } else if (action === 'remove') {
      itemsToUpdate.forEach((id) => {
        removeFromLibraryMutation.mutate(id);
      });
    }

    setSelectedItems(new Set());
    setBulkMenuAnchor(null);
  };

  const handleRatePaper = (id: number, rating: number | null) => {
    if (rating !== null) {
      ratePaperMutation.mutate({ id, rating });
    }
  };

  const handleRemoveFromLibrary = (id: number) => {
    if (window.confirm('Are you sure you want to remove this paper from your library?')) {
      removeFromLibraryMutation.mutate(id);
    }
  };

  const calculateProgress = (item: LibraryItem): number => {
    switch (item.status) {
      case ReadingStatus.TO_READ:
        return 0;
      case ReadingStatus.READING:
        return 50;
      case ReadingStatus.READ:
      case ReadingStatus.COMPLETED:
        return 100;
      case ReadingStatus.FAVORITE:
        return item.rating ? (item.rating / 5) * 100 : 0;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">My Library</Typography>
          {stats && (
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total: {stats.total} papers
                {stats.averageRating && ` • Avg Rating: ${parseFloat(stats.averageRating).toFixed(1)} ⭐`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Status Tabs */}
        <MuiPaper sx={{ mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {tab.label}
                    <Chip label={tab.count} size="small" />
                  </Box>
                }
              />
            ))}
          </Tabs>
        </MuiPaper>

        {/* Filters and Bulk Actions */}
        {filteredLibrary.length > 0 && (
          <MuiPaper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Rating</InputLabel>
                  <Select
                    value={ratingFilter}
                    label="Filter by Rating"
                    onChange={(e) => setRatingFilter(e.target.value as number | 'all')}
                    startAdornment={<FilterList sx={{ mr: 1 }} />}
                  >
                    <MenuItem value="all">All Ratings</MenuItem>
                    <MenuItem value={5}>⭐⭐⭐⭐⭐ (5 stars)</MenuItem>
                    <MenuItem value={4}>⭐⭐⭐⭐ (4 stars)</MenuItem>
                    <MenuItem value={3}>⭐⭐⭐ (3 stars)</MenuItem>
                    <MenuItem value={2}>⭐⭐ (2 stars)</MenuItem>
                    <MenuItem value={1}>⭐ (1 star)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant={selectedItems.size > 0 ? 'contained' : 'outlined'}
                  startIcon={selectedItems.size === filteredLibrary.length ? <CheckBox /> : <CheckBoxOutlineBlank />}
                  onClick={handleSelectAll}
                  fullWidth
                >
                  {selectedItems.size > 0 ? `${selectedItems.size} Selected` : 'Select All'}
                </Button>
              </Grid>

              {selectedItems.size > 0 && (
                <Grid item xs={12} sm={12} md={6}>
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
                    >
                      Change Status
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        const rating = window.prompt('Enter rating (1-5):');
                        if (rating && Number(rating) >= 1 && Number(rating) <= 5) {
                          handleBulkAction('rate', Number(rating));
                        }
                      }}
                    >
                      Rate Papers
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => {
                        if (window.confirm(`Remove ${selectedItems.size} papers from library?`)) {
                          handleBulkAction('remove');
                        }
                      }}
                      startIcon={<Delete />}
                    >
                      Remove
                    </Button>
                  </Box>

                  {/* Bulk Status Menu */}
                  <Menu
                    anchorEl={bulkMenuAnchor}
                    open={Boolean(bulkMenuAnchor)}
                    onClose={() => setBulkMenuAnchor(null)}
                  >
                    {Object.values(ReadingStatus).map((status) => (
                      <MenuItem key={status} onClick={() => handleBulkAction('status', status)}>
                        <ListItemIcon>
                          <Edit fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{statusLabels[status]}</ListItemText>
                      </MenuItem>
                    ))}
                  </Menu>
                </Grid>
              )}
            </Grid>
          </MuiPaper>
        )}

        {/* Library Items Grid */}
        <Grid container spacing={3}>
          {filteredLibrary.map((item) => (
            <Grid item xs={12} md={6} key={item.id}>
              <Card
                sx={{
                  position: 'relative',
                  border: selectedItems.has(item.id) ? 2 : 0,
                  borderColor: 'primary.main',
                }}
              >
                {/* Selection Checkbox */}
                <Box position="absolute" top={8} left={8} zIndex={1}>
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                  />
                </Box>

                <CardContent sx={{ pt: 6 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" gutterBottom sx={{ flex: 1, pr: 2 }}>
                      {item.paper.title}
                    </Typography>
                    <Chip
                      label={statusLabels[item.status]}
                      color={statusColors[item.status] as any}
                      size="small"
                    />
                  </Box>

                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    {item.paper.authors}
                  </Typography>

                  <Typography variant="body2" gutterBottom>
                    {item.paper.publicationYear}
                    {item.paper.journal && ` • ${item.paper.journal}`}
                  </Typography>

                  {/* Reading Progress */}
                  <Box mt={2} mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        Reading Progress
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {calculateProgress(item)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={calculateProgress(item)}
                      sx={{ height: 6, borderRadius: 1 }}
                    />
                  </Box>

                  {/* Rating */}
                  <Box mt={2} display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="textSecondary">
                      Rating:
                    </Typography>
                    <Rating
                      value={item.rating || 0}
                      onChange={(_, newValue) => handleRatePaper(item.id, newValue)}
                      size="small"
                    />
                  </Box>

                  {/* Tags */}
                  {item.paper.tags && item.paper.tags.length > 0 && (
                    <Box mt={2} display="flex" flexWrap="wrap" gap={0.5}>
                      {item.paper.tags.map((tag) => (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          size="small"
                          sx={{
                            bgcolor: tag.color || 'grey.300',
                            color: 'white',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => navigate(`/papers/${item.paper.id}`)}
                  >
                    View Paper
                  </Button>

                  <Box>
                    <Tooltip title="Change Status">
                      <IconButton
                        size="small"
                        onClick={(e) => setStatusMenuAnchor({ anchor: e.currentTarget, itemId: item.id })}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove from Library">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveFromLibrary(item.id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty State */}
        {filteredLibrary.length === 0 && library && library.length > 0 && (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No papers found with current filters
            </Typography>
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => {
                setCurrentTab('all');
                setRatingFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Box>
        )}

        {library?.length === 0 && (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Your library is empty
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Start building your research library by adding papers
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/papers')}
            >
              Browse Papers
            </Button>
          </Box>
        )}

        {/* Individual Status Change Menu */}
        <Menu
          anchorEl={statusMenuAnchor?.anchor}
          open={Boolean(statusMenuAnchor)}
          onClose={() => setStatusMenuAnchor(null)}
        >
          {Object.values(ReadingStatus).map((status) => (
            <MenuItem
              key={status}
              onClick={() => {
                if (statusMenuAnchor) {
                  updateStatusMutation.mutate({ id: statusMenuAnchor.itemId, status });
                  setStatusMenuAnchor(null);
                }
              }}
            >
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              <ListItemText>{statusLabels[status]}</ListItemText>
            </MenuItem>
          ))}
        </Menu>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
  );
};

export default LibraryPage;
