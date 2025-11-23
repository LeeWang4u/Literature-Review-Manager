import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '@/services/api';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

const PdfViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/pdf/download/${id}`, { responseType: 'blob' });
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        if (mounted) setBlobUrl(url);
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.message || 'Failed to load PDF');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
      if (blobUrl) {
        try { window.URL.revokeObjectURL(blobUrl); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box textAlign="center">
          <CircularProgress />
          <Typography sx={{ mt: 1 }}>Preparing PDF…</Typography>
        </Box>
      </Box>
    );
  }

  if (error || !blobUrl) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" variant="h6">Error</Typography>
        <Typography sx={{ mt: 1 }}>{error || 'No PDF available'}</Typography>
        <Button sx={{ mt: 2 }} onClick={() => window.close()}>Close</Button>
      </Box>
    );
  }

  return (
    <iframe
      src={blobUrl}
      title={`PDF ${id}`}
      style={{ width: '100%', height: '100vh', border: 'none' }}
    />
  );
};

export default PdfViewPage;