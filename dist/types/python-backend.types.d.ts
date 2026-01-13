export interface AgentChatRequest {
    message: string;
    document_id?: string;
    session_id?: string;
    input_language?: string;
    output_language?: string;
}
export interface LanguageInfo {
    detected_input?: string;
    detected_output?: string;
    [key: string]: any;
}
export interface AgentChatResponse {
    response: string;
    session_id: string;
    tools_used: string[];
    intermediate_steps: any[];
    raw_results: any[];
    language_info?: {
        detected_input?: string;
        detected_output?: string;
    };
}
export interface UploadAndChatResponse {
    document_id: string;
    storage_url: string;
    agent_response: string;
    session_id: string;
    tools_used: string[];
    intermediate_steps: any[];
    raw_results: any[];
    language_info?: any;
    deduplication_info?: any;
}
export interface ChatRequest {
    prompt: string;
    history?: Array<{
        role: string;
        content: string;
    }>;
}
export interface ChatResponse {
    response: string;
}
export interface TranslateRequest {
    text: string;
    source_lang?: string;
    target_lang?: string;
}
export interface TranslateResponse {
    translated_text: string;
}
export interface DetectLanguageRequest {
    text: string;
}
export interface DetectLanguageResponse {
    input_detection: {
        language: string;
        confidence: number;
        method: string;
        supported: boolean;
        display_name: string;
        alternatives: any[];
    };
    suggested_output: {
        language: string;
        display_name: string;
    };
}
export interface DocGenRequest {
    template_name: string;
    data: Record<string, any>;
}
export interface DocGenResponse {
    document_content: string;
}
//# sourceMappingURL=python-backend.types.d.ts.map