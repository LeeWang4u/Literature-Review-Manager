
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Container,
} from '@mui/material';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await authService.forgotPassword(email);
      console.log('✅ Forgot password result:', result);
      localStorage.setItem('resetToken', result.resetToken);
      localStorage.setItem('resetEmail', email);
      toast.success(result.message);
      navigate('/reset-password');
    } catch (err: any) {
      console.error('❌ Forgot password error:', err);
      const errorMessage = err.response?.data?.message || 'Gửi yêu cầu thất bại';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 2,
        }}
      >
        <Box mb={3}>
          <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
            Tìm tài khoản của bạn
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vui lòng nhập email hoặc số di động để tìm kiếm tài khoản của bạn.
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            id="email"
            label="Email hoặc số di động"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            disabled={loading}
            sx={{ mb: 3 }}
          />
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              color="inherit"
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default ForgotPasswordPage;