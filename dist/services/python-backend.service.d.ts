import { AgentChatResponse, UploadAndChatResponse, ChatResponse, TranslateResponse, DetectLanguageResponse, DocGenResponse } from '../types/python-backend.types.js';
declare class PythonBackendService {
    private client;
    constructor();
    chat(prompt: string, history?: Array<{
        role: string;
        content: string;
    }>): Promise<ChatResponse>;
    agentChat(message: string, sessionId?: string, documentId?: string): Promise<AgentChatResponse>;
    agentUploadAndChat(file: Buffer, fileName: string, initialMessage?: string, sessionId?: string, inputLanguage?: string, outputLanguage?: string): Promise<UploadAndChatResponse>;
    detectLanguage(text: string): Promise<DetectLanguageResponse>;
    generateDocument(templateName: string, data: Record<string, any>): Promise<DocGenResponse>;
    translate(text: string, sourceLang?: string, targetLang?: string): Promise<TranslateResponse>;
}
declare const _default: PythonBackendService;
export default _default;
//# sourceMappingURL=python-backend.service.d.ts.map