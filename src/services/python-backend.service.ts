import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import {
  AgentChatRequest,
  AgentChatResponse,
  UploadAndChatResponse,
  ChatRequest,
  ChatResponse,
  TranslateRequest,
  TranslateResponse,
  DetectLanguageResponse,
  DocGenRequest,
  DocGenResponse,
} from '../types/python-backend.types.js';

class PythonBackendService {
  private client: AxiosInstance;

  constructor() {

    const timeout = parseInt(process.env.PYTHON_BACKEND_TIMEOUT || '180000'); // 180s default

    this.client = axios.create({
      baseURL: process.env.PYTHON_BACKEND_URL,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNABORTED') {
          console.error('Python backend timeout. The space might be sleeping or overloaded.');
          error.message = 'The AI service is taking longer than expected. This might be because the service is waking up from sleep. Please try again in a moment.';
        }
        throw error;
      }
    );
  }

  async chat(prompt: string, history?: Array<{role: string; content: string}>): Promise<ChatResponse> {
    const request: ChatRequest = {
      prompt,
      history: history || [],
    };

    const response = await this.client.post<ChatResponse>('/api/v1/chat', request);
    return response.data;
  }

  async agentChat(
    message: string,
    sessionId?: string,
    documentId?: string
  ): Promise<AgentChatResponse> {
    const request: AgentChatRequest = {
      message,
      session_id: sessionId || '',
      document_id: documentId || '',
    };

    const response = await this.client.post<AgentChatResponse>(
      '/api/v1/agent/chat',
      request
    );
    return response.data;
  }

  async agentUploadAndChat(
    file: Buffer,
    fileName: string,
    initialMessage: string = 'Please analyze this document',
    sessionId?: string,
    inputLanguage?: string,
    outputLanguage?: string
  ): Promise<UploadAndChatResponse> {
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('initial_message', initialMessage);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }
    if (inputLanguage) {
      formData.append('input_language', inputLanguage);
    }
    if (outputLanguage) {
      formData.append('output_language', outputLanguage);
    }

    const response = await this.client.post<UploadAndChatResponse>(
      '/api/v1/agent/upload-and-chat',
      formData,
      {
        headers: formData.getHeaders(),
      }
    );
    return response.data;
  }

  async detectLanguage(text: string): Promise<DetectLanguageResponse> {
    const response = await this.client.post<DetectLanguageResponse>(
      '/api/v1/agent/detect-language',
      { text }
    );
    return response.data;
  }

  async generateDocument(
    templateName: string,
    data: Record<string, any>
  ): Promise<DocGenResponse> {
    const request: DocGenRequest = {
      template_name: templateName,
      data,
    };

    const response = await this.client.post<DocGenResponse>(
      '/api/v1/generate-document', // CORRECT: with hyphen
      request
    );
    return response.data;
  }

  async translate(
    text: string,
    sourceLang: string = 'en',
    targetLang: string = 'hi'
  ): Promise<TranslateResponse> {
    const request: TranslateRequest = {
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
    };

    const response = await this.client.post<TranslateResponse>('/api/v1/translate', request);
    return response.data;
  }
}

export default new PythonBackendService();