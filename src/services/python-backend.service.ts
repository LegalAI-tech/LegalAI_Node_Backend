import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import {
  AgentChatRequest,
  LawyerAgentChatRequest,
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
  DocumentOwnerAssignment,
  DocumentOwnerAssignmentResult,
} from '../types/python-backend.types.js';
import { generatePythonServiceToken, type PythonServiceClaims } from '../utils/jwt.utils.js';
import { REQUEST_ID_HEADER, getRequestId } from '../utils/request-context.js';
import { DEFAULT_DOCUMENT_QUESTION } from '../prompts/documents.prompt.js';

declare module 'axios' {
  interface AxiosRequestConfig {
    // Identity signed into the service token for this call
    serviceClaims?: PythonServiceClaims;
  }
}

/**
 * Who a document-touching call acts for. The Python backend only lets a
 * caller read documents uploaded under the same tenant.
 */
export const pythonCaller = {
  citizen: (userId: string): PythonServiceClaims => ({
    role: 'CITIZEN',
    tenant: `citizen:${userId}`,
  }),
  lawyer: (lawyerId: string, matterId?: string): PythonServiceClaims => ({
    role: 'LAWYER',
    tenant: `lawyer:${lawyerId}`,
    ...(matterId ? { matter: matterId } : {}),
  }),
};

class PythonBackendService {
  private client: AxiosInstance;

  constructor() {
    const timeout = parseInt(process.env.PYTHON_BACKEND_TIMEOUT || '180000'); // 180s default
    const rawBaseUrl = (process.env.PYTHON_BACKEND_URL || '').trim().replace(/\/+$/, '');
    const baseURL = /\/api\/v\d+$/i.test(rawBaseUrl)
      ? rawBaseUrl
      : `${rawBaseUrl}/api/v3`;

    this.client = axios.create({
      baseURL,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Sign every request; the Python backend rejects calls without a valid service token.
    this.client.interceptors.request.use((config) => {
      config.headers.set('Authorization', `Bearer ${generatePythonServiceToken(config.serviceClaims)}`);

      // Lets one request be followed across both services' logs
      const requestId = getRequestId();
      if (requestId) config.headers.set(REQUEST_ID_HEADER, requestId);

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNABORTED') {
          console.error('Python backend timeout. The space might be sleeping or overloaded.');
          error.message = 'The AI service is taking longer than expected. This might be because the service is waking up from sleep. Please try again in a moment.';
        }
        if (error.response?.status === 401 || error.response?.status === 503) {
          console.error(
            'Python backend rejected the service token. Check that PYTHON_BACKEND_SECRETKEY is set to the same value on both services.'
          );
        }
        throw error;
      }
    );
  }

  async chat(prompt: string, 
    history: Array<{ role: string; content: string }> = [], 
    summary?: string | null,
    options?: { input_language?: string; output_language?: string }
  ): Promise<ChatResponse> {
    const request: any = {
      prompt,
      history,
    };

    if (summary) {
      request.summary = summary;
    }

    if (options?.input_language) request.input_language = options.input_language;
    if (options?.output_language) request.output_language = options.output_language;

    try {
      const response = await this.client.post<ChatResponse>('/chat', request);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        console.error('Python backend /chat 422 error detail:', JSON.stringify(error.response.data, null, 2));
        throw new Error(`Python backend validation error (422) in /chat: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async agentChat(
    caller: PythonServiceClaims,
    message: string,
    sessionId?: string,
    documentId?: string,
    previousSummary?: string | null
  ): Promise<AgentChatResponse> {
    const request: any = {
      query: message,
    };
    if (sessionId) request.session_id = sessionId;
    if (documentId) request.document_id = documentId;
    if (previousSummary) request.previous_summary = previousSummary;

    const response = await this.client.post<AgentChatResponse>('/agent/chat', request, {
      serviceClaims: caller,
    });
    return response.data;
  }

  async agentUploadAndChat(
    caller: PythonServiceClaims,
    file: Buffer,
    fileName: string,
    initialMessage: string = DEFAULT_DOCUMENT_QUESTION,
    sessionId?: string,
    inputLanguage?: string,
    outputLanguage?: string,
    previousSummary?: string | null
  ): Promise<UploadAndChatResponse> {
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('query', initialMessage);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }
    if (previousSummary) {
      formData.append('previous_summary', previousSummary);
    }
    if (inputLanguage) {
      formData.append('input_language', inputLanguage);
    }
    if (outputLanguage) {
      formData.append('output_language', outputLanguage);
    }

    const response = await this.client.post<UploadAndChatResponse>(
      '/agent/upload-and-chat',
      formData,
      {
        headers: formData.getHeaders() as Record<string, string>,
        serviceClaims: caller,
      }
    );

    return response.data;
  }

  async lawyerAgentChat(caller: PythonServiceClaims, params: {
    query: string;
    sessionId?: string;
    documentId?: string;
    history?: Array<{ role: string; content: string }>;
    previousSummary?: string | null;
    matterId?: string;
    workspaceMemory?: Record<string, any>;
    conversationType?: string;
    inputLanguage?: string;
    outputLanguage?: string;
  }): Promise<AgentChatResponse> {
    const body: any = {
      query: params.query,
      user_role: 'LAWYER',
    };

    if (params.sessionId) body.session_id = params.sessionId;
    if (params.documentId) body.document_id = params.documentId;
    if (params.history) body.history = params.history;
    if (params.previousSummary) body.previous_summary = params.previousSummary;
    if (params.conversationType) body.conversation_type = params.conversationType;
    if (params.matterId) body.matter_id = params.matterId;
    if (params.workspaceMemory) body.workspace_memory = params.workspaceMemory;
    if (params.inputLanguage) body.input_language = params.inputLanguage;
    if (params.outputLanguage) body.output_language = params.outputLanguage;

    const response = await this.client.post<AgentChatResponse>('/agent/chat', body, {
      serviceClaims: caller,
    });
    return response.data;
  }

  /**
   * One-off backfill: record owners for documents uploaded before the Python
   * backend tracked ownership. Returns the document ID to store from now on.
   */
  async assignDocumentOwners(
    documents: DocumentOwnerAssignment[]
  ): Promise<DocumentOwnerAssignmentResult[]> {
    const response = await this.client.post<DocumentOwnerAssignmentResult[]>(
      '/documents/owners',
      { documents }
    );
    return response.data;
  }

  async detectLanguage(text: string): Promise<DetectLanguageResponse> {
    const response = await this.client.post<DetectLanguageResponse>('/language/detect', { text });
    return response.data;
  }

  async listTemplates(): Promise<TemplateListResponse> {
    const response = await this.client.get<TemplateListResponse>(
      '/generate-document/templates'
    );
    return response.data;
  }

  async getTemplateSchema(templateName: string): Promise<TemplateSchemaResponse> {
    const response = await this.client.get<TemplateSchemaResponse>(
      `/generate-document/templates/${encodeURIComponent(templateName)}/schema`
    );
    return response.data;
  }

  async getTemplateInfo(templateName: string): Promise<TemplateDetailResponse> {
    const response = await this.client.get<TemplateDetailResponse>(
      `/generate-document/templates/${encodeURIComponent(templateName)}/info`
    );
    return response.data;
  }

  async getTemplateCriticalFields(templateName: string): Promise<TemplateCriticalFieldsResponse> {
    const response = await this.client.get<TemplateCriticalFieldsResponse>(
      `/generate-document/templates/${encodeURIComponent(templateName)}/critical-fields`
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
      '/generate-document',
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

    const response = await this.client.post<TranslateResponse>('/translate', request);
    return response.data;
  }
}

export default new PythonBackendService();