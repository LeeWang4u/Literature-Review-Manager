import axiosInstance from './api';

export interface ChatMessage {
  message: string;
  paperId?: number;
  paperContext?: string;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
}

export interface SuggestedPromptsResponse {
  prompts: string[];
}

class ChatService {
  async sendMessage(data: ChatMessage): Promise<ChatResponse> {
    // Clean up undefined values to avoid validation errors
    const payload: any = {
      message: data.message,
    };
    
    if (data.paperId !== undefined) {
      payload.paperId = data.paperId;
    }
    
    if (data.paperContext !== undefined && data.paperContext !== '') {
      payload.paperContext = data.paperContext;
    }
    
    const response = await axiosInstance.post<ChatResponse>('/chat', payload);
    return response.data;
  }

  async getSuggestedPrompts(): Promise<string[]> {
    const response = await axiosInstance.get<SuggestedPromptsResponse>('/chat/prompts');
    return response.data.prompts;
  }
}

export const chatService = new ChatService();
