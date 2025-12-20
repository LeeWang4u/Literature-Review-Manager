
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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Visibility,
  Edit,
  ArrowBack,
  Star,
  StarBorder,
  Search as SearchIcon,
  Clear as ClearIcon,
  Folder,
  FolderOpen,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { libraryService } from '@/services/library.service';
import { Library, LibraryItem } from '@/types';
import toast from 'react-hot-toast';

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

const libraryDrawerWidth = 280;

// Special "All Papers" library type
const ALL_PAPERS_LIBRARY = {
  id: -1,
  userId: 0,
  name: 'My Library',
  description: 'All papers in your collection',
  isDefault: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [selectedLibrary, setSelectedLibrary] = useState<Library | typeof ALL_PAPERS_LIBRARY | null>(null);
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
  const pageSize = 8;

  // Library management state
  const [isLibraryFormOpen, setIsLibraryFormOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [libraryFormData, setLibraryFormData] = useState({ name: '', description: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [libraryToDelete, setLibraryToDelete] = useState<Library | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all libraries
  const { data: librariesData = [], isLoading: librariesLoading, error: librariesError, refetch: refetchLibraries } = useQuery({
    queryKey: ['libraries'],
    queryFn: libraryService.getAllLibraries,
  });

  // Auto-create default library if none exists
  useEffect(() => {
    if (!librariesLoading && librariesData.length === 0 && !librariesError) {
      console.log('No libraries found, creating default library...');
      libraryService.ensureDefaultLibrary()
        .then(() => {
          console.log('Default library created, refetching...');
          refetchLibraries();
        })
        .catch((err) => {
          console.error('Failed to create default library:', err);
          toast.error('Failed to create default library');
        });
    }
  }, [librariesData, librariesLoading, librariesError, refetchLibraries]);

  // Debug logging
  useEffect(() => {
    if (librariesData) {
      console.log('Libraries loaded:', librariesData);
    }
    if (librariesError) {
      console.error('Error loading libraries:', librariesError);
    }
  }, [librariesData, librariesError]);

  // Filter out default library and sort remaining libraries by creation date
  const libraries = useMemo(() => {
    return [...librariesData]
      .filter(lib => !lib.isDefault) // Remove default library
      .sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [librariesData]);

  // Auto-select "All Papers" on first load
  useEffect(() => {
    if (!selectedLibrary) {
      setSelectedLibrary(ALL_PAPERS_LIBRARY);
    }
  }, [selectedLibrary]);

  // Fetch statistics based on selected library
  const { data: stats } = useQuery({
    queryKey: ['library-statistics', selectedLibrary?.id],
    queryFn: () => {
      if (!selectedLibrary) return Promise.resolve({ total: 0, favorites: 0, byStatus: { to_read: 0, reading: 0, completed: 0 } });
      if (selectedLibrary.id === -1) {
        // For "All Papers", use global statistics
        return libraryService.getStatistics();
      }
      // For specific library, use library statistics
      return libraryService.getLibraryStatistics(selectedLibrary.id);
    },
    enabled: !!selectedLibrary,
  });

  // Fetch papers for the selected library
  const { data: paperIds = [], isLoading: paperIdsLoading, error: paperIdsError } = useQuery({
    queryKey: ['library-papers', selectedLibrary?.id],
    queryFn: () => {
      if (!selectedLibrary) return Promise.resolve([]);
      if (selectedLibrary.id === -1) return Promise.resolve([]); // All papers - no filtering
      return libraryService.getPapersInLibrary(selectedLibrary.id);
    },
    enabled: !!selectedLibrary,
  });

  // Debug logging
  useEffect(() => {
    if (selectedLibrary) {
      console.log('Selected library:', selectedLibrary);
      console.log('Paper IDs:', paperIds);
    }
    if (paperIdsError) {
      console.error('Error loading paper IDs:', paperIdsError);
    }
  }, [selectedLibrary, paperIds, paperIdsError]);

  const { data: libraryData, isLoading: libraryDataLoading } = useQuery<LibraryResponse>({
    queryKey: ['library', currentTab, page, debouncedSearchQuery, selectedLibrary?.id, paperIds],
    queryFn: async () => {
      if (!selectedLibrary) {
        return { items: [], total: 0 };
      }

      const statusToFetch = currentTab === 'favorites' ? undefined : currentTab;
      const favoriteToFetch = currentTab === 'favorites' ? true : undefined;

      // For "All Papers", use normal pagination
      if (selectedLibrary.id === -1) {
        const result = await libraryService.getLibrary({
          status: statusToFetch,
          favorite: favoriteToFetch,
          page,
          pageSize,
          search: debouncedSearchQuery || undefined,
        });
        return result as unknown as LibraryResponse;
      }

      // For specific library, fetch ALL papers then filter and paginate client-side
      if (paperIds.length === 0) {
        return { items: [], total: 0 };
      }

      // Fetch more papers to ensure we get enough after filtering
      const result = await libraryService.getLibrary({
        status: statusToFetch,
        favorite: favoriteToFetch,
        page: 1,
        pageSize: 1000, // Fetch all papers
        search: debouncedSearchQuery || undefined,
      });

      // Filter papers to only show those in the selected library
      const filteredItems = result.items.filter(item => paperIds.includes(item.id));
      
      // Client-side pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = filteredItems.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        total: filteredItems.length,
      };
    },
    enabled: !!selectedLibrary && !paperIdsLoading,
    placeholderData: (previousData) => previousData,
  });

  const isLoading = paperIdsLoading || libraryDataLoading;

  const library = libraryData?.items || [];
  const count = libraryData?.total || 0;
  const totalPages = Math.ceil(count / pageSize);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  useEffect(() => {
    setPage(1);
  }, [currentTab, debouncedSearchQuery, selectedLibrary]);

 
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

  const createLibraryMutation = useMutation({
    mutationFn: libraryService.createLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      setIsLibraryFormOpen(false);
      setLibraryFormData({ name: '', description: '' });
      toast.success('Library created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create library');
    },
  });

  const updateLibraryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      libraryService.updateLibrary(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      setIsLibraryFormOpen(false);
      setEditingLibrary(null);
      setLibraryFormData({ name: '', description: '' });
      toast.success('Library updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update library');
    },
  });

  const deleteLibraryMutation = useMutation({
    mutationFn: libraryService.deleteLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      setDeleteConfirmOpen(false);
      setLibraryToDelete(null);
      if (selectedLibrary?.id === libraryToDelete?.id) {
        setSelectedLibrary(libraries[0] || null);
      }
      toast.success('Library deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete library');
    },
  });

  const removePaperFromLibraryMutation = useMutation({
    mutationFn: ({ libraryId, paperId }: { libraryId: number; paperId: number }) =>
      libraryService.removePaperFromLibrary(libraryId, paperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-papers'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['library-statistics'] });
      toast.success('Paper removed from library');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove paper from library');
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

  const handleCreateLibrary = () => {
    setEditingLibrary(null);
    setLibraryFormData({ name: '', description: '' });
    setIsLibraryFormOpen(true);
  };

  const handleEditLibrary = (lib: Library) => {
    setEditingLibrary(lib);
    setLibraryFormData({ name: lib.name, description: lib.description || '' });
    setIsLibraryFormOpen(true);
  };

  const handleDeleteLibrary = (lib: Library) => {
    setLibraryToDelete(lib);
    setDeleteConfirmOpen(true);
  };

  const handleRemovePaperFromLibrary = (paperId: number) => {
    if (selectedLibrary && selectedLibrary.id !== -1) {
      removePaperFromLibraryMutation.mutate({
        libraryId: selectedLibrary.id,
        paperId: paperId,
      });
    }
  };

  const handleLibraryFormSubmit = async () => {
    // Validate library name for non-default libraries
    if (!editingLibrary && !libraryFormData.name.trim()) {
      toast.error('Library name is required');
      return;
    }

    if (editingLibrary) {
      const data = editingLibrary.isDefault
        ? { description: libraryFormData.description }
        : libraryFormData;
      await updateLibraryMutation.mutateAsync({ id: editingLibrary.id, data });
    } else {
      await createLibraryMutation.mutateAsync(libraryFormData);
    }
  };

  // Library sidebar drawer
  const libraryDrawer = (
    <Box sx={{ width: libraryDrawerWidth, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Libraries
        </Typography>
        {/* {librariesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : libraries.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No libraries found. Try creating a new one or check if you're logged in.
          </Alert>
        ) : null} */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          fullWidth
          onClick={handleCreateLibrary}
          size="small"
        >
          New Library
        </Button>
      </Box>
      <List sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', py: 0 }}>
        {/* All Papers - Special Item */}
        <React.Fragment key="all-papers">
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedLibrary?.id === -1}
              onClick={() => setSelectedLibrary(ALL_PAPERS_LIBRARY)}
              sx={{
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {selectedLibrary?.id === -1 ? (
                  <FolderOpen color="primary" />
                ) : (
                  <Folder color="action" />
                )}
              </ListItemIcon>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: selectedLibrary?.id === -1 ? 600 : 400,
                      color: selectedLibrary?.id === -1 ? 'primary.main' : 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    My Library
                  </Typography>
                  <Chip label="All" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  All papers in your collection
                </Typography>
              </Box>
            </ListItemButton>
          </ListItem>
          <Divider />
        </React.Fragment>

        {/* User Libraries */}
        {libraries.map((lib) => {
          const isSelected = lib.id === selectedLibrary?.id;
          return (
            <React.Fragment key={lib.id}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => setSelectedLibrary(lib)}
                  sx={{
                    py: 1.5,
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {isSelected ? (
                      <FolderOpen color="primary" />
                    ) : (
                      <Folder color="action" />
                    )}
                  </ListItemIcon>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? 'primary.main' : 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lib.name}
                      </Typography>
                      {lib.isDefault && (
                        <Chip label="Default" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                    </Box>
                    {lib.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lib.description}
                      </Typography>
                    )}
                  </Box>
                  {!lib.isDefault && isSelected && (
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLibrary(lib);
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLibrary(lib);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  {lib.isDefault && isSelected && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditLibrary(lib);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  )}
                </ListItemButton>
              </ListItem>
              <Divider />
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Library Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: libraryDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: libraryDrawerWidth,
            boxSizing: 'border-box',
            position: 'relative',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {libraryDrawer}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Show error messages */}
        {librariesError && (
          <Alert severity="error" sx={{ m: 2 }}>
            Error loading libraries: {(librariesError as any)?.message || 'Unknown error'}
          </Alert>
        )}
        {paperIdsError && (
          <Alert severity="error" sx={{ m: 2 }}>
            Error loading papers: {(paperIdsError as any)?.message || 'Unknown error'}
          </Alert>
        )}
        
        <Container 
          maxWidth="lg" 
          sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            py: 3,
            height: '100%',
            overflow: 'hidden'
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => navigate('/papers')} color="primary" size="small">
                <ArrowBack />
              </IconButton>
              <Box>
                <Typography variant="h5">{selectedLibrary?.name || 'Select a Library'}</Typography>
                {selectedLibrary?.description && (
                  <Typography variant="caption" color="text.secondary">
                    {selectedLibrary.description}
                  </Typography>
                )}
              </Box>
            </Box>
            {stats && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Total: {stats.total} papers
                </Typography>
              </Box>
            )}
          </Box>

      <MuiPaper sx={{ mb: 2 }}>
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

      <Box mb={2}>
        <TextField
          fullWidth          size="small"          label="Search in this library"
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

      {isLoading || librariesLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflow: 'auto', pb: 2 }}>
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
                      {/* Show remove button only for specific libraries (not "All Papers") */}
                      {selectedLibrary && selectedLibrary.id !== -1 && (
                        <Tooltip title="Remove from this library">
                          <IconButton
                            size="small"
                            onClick={() => handleRemovePaperFromLibrary(item.paper.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={item.paper.favorite ? 'Remove from Favorites' : 'Add to Favorites'}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            toggleFavoriteMutation.mutate({ id: item.paper.id, favorite: !item.paper.favorite })
                          }
                        >
                          {item.paper.favorite ? <Star color="warning" fontSize="small" /> : <StarBorder fontSize="small" />}
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
                {searchQuery ? 'No papers match your search in this library' : 'No papers in this library'}
              </Typography>
              {!searchQuery && (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Start adding papers to this library
                  </Typography>
                  <Button variant="contained" onClick={() => navigate('/papers')}>
                    Browse Papers
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>
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
  </Box>

  {/* Library Form Dialog */}
  <Dialog open={isLibraryFormOpen} onClose={() => setIsLibraryFormOpen(false)} maxWidth="sm" fullWidth>
    <DialogTitle>{editingLibrary ? 'Edit Library' : 'Create New Library'}</DialogTitle>
    <DialogContent>
      {editingLibrary?.isDefault && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You cannot rename the default library, but you can edit its description.
        </Alert>
      )}
      {!editingLibrary?.isDefault && (
        <TextField
          autoFocus
          margin="dense"
          label="Library Name"
          type="text"
          fullWidth
          variant="outlined"
          value={libraryFormData.name}
          onChange={(e) => setLibraryFormData({ ...libraryFormData, name: e.target.value })}
          required
          sx={{ mb: 2 }}
        />
      )}
      <TextField
        margin="dense"
        label="Description"
        type="text"
        fullWidth
        variant="outlined"
        multiline
        rows={3}
        value={libraryFormData.description}
        onChange={(e) => setLibraryFormData({ ...libraryFormData, description: e.target.value })}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setIsLibraryFormOpen(false)}>Cancel</Button>
      <Button 
        onClick={handleLibraryFormSubmit} 
        variant="contained"
        disabled={!editingLibrary && !libraryFormData.name.trim()}
      >
        {editingLibrary ? 'Update' : 'Create'}
      </Button>
    </DialogActions>
  </Dialog>

  {/* Delete Confirmation Dialog */}
  <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
    <DialogTitle>Delete Library</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Are you sure you want to delete "{libraryToDelete?.name}"? This action cannot be undone.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
      <Button
        onClick={() => libraryToDelete && deleteLibraryMutation.mutate(libraryToDelete.id)}
        color="error"
        variant="contained"
      >
        Delete
      </Button>
    </DialogActions>
  </Dialog>
</Box>
  );
};

export default LibraryPage;