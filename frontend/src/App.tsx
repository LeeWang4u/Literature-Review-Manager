import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import GoogleCallbackPage from '@/pages/auth/GoogleCallbackPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import PapersPage from '@/pages/papers/PapersPage';
import PaperDetailPage from '@/pages/papers/PaperDetailPage';
import PaperFormPage from '@/pages/papers/PaperFormPage';
import NotesPage from '@/pages/notes/NotesPage';
import TagsPage from '@/pages/tags/TagsPage';
import LibraryPage from '@/pages/library/LibraryPage';
import CitationNetworkPage from '@/pages/citations/CitationNetworkPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import TagPaperPage from '@/pages/tags/TagPapersPage';
import ChatTestPage from '@/pages/ChatTestPage';
import PdfViewPage from '@/components/pdf/PdfViewPage';
import VerifyEmail from './components/email/VerifyEmail';
import VerifyOtp from './components/email/VerifyOtp';

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Protected routes */}
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/papers"
                element={
                  <ProtectedRoute>
                    <PapersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/papers/new"
                element={
                  <ProtectedRoute>
                    <PaperFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/papers/:id/edit"
                element={
                  <ProtectedRoute>
                    <PaperFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/papers/:id"
                element={
                  <ProtectedRoute>
                    <PaperDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/papers/:paperId/notes"
                element={
                  <ProtectedRoute>
                    <NotesPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/pdf/view/:id" 
                element={<PdfViewPage />} />

              <Route
                path="/tags"
                element={
                  <ProtectedRoute>
                    <TagsPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/tags/:id"
                element={
                  <ProtectedRoute>
                    <TagPaperPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <LibraryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citations/:id"
                element={
                  <ProtectedRoute>
                    <CitationNetworkPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat-test"
                element={
                  <ProtectedRoute>
                    <ChatTestPage />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* 404 redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
