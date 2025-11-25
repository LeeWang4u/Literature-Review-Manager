


import React, { useState, useMemo, useEffect } from 'react';
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
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Tooltip,
  Alert,
  Snackbar,
  Paper as MuiPaper,
  Pagination,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  Delete,
  Edit,
  ArrowBack,
  Star,
  StarBorder,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { libraryService } from '@/services/library.service';
import { LibraryItem } from '@/types';

interface LibraryResponse {
  items: LibraryItem[];
  total: number;
}

const getStatusLabel = (status: string): string => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' => {
  switch (status) {
    case 'to_read':
      return 'default';
    case 'reading':
      return 'primary';
    case 'completed':
      return 'success';
    case 'favorites':
      return 'warning';
    default:
      return 'default';
  }
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
  const [currentTab, setCurrentTab] = useState<string>('to_read');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ anchor: HTMLElement; itemId: number } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const pageSize = 8; // Number of papers per page

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['library-statistics'],
    queryFn: () => libraryService.getStatistics(),
  });

  const { data: libraryData, isLoading } = useQuery<LibraryResponse>({
    queryKey: ['library', currentTab, page, debouncedSearchQuery],
    queryFn: async () => {
      console.log(`📚 Fetching library data for tab: ${currentTab}...`);
      const statusToFetch = currentTab === 'favorites' ? undefined : currentTab;
      const favoriteToFetch = currentTab === 'favorites' ? true : undefined;

      const result = await libraryService.getLibrary({
        status: statusToFetch,
        favorite: favoriteToFetch,
        page,
        pageSize,
        search: debouncedSearchQuery || undefined,
      });
      console.log(`✅ Library data received for ${currentTab}:`, result);
      return result as unknown as LibraryResponse;
    },
    placeholderData: (previousData) => previousData,
  });

  const library = libraryData?.items || [];
  const count = libraryData?.total || 0;
  const totalPages = Math.ceil(count / pageSize);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  useEffect(() => {
    setPage(1);
  }, [currentTab, debouncedSearchQuery]);

  console.log('📊 Library Page State:', { library, isLoading, currentTab });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
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

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: number; favorite: boolean }) =>
      libraryService.toggleFavorite(id, favorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['library-statistics'] });
      showSnackbar('Favorite updated successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to update favorite', 'error');
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

  const tabs: TabValue[] = useMemo(() => {
    const statusTabs = Object.entries(stats?.byStatus || {}).map(([value, count]) => ({
      value,
      label: getStatusLabel(value),
      count,
    }));
    const favoriteTab = {
      value: 'favorites',
      label: 'Favorites',
      count: stats?.favorites || 0,
    };
    return [...statusTabs, favoriteTab];
  }, [stats]);

  // Handlers
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  };

  const handleRemoveFromLibrary = (id: number) => {
    if (window.confirm('Are you sure you want to remove this paper from your library?')) {
      removeFromLibraryMutation.mutate(id);
    }
  };

  const calculateProgress = (item: LibraryItem): number => {
    // Đọc trạng thái từ paper
    const status = item.paper?.status;
    switch (status) {
      case 'to_read':
        return 0;
      case 'reading':
        return 50;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/papers')} color="primary">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">My Library</Typography>
        </Box>
        {stats && (
          <Box>
            <Typography variant="body2" color="textSecondary">
              Total: {stats.total} papers
            </Typography>
          </Box>
        )}
      </Box>

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

      <Box mb={3}>
        <TextField
          fullWidth
          label="Search in this category"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setSearchQuery('')}
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {library.map((item) => (
              <Grid item xs={12} md={6} key={item.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Typography variant="h6" gutterBottom sx={{ flex: 1, pr: 2 }}>
                        {item.paper.title}
                      </Typography>
                      <Chip
                        label={getStatusLabel(item.paper.status)}
                        color={getStatusColor(item.paper.status)}
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

                    <Box mt={2} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="caption" color="textSecondary">Reading Progress</Typography>
                        <Typography variant="caption" color="textSecondary">{calculateProgress(item)}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={calculateProgress(item)}
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                    </Box>

                    {item.paper.tags && item.paper.tags.length > 0 && (
                      <Box mt={2} display="flex" flexWrap="wrap" gap={0.5}>
                        {item.paper.tags.map((tag) => (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            sx={{ bgcolor: tag.color || 'grey.300', color: 'white' }}
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
                      {/* <Tooltip title="Change Status">
                        <IconButton
                          size="small"
                          onClick={(e) => setStatusMenuAnchor({ anchor: e.currentTarget, itemId: item.id })}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip> */}
                      <Tooltip title={item.paper.favorite ? 'Remove from Favorites' : 'Add to Favorites'}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            toggleFavoriteMutation.mutate({ id: item.id, favorite: !item.paper.favorite })
                          }
                        >
                          {item.paper.favorite ? <Star color="warning" fontSize="small" /> : <StarBorder fontSize="small" />}
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

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={totalPages} page={page} onChange={handlePageChange} />
            </Box>
          )}

          {library.length === 0 && (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {searchQuery ? 'No papers match your search in this category' : 'No papers in this category'}
              </Typography>
              {!searchQuery && (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Start building your research library by adding papers
                  </Typography>
                  <Button variant="contained" onClick={() => navigate('/papers')}>
                    Browse Papers
                  </Button>
                </>
              )}
            </Box>
          )}
        </>
      )}

      <Menu
        anchorEl={statusMenuAnchor?.anchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => setStatusMenuAnchor(null)}
      >
        {['to_read', 'reading', 'completed'].map((status) => (
          <MenuItem
            key={status}
            onClick={() => {
              if (statusMenuAnchor) {
                updateStatusMutation.mutate({ id: statusMenuAnchor.itemId, status });
                setStatusMenuAnchor(null);
              }
            }}
          >
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>{getStatusLabel(status)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

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