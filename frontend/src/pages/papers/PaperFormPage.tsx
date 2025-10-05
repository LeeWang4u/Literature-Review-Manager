import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Autocomplete,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import { Save, Cancel, Add, AutoAwesome } from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { paperService } from '@/services/paper.service';
import { tagService } from '@/services/tag.service';
import { paperMetadataService } from '@/services/paper-metadata.service';
import { pdfService } from '@/services/pdf.service';
import { CreatePaperData, Tag } from '@/types';
import toast from 'react-hot-toast';

interface PaperFormData {
  title: string;
  authors: string;
  abstract: string;
  publicationYear: number;
  journal?: string;
  doi?: string;
  url?: string;
  tags: Tag[];
}

const PaperFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [doiInput, setDoiInput] = useState('');
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [metadataExtracted, setMetadataExtracted] = useState(false);
  const [arxivPdfAvailable, setArxivPdfAvailable] = useState(false);
  const [arxivMetadata, setArxivMetadata] = useState<any>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PaperFormData>({
    defaultValues: {
      title: '',
      authors: '',
      abstract: '',
      publicationYear: new Date().getFullYear(),
      journal: '',
      doi: '',
      url: '',
      tags: [],
    },
  });

  // Fetch existing paper data for edit mode
  const { data: existingPaper, isLoading: loadingPaper } = useQuery({
    queryKey: ['paper', id],
    queryFn: () => paperService.getById(Number(id)),
    enabled: isEditMode,
  });

  // Fetch all available tags
  const { data: availableTags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagService.getAll(),
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (existingPaper && isEditMode) {
      reset({
        title: existingPaper.title,
        authors: existingPaper.authors, // Already a string from backend
        abstract: existingPaper.abstract || '',
        publicationYear: existingPaper.publicationYear,
        journal: existingPaper.journal || '',
        doi: existingPaper.doi || '',
        url: existingPaper.url || '',
        tags: existingPaper.tags || [],
      });
    }
  }, [existingPaper, isEditMode, reset]);

  // Create paper mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePaperData) => paperService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paperStatistics'] });
      toast.success('Paper created successfully!');
      navigate('/papers');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create paper');
    },
  });

  // Update paper mutation
  const updateMutation = useMutation({
    mutationFn: (data: CreatePaperData) => paperService.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paper', id] });
      toast.success('Paper updated successfully!');
      navigate(`/papers/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update paper');
    },
  });

  // Create new tag mutation
  const createTagMutation = useMutation({
    mutationFn: (name: string) => tagService.create({ name }),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success(`Tag "${newTag.name}" created!`);
      setNewTagName('');
      setIsCreatingTag(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create tag');
    },
  });

  const onSubmit = (data: PaperFormData) => {
    const paperData: CreatePaperData = {
      title: data.title,
      authors: data.authors, // Keep as string - backend expects string
      abstract: data.abstract,
      publicationYear: data.publicationYear,
      journal: data.journal || undefined,
      doi: data.doi || undefined,
      url: data.url || undefined,
      tagIds: data.tags.map((tag) => tag.id),
    };

    if (isEditMode) {
      updateMutation.mutate(paperData);
    } else {
      createMutation.mutate(paperData);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }
    createTagMutation.mutate(newTagName.trim());
  };

  const handleExtractMetadata = async () => {
    if (!doiInput.trim()) {
      toast.error('Please enter a DOI or URL');
      return;
    }

    setIsExtractingMetadata(true);
    try {
      const metadata: any = await paperMetadataService.extractMetadata(doiInput.trim());
      
      // Populate form with extracted metadata
      reset({
        title: metadata.title || '',
        authors: metadata.authors || '',
        abstract: metadata.abstract || '',
        publicationYear: metadata.publicationYear || new Date().getFullYear(),
        journal: metadata.journal || '',
        doi: metadata.doi || '',
        url: metadata.url || '',
        tags: [], // Keep existing selected tags
      });

      // Mark metadata as extracted
      setMetadataExtracted(true);

      // Check if ArXiv PDF is available
      if (metadata.pdfAvailable && metadata.arxivId) {
        setArxivPdfAvailable(true);
        setArxivMetadata(metadata);
        toast.success(
          'Metadata extracted successfully! ArXiv PDF is available for download.',
          { duration: 5000 }
        );
      } else {
        setArxivPdfAvailable(false);
        setArxivMetadata(null);
        toast.success('Metadata extracted successfully! Click "Save Paper" to add it to your library.');
      }
      
      setDoiInput(''); // Clear input after successful extraction
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to extract metadata. Please enter details manually.';
      toast.error(errorMessage);
      setMetadataExtracted(false);
      setArxivPdfAvailable(false);
      setArxivMetadata(null);
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  const handleDownloadArxivPdf = async () => {
    if (!arxivMetadata || !arxivMetadata.arxivId) {
      toast.error('No ArXiv PDF available');
      return;
    }

    try {
      toast.loading('Downloading PDF from ArXiv...', { duration: 2000 });
      
      const result = await paperService.downloadArxivPdf(arxivMetadata.url || arxivMetadata.arxivId);
      
      // Convert base64 to blob
      const binaryString = atob(result.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', result.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`PDF downloaded: ${result.filename}`);
    } catch (error: any) {
      console.error('Error downloading ArXiv PDF:', error);
      toast.error('Failed to download PDF from ArXiv');
    }
  };

  const handleQuickSave = async () => {
    // Get current form values
    const formValues = control._formValues;
    
    if (!formValues.title || !formValues.authors) {
      toast.error('Please extract metadata first (title and authors are required)');
      return;
    }

    const paperData: CreatePaperData = {
      title: formValues.title,
      authors: formValues.authors,
      abstract: formValues.abstract || '',
      publicationYear: formValues.publicationYear || new Date().getFullYear(),
      journal: formValues.journal || '',
      doi: formValues.doi || '',
      url: formValues.url || '',
      tagIds: formValues.tags?.map((tag: Tag) => tag.id) || [],
    };

    try {
      // Step 1: Create paper
      const createdPaper = await paperService.create(paperData);
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paperStatistics'] });
      
      toast.success('Paper saved successfully!');

      // Step 2: Auto-upload ArXiv PDF if available
      if (arxivPdfAvailable && arxivMetadata && arxivMetadata.arxivId) {
        try {
          toast.loading('Uploading PDF from ArXiv...', { id: 'arxiv-upload' });
          
          // Download PDF from ArXiv
          const result = await paperService.downloadArxivPdf(arxivMetadata.url || arxivMetadata.arxivId);
          
          // Convert base64 to blob
          const binaryString = atob(result.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          
          // Upload to server
          await pdfService.uploadBlob(createdPaper.id, blob, result.filename);
          queryClient.invalidateQueries({ queryKey: ['pdfs', createdPaper.id] });
          
          toast.success('PDF uploaded successfully!', { id: 'arxiv-upload' });
        } catch (pdfError: any) {
          console.error('Error auto-uploading PDF:', pdfError);
          toast.error('Paper saved but PDF upload failed', { id: 'arxiv-upload' });
        }
      }
      
      // Navigate to paper detail page
      navigate(`/papers/${createdPaper.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save paper');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoading = loadingPaper || loadingTags;

  if (isLoading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
          <Typography variant="h4" gutterBottom>
            {isEditMode ? 'Edit Paper' : 'Add New Paper'}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 3 }}>
            {/* Auto-fill Section - Only show in create mode */}
            {!isEditMode && (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Quick Start:</strong> Enter a DOI or URL below to automatically populate paper details!
                  </Typography>
                </Alert>
                
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        label="DOI or URL"
                        placeholder="e.g., 10.1038/nature12373 or https://arxiv.org/abs/2103.15348"
                        value={doiInput}
                        onChange={(e) => {
                          setDoiInput(e.target.value);
                          // Reset all extraction states when input changes
                          setMetadataExtracted(false);
                          setArxivPdfAvailable(false);
                          setArxivMetadata(null);
                        }}
                        disabled={isExtractingMetadata}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleExtractMetadata();
                          }
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AutoAwesome color="primary" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={handleExtractMetadata}
                        disabled={isExtractingMetadata || !doiInput.trim()}
                        startIcon={isExtractingMetadata ? <CircularProgress size={20} /> : <AutoAwesome />}
                      >
                        {isExtractingMetadata ? 'Extracting...' : 'Auto-fill'}
                      </Button>
                    </Grid>
                  </Grid>
                  
                  {/* ArXiv PDF Download & Quick Save */}
                  {arxivPdfAvailable && arxivMetadata && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="success">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2">
                              <strong>PDF Available!</strong> This is an ArXiv paper with free PDF access.
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            onClick={handleDownloadArxivPdf}
                          >
                            Download PDF
                          </Button>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={handleQuickSave}
                            startIcon={<Save />}
                          >
                            Save Paper
                          </Button>
                        </Box>
                      </Alert>
                    </Box>
                  )}
                  
                  {/* Quick Save for non-ArXiv papers */}
                  {metadataExtracted && !arxivPdfAvailable && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="info">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2">
                            Metadata extracted successfully! Click "Save Paper" to add it, or continue editing below.
                          </Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={handleQuickSave}
                            startIcon={<Save />}
                            sx={{ ml: 2 }}
                          >
                            Save Paper
                          </Button>
                        </Box>
                      </Alert>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Or enter manually
                  </Typography>
                </Divider>
              </>
            )}

            <Grid container spacing={3}>
              {/* Title */}
              <Grid item xs={12}>
                <Controller
                  name="title"
                  control={control}
                  rules={{ required: 'Title is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Title"
                      fullWidth
                      required
                      error={!!errors.title}
                      helperText={errors.title?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>

              {/* Authors */}
              <Grid item xs={12}>
                <Controller
                  name="authors"
                  control={control}
                  rules={{ required: 'Authors are required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Authors"
                      fullWidth
                      required
                      placeholder="e.g., Smith, J., Doe, A."
                      error={!!errors.authors}
                      helperText={errors.authors?.message || 'Separate multiple authors with commas'}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>

              {/* Abstract */}
              <Grid item xs={12}>
                <Controller
                  name="abstract"
                  control={control}
                  rules={{ required: 'Abstract is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Abstract"
                      fullWidth
                      required
                      multiline
                      rows={6}
                      error={!!errors.abstract}
                      helperText={errors.abstract?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>

              {/* Publication Year */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="publicationYear"
                  control={control}
                  rules={{
                    required: 'Publication year is required',
                    min: { value: 1900, message: 'Year must be after 1900' },
                    max: { value: new Date().getFullYear() + 1, message: 'Year cannot be in the future' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Publication Year"
                      type="number"
                      fullWidth
                      required
                      error={!!errors.publicationYear}
                      helperText={errors.publicationYear?.message}
                      disabled={isSubmitting}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  )}
                />
              </Grid>

              {/* Journal */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="journal"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Journal"
                      fullWidth
                      placeholder="e.g., Nature, Science"
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>

              {/* DOI */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="doi"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="DOI"
                      fullWidth
                      placeholder="e.g., 10.1000/xyz123"
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>

              {/* URL */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="url"
                  control={control}
                  rules={{
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: 'Please enter a valid URL (http:// or https://)',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="URL"
                      fullWidth
                      placeholder="https://example.com/paper"
                      error={!!errors.url}
                      helperText={errors.url?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>

              {/* Tags */}
              <Grid item xs={12}>
                <Controller
                  name="tags"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      multiple
                      options={availableTags}
                      getOptionLabel={(option) => option.name}
                      value={field.value}
                      onChange={(_, newValue) => field.onChange(newValue)}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tags"
                          placeholder="Select or create tags"
                          helperText="Select existing tags or create new ones below"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option.name}
                            {...getTagProps({ index })}
                            key={option.id}
                          />
                        ))
                      }
                      disabled={isSubmitting}
                    />
                  )}
                />

                {/* Create New Tag */}
                {isCreatingTag ? (
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      label="New Tag Name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                      disabled={createTagMutation.isPending}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleCreateTag}
                      disabled={createTagMutation.isPending || !newTagName.trim()}
                    >
                      {createTagMutation.isPending ? <CircularProgress size={20} /> : 'Create'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setIsCreatingTag(false);
                        setNewTagName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Button
                    startIcon={<Add />}
                    onClick={() => setIsCreatingTag(true)}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    Create New Tag
                  </Button>
                )}
              </Grid>

              {/* Error Display */}
              {(createMutation.isError || updateMutation.isError) && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    {(createMutation.error as any)?.response?.data?.message ||
                      (updateMutation.error as any)?.response?.data?.message ||
                      'An error occurred while saving the paper'}
                  </Alert>
                </Grid>
              )}

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => navigate(isEditMode ? `/papers/${id}` : '/papers')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : isEditMode ? 'Update Paper' : 'Create Paper'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default PaperFormPage;
