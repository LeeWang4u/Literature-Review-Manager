import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteDialog, NoteFormDataSubmit} from '@/components/notes/NoteDialog';
import { noteService } from '@/services/note.service';
import { paperService } from '@/services/paper.service';
import { Note } from '@/types';
import toast from 'react-hot-toast';

const NotesPage: React.FC = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch paper details
  const { data: paper } = useQuery({
    queryKey: ['paper', paperId],
    queryFn: () => paperService.getById(Number(paperId)),
    enabled: !!paperId,
  });

  // Fetch notes for the paper
  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes', paperId],
    queryFn: () => noteService.getByPaper(Number(paperId)),
    enabled: !!paperId,
  });

  // Create note mutation
  const createMutation = useMutation({
    mutationFn: (data: NoteFormDataSubmit) =>
      noteService.create({
        ...data,
        paperId: Number(paperId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', paperId] });
      toast.success('Note created successfully!');
      setDialogOpen(false);
      setEditingNote(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create note');
    },
  });

  // Update note mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: NoteFormDataSubmit }) =>
      noteService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', paperId] });
      toast.success('Note updated successfully!');
      setDialogOpen(false);
      setEditingNote(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update note');
    },
  });

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => noteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', paperId] });
      toast.success('Note deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete note');
    },
  });

  const handleOpenDialog = () => {
    setEditingNote(null);
    setDialogOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNote(null);
  };

  const handleSubmit = (data: NoteFormDataSubmit) => {
    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteNote = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Filter notes by search query
  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    return (
    (note.title?.toLowerCase() || '').includes(query) ||
    (note.content?.toLowerCase() || '').includes(query) ||
    (note.highlightedText?.toLowerCase() || '').includes(query)
    );
  });

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
          <Alert severity="error">Failed to load notes</Alert>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Notes
          </Typography>
          {paper && (
            <Box>
              <Typography variant="subtitle1" color="textSecondary">
                Paper: {paper.title}
              </Typography>
              <Chip 
                label={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`} 
                size="small" 
                color="primary"
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </Box>

        {/* Action Bar */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            {/* Search */}
            <TextField
              placeholder="Search notes..."
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

            {/* Add Note Button */}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenDialog}
            >
              Add Note
            </Button>
          </Box>
        </Paper>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              textAlign: 'center', 
              border: '2px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" color="textSecondary" gutterBottom>
              {searchQuery ? 'No notes found matching your search' : 'No notes yet'}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {searchQuery 
                ? 'Try a different search term'
                : 'Start taking notes about this paper to keep track of important insights, questions, and observations.'
              }
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenDialog}
                sx={{ mt: 2 }}
              >
                Create Your First Note
              </Button>
            )}
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredNotes.map((note) => (
              <Grid item xs={12} sm={6} md={4} key={note.id}>
                <NoteCard
                  note={note}
                  onEdit={handleEditNote}
                  onDelete={handleDeleteNote}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Note Dialog */}
        <NoteDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSubmit={handleSubmit}
          existingNote={editingNote}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Container>
    </MainLayout>
  );
};

export default NotesPage;
