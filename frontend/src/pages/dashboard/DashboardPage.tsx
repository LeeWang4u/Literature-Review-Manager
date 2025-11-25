import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Description,
  LocalLibrary,
  AccountTree,
  TrendingUp,
} from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { paperService } from '@/services/paper.service';
import { libraryService } from '@/services/library.service';
import PieChart from './PieChart';
import PapersByYearChart from './PapersByYearChart';

const DashboardPage: React.FC = () => {
  const { data: paperStats, isLoading: loadingPaperStats } = useQuery({
    queryKey: ['paperStatistics'],
    queryFn: () => paperService.getStatistics(),
  });



  const { data: libraryStats, isLoading: loadingLibraryStats } = useQuery({
    queryKey: ['libraryStatistics'],
    queryFn: () => libraryService.getStatistics(),
  });

  const { data: libraryCountByStatus } = useQuery({
    queryKey: ['libraryCountByStatus'],
    queryFn: () => libraryService.countByStatus(),
  });

  // console.log('Library Count By Status:', libraryCountByStatus?.to_read);

  const isLoading = loadingPaperStats || loadingLibraryStats;

  if (isLoading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  const stats = [
    {
      title: 'Total Papers',
      value: paperStats?.total || 0,
      icon: <Description fontSize="large" color="primary" />,
      color: '#1976d2',
    },
    {
      title: 'Library Items',
      value: libraryStats?.total || 0,
      icon: <LocalLibrary fontSize="large" color="secondary" />,
      color: '#dc004e',
    },
    {
      title: 'Reading',
      value: libraryCountByStatus?.reading || 0,
      icon: <TrendingUp fontSize="large" color="success" />,
      color: '#2e7d32',
    },
    {
      title: 'Completed',
      value: libraryCountByStatus?.completed || 0,
      icon: <AccountTree fontSize="large" color="warning" />,
      color: '#ed6c02',
    },
  ];

  return (
    <MainLayout>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="h6">
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" component="div">
                        {stat.value}
                      </Typography>
                    </Box>
                    <Box>{stat.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4 }}> {/* tăng mt tùy ý, ví dụ 6 hoặc 8 */}
          <PieChart
            to_read={libraryCountByStatus?.to_read || 0}
            reading={libraryCountByStatus?.reading || 0}
            completed={libraryCountByStatus?.completed || 0}
          />
        </Box>
        <Box sx={{ mt: 4 }}>
          <PapersByYearChart data={ paperStats?.byYear
        ? paperStats.byYear.map(item => ({
              year: Number(item.year),
              count: Number(item.count),
          })): []} />
        </Box>


        <Box sx={{ mt: 4 }}>
          <Alert severity="info">
            Welcome to Literature Review Manager! Start by adding papers or exploring your library.
          </Alert>
        </Box>
      </Container>
    </MainLayout >
  );
};

export default DashboardPage;
