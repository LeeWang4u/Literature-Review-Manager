import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  Fab,
  Drawer,
  AppBar,
  Toolbar,
  Divider,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Send,
  Chat as ChatIcon,
  Close,
  SmartToy,
  Person,
  AutoAwesome,
} from '@mui/icons-material';
import { chatService } from '@/services/chat.service';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBoxProps {
  paperId?: number;
  paperTitle?: string;
  paperContext?: string; // Optional: Abstract or full text
}

export const ChatBox: React.FC<ChatBoxProps> = ({ paperId, paperTitle, paperContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('🤖 ChatBox mounted with props:', { paperId, paperTitle, paperContext: paperContext?.substring(0, 50) + '...' });
  }, [paperId, paperTitle, paperContext]);

  // Fetch suggested prompts
  const { data: suggestedPrompts = [], isLoading: isLoadingPrompts, error: promptsError } = useQuery({
    queryKey: ['chatPrompts'],
    queryFn: () => chatService.getSuggestedPrompts(),
  });

  useEffect(() => {
    if (isLoadingPrompts) {
      console.log('📥 Loading prompts...');
    } else if (promptsError) {
      console.error('❌ Error loading prompts:', promptsError);
    } else {
      console.log('✅ Prompts loaded:', suggestedPrompts.length);
    }
  }, [suggestedPrompts, isLoadingPrompts, promptsError]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend) return;

    console.log('📤 Sending message:', textToSend);

    // Add user message
    const userMessage: Message = {
      text: textToSend,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('🔄 Calling API with:', { message: textToSend, paperId, hasContext: !!paperContext });
      
      const response = await chatService.sendMessage({
        message: textToSend,
        paperId,
        paperContext,
      });

      console.log('✅ API response received:', response);

      // Add AI response
      const aiMessage: Message = {
        text: response.response,
        isUser: false,
        timestamp: new Date(response.timestamp),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('❌ API error:', error);
      toast.error(error.response?.data?.message || 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="chat"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
        onClick={() => setIsOpen(true)}
      >
        <ChatIcon />
      </Fab>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%',
          },
        }}
      >
        {/* Header */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <SmartToy sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              AI Research Assistant
            </Typography>
            <IconButton color="inherit" onClick={() => setIsOpen(false)}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Paper Context Info */}
        {paperTitle && (
          <Box sx={{ p: 2, bgcolor: 'primary.50' }}>
            <Typography variant="caption" color="text.secondary">
              Discussing paper:
            </Typography>
            <Typography variant="body2" fontWeight={500} noWrap>
              {paperTitle}
            </Typography>
          </Box>
        )}

        <Divider />

        {/* Messages Area */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            bgcolor: 'grey.50',
            minHeight: 0,
          }}
        >
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AutoAwesome sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Welcome to AI Assistant!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ask questions about the paper or select a suggested prompt below
              </Typography>

              {/* Suggested Prompts */}
              <Stack spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Suggested Questions:
                </Typography>
                {suggestedPrompts.slice(0, 5).map((prompt, index) => (
                  <Chip
                    key={index}
                    label={prompt}
                    onClick={() => handlePromptClick(prompt)}
                    icon={<AutoAwesome />}
                    color="primary"
                    variant="outlined"
                    sx={{
                      maxWidth: '100%',
                      height: 'auto',
                      py: 1,
                      '& .MuiChip-label': {
                        whiteSpace: 'normal',
                        textAlign: 'left',
                      },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                justifyContent: message.isUser ? 'flex-end' : 'flex-start',
              }}
            >
              {!message.isUser && (
                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                  <SmartToy sx={{ fontSize: 20 }} />
                </Avatar>
              )}

              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '80%',
                  bgcolor: message.isUser ? 'primary.main' : 'white',
                  color: message.isUser ? 'white' : 'text.primary',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {message.text}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    opacity: 0.7,
                  }}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Paper>

              {message.isUser && (
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                  <Person sx={{ fontSize: 20 }} />
                </Avatar>
              )}
            </Box>
          ))}

          {isLoading && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <SmartToy sx={{ fontSize: 20 }} />
              </Avatar>
              <Paper elevation={1} sx={{ p: 1.5 }}>
                <CircularProgress size={20} />
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Suggested Prompts (when messages exist) */}
        {messages.length > 0 && !isLoading && (
          <Box sx={{ p: 1, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
              Quick questions:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {suggestedPrompts.slice(0, 3).map((prompt, index) => (
                <Chip
                  key={index}
                  label={prompt}
                  size="small"
                  onClick={() => handlePromptClick(prompt)}
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Input Area */}
        <Divider />
        <Box sx={{ p: 2, bgcolor: 'white' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask a question about this paper..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              size="small"
            />
            <IconButton
              color="primary"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
            >
              <Send />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Press Enter to send, Shift+Enter for new line
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};
