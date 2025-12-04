import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // OTP Dialog state
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otp, setOtp] = useState('');
  const [changePasswordToken, setChangePasswordToken] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.requestChangePasswordOtp({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setChangePasswordToken(response.changePasswordToken);
      toast.success('OTP đã được gửi về email của bạn!');
      setShowOtpDialog(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to request OTP';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setOtpLoading(true);

    try {
      const response = await authService.verifyChangePasswordOtp({
        changePasswordToken,
        otp,
      });

      toast.success(response.message || 'Password changed successfully!');
      setShowOtpDialog(false);
      
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setOtp('');
      setChangePasswordToken('');

      // Redirect to profile or login page after a delay
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Invalid OTP';
      toast.error(errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };


  const handleCloseOtpDialog = () => {
    setShowOtpDialog(false);
    setOtp('');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <LockIcon sx={{ mr: 1, fontSize: 32 }} />
            <Typography variant="h5" component="h1">
              Change Password
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              name="currentPassword"
              label="Current Password"
              type="password"
              required
              value={formData.currentPassword}
              onChange={handleChange}
              disabled={loading}
              autoComplete="current-password"
            />

            <TextField
              fullWidth
              margin="normal"
              name="newPassword"
              label="New Password"
              type="password"
              required
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading}
              helperText="Minimum 6 characters"
              autoComplete="new-password"
            />

            <TextField
              fullWidth
              margin="normal"
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Continue'}
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onClose={handleCloseOtpDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Verify OTP</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We've sent a 6-digit OTP code to your email. Please enter it below to complete the password change.
          </Typography>
          <TextField
            fullWidth
            label="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            inputProps={{ maxLength: 6 }}
            disabled={otpLoading}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOtpDialog} disabled={otpLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleVerifyOtp} 
            variant="contained" 
            disabled={otpLoading || otp.length !== 6}
          >
            {otpLoading ? 'Verifying...' : 'Verify & Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ChangePasswordPage;
