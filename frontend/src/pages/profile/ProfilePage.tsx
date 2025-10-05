import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
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
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>

        <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
          <Box display="flex" alignItems="center" mb={4}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                fontSize: 32,
                bgcolor: 'primary.main',
              }}
            >
              {user.fullName.charAt(0)}
            </Avatar>
            <Box ml={3}>
              <Typography variant="h5">{user.fullName}</Typography>
              <Typography variant="body1" color="textSecondary">
                {user.email}
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>

            <Box mt={2}>
              <Typography variant="body1">
                <strong>Email:</strong> {user.email}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <strong>Full Name:</strong> {user.fullName}
              </Typography>
              {user.affiliation && (
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Affiliation:</strong> {user.affiliation}
                </Typography>
              )}
              {user.createdAt && (
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Member Since:</strong>{' '}
                  {new Date(user.createdAt).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default ProfilePage;
