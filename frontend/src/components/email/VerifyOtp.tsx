// import { useState } from 'react';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import { authService } from '@/services/auth.service';

// export default function VerifyOtp() {
//   const [otp, setOtp] = useState('');
//   const navigate = useNavigate();

//   const handleVerify = async () => {
//     const verifyToken = localStorage.getItem('verifyToken');

//     // await axios.post('/auth/verify-otp', {
//     //   verifyToken,
//     //   otp,
//     // });
//     const response = await authService.verifyOtp({ token: verifyToken || '', otp });

//     // ✅ Xoá token tạm
//     localStorage.removeItem('verifyToken');
//     console.log('verifyOtp   ', response);

//     alert('Xác thực thành công!');
//     navigate('/login');
//   };

//   return (
//     <div>
//       <h2>Xác thực OTP</h2>

//       <input
//         type="text"
//         maxLength={6}
//         placeholder="Nhập OTP"
//         value={otp}
//         onChange={(e) => setOtp(e.target.value)}
//       />

//       <button onClick={handleVerify}>Xác nhận</button>
//     </div>
//   );
// }


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Container,
  Alert,
} from '@mui/material';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(sanitizedValue);
    setError('');
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Mã OTP phải có 6 chữ số');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const verifyToken = localStorage.getItem('verifyToken');
      if (!verifyToken) {
        throw new Error('Không tìm thấy token');
      }

      const response = await authService.verifyOtp({ token: verifyToken, otp });
      console.log('verifyOtp', response);

      localStorage.removeItem('verifyToken');
      toast.success('Xác thực thành công!');
      navigate('/login');
    } catch (err: any) {
      console.error('❌ Verify OTP error:', err);
      const errorMessage = err.response?.data?.message || 'Xác thực thất bại';
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
            Xác thực OTP
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vui lòng nhập mã OTP đã gửi đến email của bạn.
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <Box mb={3}>
          <TextField
            id="otp"
            label="Mã OTP (6 chữ số)"
            variant="outlined"
            fullWidth
            inputProps={{
              maxLength: 6,
              style: {
                textAlign: 'center',
                fontSize: '1.5rem',
                fontFamily: 'monospace',
                letterSpacing: '0.3em',
              },
            }}
            value={otp}
            onChange={handleOtpChange}
            disabled={loading}
            placeholder="000000"
          />
        </Box>
        <Button
          onClick={handleVerify}
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || otp.length !== 6}
          endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Đang xác thực...' : 'Xác nhận'}
        </Button>
      </Paper>
    </Container>
  );
}