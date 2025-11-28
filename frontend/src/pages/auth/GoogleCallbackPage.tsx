import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import toast from 'react-hot-toast';

const GoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Save token to localStorage
      localStorage.setItem('access_token', token);
      
      // Fetch user profile with the token
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(user => {
          localStorage.setItem('user', JSON.stringify(user));
        //   toast.success('Login with Google successful!');
          navigate('/dashboard');
        })
        .catch(err => {
          console.error('Failed to fetch user profile:', err);
          toast.error('Login failed. Please try again.');
          navigate('/login');
        });
    } else {
      toast.error('No authentication token received');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Signing in with Google...
        </Typography>
      </Box>
    </Container>
  );
};

export default GoogleCallbackPage;
