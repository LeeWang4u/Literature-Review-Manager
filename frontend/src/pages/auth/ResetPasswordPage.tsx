

import React, { useState, useEffect } from 'react';
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
  Link,
} from '@mui/material';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const resetToken = localStorage.getItem('resetToken');
    const resetEmail = localStorage.getItem('resetEmail');
    
    if (!resetToken) {
      toast.error('Không tìm thấy token. Vui lòng yêu cầu đặt lại mật khẩu.');
      navigate('/forgot-password');
      return;
    }
    
    if (resetEmail) {
      setEmail(resetEmail);
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData({
      ...formData,
      otp: sanitizedValue,
    });
    setError('');
  };

  const validateForm = () => {
    if (formData.otp.length !== 6) {
      setError('Mã OTP phải có 6 chữ số');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resetToken = localStorage.getItem('resetToken');
      
      if (!resetToken) {
        throw new Error('Không tìm thấy token');
      }

      const result = await authService.resetPassword({
        resetToken,
        otp: formData.otp,
        newPassword: formData.newPassword,
      });
      
      console.log('✅ Password reset successful:', result);
      
      // Clean up localStorage
      localStorage.removeItem('resetToken');
      localStorage.removeItem('resetEmail');
      
      toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
      navigate('/login');
    } catch (err: any) {
      console.error('❌ Password reset error:', err);
      const errorMessage = err.response?.data?.message || 'Đặt lại mật khẩu thất bại';
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
        elevation={6}
        sx={{
          p: 4,
          width: '100%',
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'grey.300',
        }}
      >
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
            🔐 Đặt lại mật khẩu
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vui lòng nhập <strong style={{ color: '#6366f1' }}>mã OTP</strong> đã gửi đến
            <Typography component="span" variant="body2" fontFamily="monospace" display="block" mt={1} noWrap>
              {email}
            </Typography>
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Lỗi:</strong> {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box mb={3}>
            <Typography variant="body2" fontWeight="medium" mb={1}>
              Mã OTP (6 chữ số)
            </Typography>
            <TextField
              id="otp"
              variant="outlined"
              fullWidth
              inputProps={{
                maxLength: 6,
                style: {
                  textAlign: 'center',
                  fontSize: '1.875rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.4em',
                },
              }}
              value={formData.otp}
              onChange={handleOtpChange}
              disabled={loading}
              placeholder="000000"
            />
          </Box>

          <Box mb={3}>
            <Typography variant="body2" fontWeight="medium" mb={1}>
              Mật khẩu mới (ít nhất 6 ký tự)
            </Typography>
            <TextField
              id="newPassword"
              name="newPassword"
              type="password"
              variant="outlined"
              fullWidth
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading}
              placeholder="••••••••"
            />
          </Box>

          <Box mb={3}>
            <Typography variant="body2" fontWeight="medium" mb={1}>
              Xác nhận mật khẩu
            </Typography>
            <TextField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              variant="outlined"
              fullWidth
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              placeholder="••••••••"
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading || formData.otp.length !== 6}
            sx={{
              py: 1.5,
              fontSize: '1.125rem',
              fontWeight: 'semibold',
              borderRadius: 4,
              textTransform: 'none',
              mb: 2,
            }}
            endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </Button>

          <Box textAlign="center">
            <Link
              component={RouterLink}
              to="/login"
              color="primary"
              underline="hover"
              sx={{ fontSize: '0.875rem' }}
            >
              ← Quay lại trang Đăng nhập
            </Link>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default ResetPasswordPage;