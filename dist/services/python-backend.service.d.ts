import { AgentChatResponse, UploadAndChatResponse, ChatResponse, TranslateResponse, DetectLanguageResponse, DocGenResponse, TemplateListResponse, TemplateSchemaResponse, TemplateDetailResponse, TemplateCriticalFieldsResponse } from '../types/python-backend.types.js';
declare class PythonBackendService {
    private client;
    constructor();
    chat(prompt: string, history?: Array<{
        role: string;
        content: string;
    }>, summary?: string | null, options?: {
        input_language?: string;
        output_language?: string;
    }): Promise<ChatResponse>;
    agentChat(message: string, sessionId?: string, documentId?: string, previousSummary?: string | null): Promise<AgentChatResponse>;
    agentUploadAndChat(file: Buffer, fileName: string, initialMessage?: string, sessionId?: string, inputLanguage?: string, outputLanguage?: string, previousSummary?: string | null): Promise<UploadAndChatResponse>;
    lawyerAgentChat(params: {
        query: string;
        sessionId?: string;
        documentId?: string;
        history?: Array<{
            role: string;
            content: string;
        }>;
        previousSummary?: string | null;
        matterId?: string;
        workspaceMemory?: Record<string, any>;
        conversationType?: string;
        inputLanguage?: string;
        outputLanguage?: string;
    }): Promise<AgentChatResponse>;
    detectLanguage(text: string): Promise<DetectLanguageResponse>;
    listTemplates(): Promise<TemplateListResponse>;
    getTemplateSchema(templateName: string): Promise<TemplateSchemaResponse>;
    getTemplateInfo(templateName: string): Promise<TemplateDetailResponse>;
    getTemplateCriticalFields(templateName: string): Promise<TemplateCriticalFieldsResponse>;
    generateDocument(templateName: string, data: Record<string, any>): Promise<DocGenResponse>;
    translate(text: string, sourceLang?: string, targetLang?: string): Promise<TranslateResponse>;
}
declare const _default: PythonBackendService;
export default _default;
//# sourceMappingURL=python-backend.service.d.ts.map