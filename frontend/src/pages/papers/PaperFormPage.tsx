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
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
} from '@mui/material';
import { Save, Cancel, AutoAwesome } from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { paperService } from '@/services/paper.service';
import { tagService } from '@/services/tag.service';
import { paperMetadataService } from '@/services/paper-metadata.service';
import { pdfService } from '@/services/pdf.service';
import { summaryService } from '@/services/summary.service';
import { CreatePaperData, Tag } from '@/types';
import toast from 'react-hot-toast';

// Extended tag interface for dropdown with metadata
interface TagOption {
  id: number;
  name: string;
  color: string;
  paperCount?: number;
  createdAt?: string | Date;
  isAiSuggested?: boolean;
  isNew?: boolean;
}

interface PaperFormData {
  title: string;
  authors: string;
  abstract: string;
  publicationYear: number;
  journal?: string;
  doi?: string;
  url?: string;
  tags: Tag[];
  references?: {
    title?: string;
    doi?: string;
  }[];
}

const PaperFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [doiInput, setDoiInput] = useState('');
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [metadataExtracted, setMetadataExtracted] = useState(false);
  const [arxivPdfAvailable, setArxivPdfAvailable] = useState(false);
  const [arxivMetadata, setArxivMetadata] = useState<any>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [tagConfidence, setTagConfidence] = useState<number>(0);
  const [allTagOptions, setAllTagOptions] = useState<TagOption[]>([]);
  const [aiSuggestedTagNames, setAiSuggestedTagNames] = useState<Set<string>>(new Set());

  const [openDialog, setOpenDialog] = useState(false);
  const [existingPaperId, setExistingPaperId] = useState<number | null>(null);

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
      references: [],
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

  // Merge available tags with AI suggestions for dropdown
  useEffect(() => {
    const mergedOptions: TagOption[] = [];
    const seenIds = new Set<number>();
    const seenNames = new Set<string>();

    // Add existing tags first (check if they were AI suggested)
    availableTags.forEach((tag) => {
      const isFromAI = aiSuggestedTagNames.has(tag.name.toLowerCase());
      mergedOptions.push({
        ...tag,
        color: tag.color || '#1976d2',
        isAiSuggested: isFromAI,  // Mark if it was from AI suggestion
        isNew: false
      });
      seenIds.add(tag.id);
      seenNames.add(tag.name.toLowerCase());
    });

    // Add AI suggested tags that don't exist yet as real tags
    suggestedTags.forEach((tagName) => {
      if (!seenNames.has(tagName.toLowerCase())) {
        // Create temporary tag object for AI suggestions that haven't been created
        mergedOptions.push({
          id: -Math.random(), // Temporary negative ID
          name: tagName,
          color: '#9c27b0', // Purple for AI suggestions
          paperCount: 0,
          isAiSuggested: true,
          isNew: true,
        } as TagOption);
        seenNames.add(tagName.toLowerCase());
      }
    });

    setAllTagOptions(mergedOptions);
  }, [availableTags, suggestedTags, aiSuggestedTagNames]);

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



  const createMutation = useMutation({
    mutationFn: (data: CreatePaperData) => paperService.create(data),
    onSuccess: (response) => {
      if (response.success === false) {  

        if (response.data?.id) {
          setExistingPaperId(response.data.id);
          setOpenDialog(true);
        }
        return;
      }
      // Phần success
      toast.success(response.message || 'Paper created successfully!');
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paperStatistics'] });
      navigate('/papers');
    },
    onError: (error: any) => {  // Handle real errors (network, server crash, etc.)
      toast.error(error.message || 'Failed to create paper');
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

  const onSubmit = async (data: PaperFormData) => {
    // First, create any new tags (those with negative IDs)
    const newTags = data.tags.filter((tag) => tag.id < 0);
    const existingTags = data.tags.filter((tag) => tag.id > 0);

    const createdTagIds: number[] = [];

    if (newTags.length > 0) {
      toast.loading(`Creating ${newTags.length} new tag(s)...`, { id: 'create-tags' });

      for (const newTag of newTags) {
        try {
          // Check if tag already exists (in case of race condition)
          const existingTag = availableTags.find(
            (t) => t.name.toLowerCase() === newTag.name.toLowerCase()
          );

          if (existingTag) {
            createdTagIds.push(existingTag.id);
          } else {
            // Create the tag
            const createdTag = await tagService.create({ name: newTag.name });
            createdTagIds.push(createdTag.id);
          }
        } catch (error: any) {
          toast.error(error.response?.data?.message || `Failed to create tag "${newTag.name}"`);
          toast.dismiss('create-tags');
          return; // Stop if any tag creation fails
        }
      }

      toast.success(`Created ${newTags.length} new tag(s)!`, { id: 'create-tags' });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    }

    // Combine existing tag IDs with newly created tag IDs
    const allTagIds = [
      ...existingTags.map((tag) => tag.id),
      ...createdTagIds,
    ];

    const paperData: CreatePaperData = {
      title: data.title,
      authors: data.authors, // Keep as string - backend expects string
      abstract: data.abstract,
      publicationYear: data.publicationYear,
      journal: data.journal || undefined,
      doi: data.doi || undefined,
      url: data.url || undefined,
      tagIds: data.tags.map((tag) => tag.id),
      references: data.references?.map((ref) => ({
        title: ref.title || '',
        doi: ref.doi || undefined,
      })),
      // tagIds: allTagIds,
    };

    if (isEditMode) {
      updateMutation.mutate(paperData);
    } else {
      createMutation.mutate(paperData);
    }
  };

  const handleSuggestTags = async () => {
    // Check if paper has enough data
    const formValues = control._formValues;
    if (!formValues.title || !formValues.abstract) {
      toast.error('Please add title and abstract first to get AI tag suggestions');
      return;
    }

    setIsSuggestingTags(true);

    try {
      // For new papers, we need to create a temporary paper to get suggestions
      // For edit mode, use the existing paper ID
      let paperId = id ? Number(id) : null;

      if (!paperId) {
        // Create a temporary paper for tag suggestions
        toast.loading('Preparing for AI analysis...', { id: 'suggest-tags' });

        const tempPaper = await paperService.create({
          title: formValues.title,
          authors: formValues.authors || 'Unknown',
          abstract: formValues.abstract,
          publicationYear: formValues.publicationYear || new Date().getFullYear(),
          journal: formValues.journal || '',
          doi: formValues.doi || '',
          url: formValues.url || '',
          tagIds: [],
        });

        paperId = tempPaper.id;
      }

      toast.loading('AI is analyzing your paper...', { id: 'suggest-tags' });

      const result = await summaryService.suggestTags(paperId!);

      // Save AI suggested tag names permanently
      const aiTagNamesSet = new Set(result.suggested.map((name: string) => name.toLowerCase()));
      setAiSuggestedTagNames(aiTagNamesSet);

      setSuggestedTags(result.suggested);
      setTagConfidence(result.confidence);

      toast.success(
        `Found ${result.suggested.length} relevant tags! (Confidence: ${Math.round(result.confidence * 100)}%)`,
        { id: 'suggest-tags', duration: 4000 }
      );

    } catch (error: any) {
      console.error('Error suggesting tags:', error);
      toast.error(
        error.response?.data?.message || 'Failed to generate tag suggestions',
        { id: 'suggest-tags' }
      );
    } finally {
      setIsSuggestingTags(false);
    }
  };

  // Auto suggest tags without creating paper (used after metadata extraction)
  const handleAutoSuggestTags = async (title: string, abstract: string) => {
    if (!title || !abstract) return;

    setIsSuggestingTags(true);

    try {
      // Create a temporary paper for tag suggestions
      const tempPaper = await paperService.create({
        title: title,
        authors: control._formValues.authors || 'Unknown',
        abstract: abstract,
        publicationYear: control._formValues.publicationYear || new Date().getFullYear(),
        journal: control._formValues.journal || '',
        doi: control._formValues.doi || '',
        url: control._formValues.url || '',
        tagIds: [],
      });

      // console.log('Temporary paper created :', tempPaper);

      const result = await summaryService.suggestTags(tempPaper.id);

      // Save AI suggested tag names permanently
      const aiTagNamesSet = new Set(result.suggested.map((name: string) => name.toLowerCase()));
      setAiSuggestedTagNames(aiTagNamesSet);

      // Set suggested tags - they'll appear in dropdown automatically
      setSuggestedTags(result.suggested);
      setTagConfidence(result.confidence);

      // Delete the temporary paper
      // console.log('Deleting temporary paper with ID:', tempPaper.id);
      // await paperService.delete(tempPaper.data.id);
      await paperService.delete(tempPaper.id);

      toast.success(
        `AI found ${result.suggested.length} relevant tags! Select from dropdown (marked with AI badge). Confidence: ${Math.round(result.confidence * 100)}%`,
        { duration: 5000 }
      );

    } catch (error: any) {
      console.error('Error auto-suggesting tags:', error);
      // Fail silently for auto-suggest
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleExtractMetadata = async () => {
    if (!doiInput.trim()) {
      toast.error('Please enter a DOI or URL');
      return;
    }

    setIsExtractingMetadata(true);
    try {
      const metadata = await paperMetadataService.extractMetadata(doiInput.trim());

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
        references: metadata.references?.map((ref: any) => ({
          title: ref.title || '',
          doi: ref.doi || '',
        })) || [],
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
        toast.success('Metadata extracted successfully! AI is analyzing tags...');
      }

      setDoiInput(''); // Clear input after successful extraction

      // Automatically suggest tags if we have title and abstract
      if (metadata.title && metadata.abstract) {
        // Delay a bit to let the form update
        setTimeout(() => {
          handleAutoSuggestTags(metadata.title!, metadata.abstract!);
        }, 500);
      }
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
          await pdfService.uploadBlob(createdPaper.data.id, blob, result.filename);
          queryClient.invalidateQueries({ queryKey: ['pdfs', createdPaper.data.id] });

          toast.success('PDF uploaded successfully!', { id: 'arxiv-upload' });
        } catch (pdfError: any) {
          console.error('Error auto-uploading PDF:', pdfError);
          toast.error('Paper saved but PDF upload failed', { id: 'arxiv-upload' });
        }
      }

      // Navigate to paper detail page
      navigate(`/papers/${createdPaper.data.id}`);
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
    <>
      {/* Popup Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Paper Already Exists</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This paper already exists. Do you want to view it?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setOpenDialog(false);
              if (existingPaperId) navigate(`/papers/${existingPaperId}`);
            }}
            color="primary"
            variant="contained"
          >
            View Paper
          </Button>
        </DialogActions>
      </Dialog>

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

                {/* Tags - Enhanced with AI suggestions in dropdown */}
                <Grid item xs={12}>
                  <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        multiple
                        freeSolo
                        options={allTagOptions}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') return option;
                          return option.name;
                        }}
                        value={field.value as (Tag | TagOption)[]}
                        onChange={(_, newValue) => {
                          const processedTags: Tag[] = [];

                          for (const item of newValue) {
                            if (typeof item === 'string') {
                              // User typed a new tag name - create temporary tag
                              const tagName = item.trim();
                              if (!tagName) continue;

                              // Check if tag already exists
                              const existingTag = availableTags.find(
                                (t) => t.name.toLowerCase() === tagName.toLowerCase()
                              );

                              if (existingTag) {
                                processedTags.push(existingTag);
                              } else {
                                // Create temporary tag (negative ID means not yet saved)
                                const tempTag: Tag = {
                                  id: -Math.random(), // Temporary negative ID
                                  name: tagName,
                                  color: '#1976d2', // Default color
                                  createdAt: new Date().toISOString(),
                                };
                                processedTags.push(tempTag);
                              }
                            } else if ('id' in item && item.id < 0) {
                              // AI suggested or new tag with temporary ID
                              const existingTag = availableTags.find(
                                (t) => t.name.toLowerCase() === item.name.toLowerCase()
                              );

                              if (existingTag) {
                                processedTags.push(existingTag);
                              } else {
                                // Keep as temporary tag
                                const tempTag: Tag = {
                                  id: item.id,
                                  name: item.name,
                                  color: item.color || '#1976d2',
                                  createdAt: new Date().toISOString(),
                                };
                                processedTags.push(tempTag);
                              }
                            } else {
                              // Existing tag object - convert TagOption to Tag
                              const tagAsTag: Tag = {
                                id: item.id,
                                name: item.name,
                                color: item.color,
                                createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
                              };
                              processedTags.push(tagAsTag);
                            }
                          }

                          field.onChange(processedTags);
                        }}
                        isOptionEqualToValue={(option, value) => {
                          if (typeof option === 'string' || typeof value === 'string') return false;
                          // Compare by name for AI suggestions with temporary IDs
                          if (option.id < 0 || value.id < 0) {
                            return option.name.toLowerCase() === value.name.toLowerCase();
                          }
                          return option.id === value.id;
                        }}
                        renderOption={(props, option) => {
                          const isString = typeof option === 'string';
                          const isAiSuggested = !isString && 'isAiSuggested' in option && option.isAiSuggested;
                          const isNew = !isString && 'isNew' in option && option.isNew;
                          const tagName = isString ? option : option.name;
                          const tagColor = !isString ? option.color : '#1976d2';

                          // Check if already selected
                          const isSelected = field.value?.some((v: Tag) =>
                            v.name.toLowerCase() === tagName.toLowerCase()
                          );

                          return (
                            <Box
                              component="li"
                              {...props}
                              sx={{
                                display: 'flex !important',
                                alignItems: 'center',
                                gap: 1,
                                opacity: isSelected ? 0.5 : 1,
                                bgcolor: isSelected ? 'action.selected' : 'transparent',
                              }}
                            >
                              {/* Color indicator */}
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: tagColor,
                                  flexShrink: 0,
                                }}
                              />

                              {/* Tag name */}
                              <Typography sx={{ flexGrow: 1 }}>
                                {tagName}
                              </Typography>

                              {/* Badges */}
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {isSelected && (
                                  <Chip
                                    label="Selected"
                                    size="small"
                                    color="primary"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                                {isAiSuggested && (
                                  <Chip
                                    icon={<AutoAwesome sx={{ fontSize: 14 }} />}
                                    label="AI"
                                    size="small"
                                    color="secondary"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                                {isNew && !isAiSuggested && (
                                  <Chip
                                    label="New"
                                    size="small"
                                    color="success"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Tags"
                            placeholder={
                              suggestedTags.length > 0
                                ? `${suggestedTags.length} AI suggestions available - Select from dropdown or type to create`
                                : 'Select existing or type to create new tags'
                            }
                            helperText={
                              suggestedTags.length > 0
                                ? `🤖 ${suggestedTags.length} AI-suggested tags in dropdown (marked with AI badge) • ${Math.round(tagConfidence * 100)}% confidence • New tags will be created when you save the paper`
                                : 'Select from dropdown or type to create new tags • New tags will be created when you save the paper'
                            }
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {isSuggestingTags && <CircularProgress size={20} />}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => {
                            const tagName = typeof option === 'string' ? option : option.name;
                            const tagColor = typeof option !== 'string' ? option.color : '#1976d2';
                            const isNewTag = typeof option !== 'string' && option.id < 0;

                            return (
                              <Chip
                                label={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {tagName}
                                    {isNewTag && (
                                      <Typography
                                        component="span"
                                        sx={{
                                          fontSize: '0.65rem',
                                          bgcolor: 'success.main',
                                          color: 'white',
                                          px: 0.5,
                                          py: 0.1,
                                          borderRadius: 0.5,
                                          ml: 0.5,
                                        }}
                                      >
                                        NEW
                                      </Typography>
                                    )}
                                  </Box>
                                }
                                {...getTagProps({ index })}
                                key={typeof option === 'string' ? tagName : option.id}
                                sx={{
                                  bgcolor: tagColor + '20',
                                  borderColor: tagColor,
                                  color: tagColor,
                                  border: '1px solid',
                                  fontWeight: 500,
                                }}
                              />
                            );
                          })
                        }
                        disabled={isSubmitting}
                        filterOptions={(options, params) => {
                          const filtered = options.filter((option) => {
                            const optionName = typeof option === 'string' ? option : option.name;
                            return optionName.toLowerCase().includes(params.inputValue.toLowerCase());
                          });

                          // If typing and no exact match, suggest creating new
                          const { inputValue } = params;
                          const isExisting = options.some((option) => {
                            const optionName = typeof option === 'string' ? option : option.name;
                            return optionName.toLowerCase() === inputValue.toLowerCase();
                          });

                          if (inputValue !== '' && !isExisting) {
                            filtered.push({
                              id: -Math.random(),
                              name: `Create "${inputValue}"`,
                              color: '#4caf50',
                              paperCount: 0,
                              isNew: true,
                              isAiSuggested: false,
                            } as TagOption);
                          }

                          return filtered;
                        }}
                      />
                    )}
                  />

                  {/* Info about AI tags in dropdown */}
                  {suggestedTags.length > 0 && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        🤖 <strong>{suggestedTags.length} AI-suggested tags</strong> are now available in the dropdown above
                        (marked with <Chip label="AI" size="small" color="secondary" sx={{ height: 18, fontSize: '0.7rem' }} /> badge).
                        Confidence: <strong>{Math.round(tagConfidence * 100)}%</strong>
                      </Typography>
                    </Alert>
                  )}

                  {/* Manual trigger button */}
                  {!isSuggestingTags && suggestedTags.length === 0 && (
                    <Button
                      startIcon={<AutoAwesome />}
                      onClick={handleSuggestTags}
                      disabled={isSubmitting}
                      variant="outlined"
                      size="small"
                      color="secondary"
                      sx={{ mt: 1 }}
                    >
                      Get AI Tag Suggestions
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
    </>



  );
};

export default PaperFormPage;
