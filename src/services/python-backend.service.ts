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
  TemplateListResponse,
  TemplateSchemaResponse,
  TemplateDetailResponse,
  TemplateCriticalFieldsResponse,
} from '../types/python-backend.types.js';

class PythonBackendService {
  private client: AxiosInstance;

  private getBasePathPrefixes(): string[] {
    const rawBaseUrl = this.client.defaults.baseURL || '';

    try {
      const parsed = new URL(rawBaseUrl);
      const normalizedPath = parsed.pathname.replace(/\/+$/, '');

      if (!normalizedPath || normalizedPath === '/') {
        return [];
      }

      const knownPrefixes = ['/api/v3', '/api/v1', '/api'];
      return knownPrefixes.filter((prefix) =>
        normalizedPath.toLowerCase().endsWith(prefix)
      );
    } catch {
      return [];
    }
  }

  private buildCandidatePaths(paths: string[]): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();
    const basePrefixes = this.getBasePathPrefixes();

    const addCandidate = (path: string) => {
      if (!seen.has(path)) {
        seen.add(path);
        candidates.push(path);
      }
    };

    for (const path of paths) {
      addCandidate(path);

      for (const prefix of basePrefixes) {
        if (path.toLowerCase().startsWith(prefix)) {
          const withoutPrefix = path.slice(prefix.length) || '/';
          addCandidate(withoutPrefix.startsWith('/') ? withoutPrefix : `/${withoutPrefix}`);
        }
      }
    }

    return candidates;
  }

  private async postWithFallbacks<T>(
    paths: string[],
    data: any,
    config?: { headers?: Record<string, string> }
  ): Promise<T> {
    let lastError: any;

    const candidatePaths = this.buildCandidatePaths(paths);

    for (const path of candidatePaths) {
      try {
        const response = await this.client.post<T>(path, data, config);
        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

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

  async chat(prompt: string, 
    history: Array<{ role: string; content: string }> = [], 
    summary: string | null = null
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      prompt,
      history,
      summary,
    };

    const response = await this.client.post<ChatResponse>('/api/v3/chat', request);
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
      '/api/v3/agent/chat',
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

    return this.postWithFallbacks<UploadAndChatResponse>(
      [
        '/api/v3/agent/upload-and-chat',
        '/api/v1/agent/upload-and-chat',
        '/api/v3/upload-and-chat',
        '/api/v1/upload-and-chat',
        '/agent/upload-and-chat',
        '/upload-and-chat',
      ],
      formData,
      {
        headers: formData.getHeaders() as Record<string, string>,
      }
    );
  }

  async detectLanguage(text: string): Promise<DetectLanguageResponse> {
    return this.postWithFallbacks<DetectLanguageResponse>(
      [
        '/api/v3/language/detect',
        '/api/v3/agent/detect-language',
        '/api/v1/agent/detect-language',
        '/api/v3/detect-language',
        '/api/v1/detect-language',
        '/api/v3/translation/detect-language',
        '/api/v1/translation/detect-language',
        '/language/detect',
        '/agent/detect-language',
        '/detect-language',
      ],
      { text }
    );
  }

  async listTemplates(): Promise<TemplateListResponse> {
    const response = await this.client.get<TemplateListResponse>(
      '/api/v3/generate-document/templates'
    );
    return response.data;
  }

  async getTemplateSchema(templateName: string): Promise<TemplateSchemaResponse> {
    const response = await this.client.get<TemplateSchemaResponse>(
      `/api/v3/generate-document/templates/${encodeURIComponent(templateName)}/schema`
    );
    return response.data;
  }

  async getTemplateInfo(templateName: string): Promise<TemplateDetailResponse> {
    const response = await this.client.get<TemplateDetailResponse>(
      `/api/v3/generate-document/templates/${encodeURIComponent(templateName)}/info`
    );
    return response.data;
  }

  async getTemplateCriticalFields(templateName: string): Promise<TemplateCriticalFieldsResponse> {
    const response = await this.client.get<TemplateCriticalFieldsResponse>(
      `/api/v3/generate-document/templates/${encodeURIComponent(templateName)}/critical-fields`
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
      '/api/v3/generate-document',
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

    const response = await this.client.post<TranslateResponse>('/api/v3/translate', request);
    return response.data;
  }
}

export default new PythonBackendService();