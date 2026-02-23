import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Paper as MuiPaper,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { paperService } from '@/services/paper.service';
import { tagService } from '@/services/tag.service';
// import toast from 'react-hot-toast';

const TagPapersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tagName, setTagName] = useState<string>('');

  // ✅ Lấy thông tin tag (để hiện tiêu đề hoặc log)
  const { data: tag, error } = useQuery({
    queryKey: ['tag', id],
    queryFn: () => tagService.getById(Number(id)),
    enabled: !!id,
    retry: false,
  });

  // Handle errors with redirect
  useEffect(() => {
    if (error) {
      const err = error as any;
      if (err?.response?.status === 404 || err?.response?.status === 403) {
        // toast.error('Tag not found or you do not have access');
        navigate('/tags');
      }
    }
  }, [error, navigate]);

  // ✅ Khi tag thay đổi thì log ra
  useEffect(() => {
    if (tag) {
      console.log('Tag hiện tại:', tag);
      setTagName(tag.name);
    }
  }, [tag]);

  // ✅ Lấy danh sách paper thuộc tag này
  const { data, isLoading } = useQuery({
    queryKey: ['papers-by-tag', id],
    queryFn: () =>
      paperService.search({
        page: 1,
        pageSize: 20,
        tags: tag?.id ? String(tag.id) : undefined,
        // tags: [tag?.name || ''],
      }),
    enabled: !!tag?.name,
  });

  return (
    <MainLayout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              variant="outlined"
            >
              Back
            </Button>
            <Typography variant="h4">
              Papers tagged with <span style={{ color: '#1976d2' }}>{tagName}</span>
            </Typography>
          </Box>
        </Box>

        {/* Log ra tag */}
        <MuiPaper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'background.default',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            Tag info logged to console for debugging.
          </Typography>
        </MuiPaper>

        {/* Nội dung */}
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : data && data.data.length > 0 ? (
          <>
            <Grid container spacing={3}>
              {data.data.map((paper) => (
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
                        {paper.tags?.slice(0, 3).map((t) => (
                          <Chip
                            key={t.id}
                            label={t.name}
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
          </>
        ) : (
          <MuiPaper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No papers found for tag "{tagName}"
            </Typography>
          </MuiPaper>
        )}
      </Container>
    </MainLayout>
  );
};

export default TagPapersPage;



