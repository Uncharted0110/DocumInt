import { useState, useCallback } from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
  persona?: string;
  task?: string;
  results?: any[];
}

interface QueryResult {
  document: string;
  section_title: string;
  refined_text: string;
  page_number: number;
  importance_rank: number;
  bm25_score: number;
  embedding_score: number;
}

export const useChatState = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      type: 'bot',
      message: 'Hello! Upload PDFs to get started, then I can help you analyze them with persona-based search!',
      timestamp: new Date()
    }
  ]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, newMessage]);
  }, []);

  const addUserMessage = useCallback((message: string, persona?: string, task?: string) => {
    addMessage({
      type: 'user',
      message,
      persona,
      task
    });
  }, [addMessage]);

  const addBotMessage = useCallback((message: string, results?: QueryResult[]) => {
    addMessage({
      type: 'bot',
      message,
      results
    });
  }, [addMessage]);

  const clearChat = useCallback(() => {
    setChatHistory([
      {
        id: crypto.randomUUID(),
        type: 'bot',
        message: 'Hello! Upload PDFs to get started, then I can help you analyze them with persona-based search!',
        timestamp: new Date()
      }
    ]);
  }, []);

  return {
    chatHistory,
    addUserMessage,
    addBotMessage,
    clearChat
  };
};
