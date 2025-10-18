import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatBox } from '@/components/chat/ChatBox';
import { Container, Typography, Paper, Box } from '@mui/material';

const ChatTestPage: React.FC = () => {
  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Chat Test Page
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Click the blue chat button in the bottom-right corner to open the AI assistant.
          </Typography>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Test Scenarios:</Typography>
            <ol>
              <li>Click the FAB button (floating action button)</li>
              <li>Try clicking a suggested prompt</li>
              <li>Try typing a custom message</li>
              <li>Check browser console for errors</li>
            </ol>
          </Box>
        </Paper>

        {/* ChatBox without paper context */}
        <ChatBox />
      </Container>
    </MainLayout>
  );
};

export default ChatTestPage;
