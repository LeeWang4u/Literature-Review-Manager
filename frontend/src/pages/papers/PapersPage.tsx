import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { QuickAddDialog } from '@/components/papers/QuickAddDialog';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Pagination,
  Paper as MuiPaper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  IconButton,
  Collapse,
  Divider,
  InputAdornment,
} from '@mui/material';
import { 
  Search, 
  Add, 
  FilterList, 
  Clear,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { paperService } from '@/services/paper.service';
import { tagService } from '@/services/tag.service';
import type { SearchPaperParams, Tag } from '@/types';

const PapersPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [journalFilter, setJournalFilter] = useState('');
  const [yearFrom, setYearFrom] = useState<number | ''>('');
  const [yearTo, setYearTo] = useState<number | ''>('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'authors' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  const [searchParams, setSearchParams] = useState<SearchPaperParams>({
    page: 1,
    pageSize: 12,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });

  // Fetch papers
  const { data, isLoading } = useQuery({
    queryKey: ['papers', searchParams],
    queryFn: () => paperService.search(searchParams),
  });

  // Fetch tags for filter
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagService.getAll(),
  });

  // Get unique journals for autocomplete
  const uniqueJournals = React.useMemo(() => {
    if (!data?.data) return [];
    const journals = data.data
      .map(paper => paper.journal)
      .filter((journal): journal is string => !!journal);
    return Array.from(new Set(journals));
  }, [data]);

  const handleSearch = () => {
    const params: SearchPaperParams = {
      page: 1,
      pageSize: 12,
      sortBy,
      sortOrder,
    };

    if (searchQuery.trim()) params.query = searchQuery.trim();
    if (authorFilter.trim()) params.author = authorFilter.trim();
    if (journalFilter.trim()) params.journal = journalFilter.trim();
    
    // Handle year range
    if (yearFrom && yearTo) {
      // Backend expects single year, so we'll use query for range
      // This is a limitation - ideally backend should support year range
      params.year = yearFrom;
    } else if (yearFrom) {
      params.year = yearFrom;
    } else if (yearTo) {
      params.year = yearTo;
    }

    if (selectedTags.length > 0) {
      params.tags = selectedTags.map(tag => tag.id).join(',');
    }

    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setAuthorFilter('');
    setJournalFilter('');
    setYearFrom('');
    setYearTo('');
    setSelectedTags([]);
    setSortBy('createdAt');
    setSortOrder('DESC');
    setSearchParams({
      page: 1,
      pageSize: 12,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setSearchParams({ ...searchParams, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = searchQuery || authorFilter || journalFilter || yearFrom || yearTo || selectedTags.length > 0;

  return (
    <MainLayout>
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Papers</Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setQuickAddOpen(true)}
            >
              Quick Add
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/papers/new')}
            >
              Add Paper
            </Button>
          </Box>
        </Box>

        {/* Search and Filters */}
        <MuiPaper elevation={2} sx={{ p: 3, mb: 4 }}>
          {/* Main Search Bar */}
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={9}>
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                label="Search papers by title, authors, or keywords"
                variant="outlined"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                InputProps={{
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Search />}
                onClick={handleSearch}
                sx={{ height: '56px' }}
              >
                Search
              </Button>
            </Grid>
          </Grid>

          {/* Advanced Filters Toggle */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button
              startIcon={<FilterList />}
              endIcon={showAdvancedFilters ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              size="small"
            >
              Advanced Filters
            </Button>
            {hasActiveFilters && (
              <Button
                startIcon={<Clear />}
                onClick={handleClearFilters}
                size="small"
                color="secondary"
              >
                Clear All Filters
              </Button>
            )}
          </Box>

          {/* Advanced Filters Panel */}
          <Collapse in={showAdvancedFilters}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              {/* Author Filter */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  label="Filter by Author"
                  placeholder="e.g., John Smith"
                  variant="outlined"
                  size="small"
                />
              </Grid>

              {/* Journal Filter */}
              <Grid item xs={12} md={4}>
                <Autocomplete
                  freeSolo
                  options={uniqueJournals}
                  value={journalFilter}
                  onInputChange={(_, newValue) => setJournalFilter(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Journal"
                      placeholder="e.g., Nature"
                      variant="outlined"
                      size="small"
                    />
                  )}
                />
              </Grid>

              {/* Tag Filter */}
              <Grid item xs={12} md={4}>
                <Autocomplete
                  multiple
                  options={allTags}
                  getOptionLabel={(option) => option.name}
                  value={selectedTags}
                  onChange={(_, newValue) => setSelectedTags(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Tags"
                      placeholder="Select tags"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.name}
                        size="small"
                        sx={{
                          bgcolor: option.color || 'primary.main',
                          color: 'white',
                        }}
                      />
                    ))
                  }
                />
              </Grid>

              {/* Year Range */}
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value ? Number(e.target.value) : '')}
                  label="Year From"
                  placeholder="e.g., 2020"
                  variant="outlined"
                  size="small"
                  inputProps={{ min: 1900, max: new Date().getFullYear() }}
                />
              </Grid>

              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value ? Number(e.target.value) : '')}
                  label="Year To"
                  placeholder="e.g., 2024"
                  variant="outlined"
                  size="small"
                  inputProps={{ min: 1900, max: new Date().getFullYear() }}
                />
              </Grid>

              {/* Sort By */}
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  >
                    <MenuItem value="createdAt">Date Added</MenuItem>
                    <MenuItem value="year">Publication Year</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                    <MenuItem value="authors">Authors</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Sort Order */}
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort Order</InputLabel>
                  <Select
                    value={sortOrder}
                    label="Sort Order"
                    onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  >
                    <MenuItem value="DESC">Descending</MenuItem>
                    <MenuItem value="ASC">Ascending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Apply Filters Button */}
            <Box mt={2} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={handleSearch}
              >
                Apply Filters
              </Button>
            </Box>
          </Collapse>
        </MuiPaper>

        {/* Results Summary */}
        {data && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              Showing {data.data.length} of {data.total} papers
              {hasActiveFilters && ' (filtered)'}
            </Typography>
          </Box>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {data?.data.map((paper) => (
                <Grid item xs={12} md={6} key={paper.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {paper.title}
                      </Typography>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        {paper.authors}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {paper.publicationYear} • {paper.journal || 'N/A'}
                      </Typography>
                      <Box mt={2}>
                        {paper.tags?.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => navigate(`/papers/${paper.id}`)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {data && data.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                  count={data.totalPages}
                  page={data.page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Container>
      
      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSuccess={(paperId) => {
          // Navigate to paper detail after successful creation
          navigate(`/papers/${paperId}`);
        }}
      />
    </MainLayout>
  );
};

export default PapersPage;
