import { AgentChatResponse, UploadAndChatResponse, ChatResponse, TranslateResponse, DetectLanguageResponse, DocGenResponse, TemplateListResponse, TemplateSchemaResponse, TemplateDetailResponse, TemplateCriticalFieldsResponse } from '../types/python-backend.types.js';
declare class PythonBackendService {
    private client;
    private getBasePathPrefixes;
    private buildCandidatePaths;
    private postWithFallbacks;
    constructor();
    chat(prompt: string, history?: Array<{
        role: string;
        content: string;
    }>, summary?: string | null): Promise<ChatResponse>;
    agentChat(message: string, sessionId?: string, documentId?: string): Promise<AgentChatResponse>;
    agentUploadAndChat(file: Buffer, fileName: string, initialMessage?: string, sessionId?: string, inputLanguage?: string, outputLanguage?: string): Promise<UploadAndChatResponse>;
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