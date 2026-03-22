export interface AgentChatRequest {
    query: string;
    session_id?: string | null;
    document_id?: string | null;
    history?: Array<{
        role: string;
        content: string;
    }> | null;
    previous_summary?: string | null;
    conversation_id?: string | null;
    conversation_type?: string | null;
    user_role?: string | null;
    matter_id?: string | null;
    workspace_memory?: Record<string, any> | null;
    input_language?: string | null;
    output_language?: string | null;
}
export interface LawyerAgentChatRequest {
    query: string;
    session_id?: string | null;
    document_id?: string | null;
    history?: Array<{
        role: string;
        content: string;
    }>;
    previous_summary?: string | null;
    conversation_id?: string | null;
    conversation_type?: string | null;
    user_role?: string | null;
    matter_id?: string | null;
    workspace_memory?: Record<string, any> | null;
    input_language?: string | null;
    output_language?: string | null;
}
export interface LanguageInfo {
    detected_input?: string;
    detected_output?: string;
    [key: string]: any;
}
export interface AgentChatResponse {
    response: string;
    session_id: string;
    agents_used?: string[] | null;
    execution_trace?: any[] | null;
    updated_summary?: string;
    agent_outputs?: Record<string, any> | null;
    language_info?: Record<string, any> | null;
}
export interface UploadAndChatResponse {
    document_id?: string | null;
    storage_url: string;
    response: string;
    session_id: string;
    agents_used?: string[] | null;
    execution_trace?: any[] | null;
    updated_summary?: string;
    agent_outputs?: Record<string, any> | null;
    language_info?: Record<string, any> | null;
}
export interface ChatRequest {
    prompt: string;
    history?: Array<{
        role: string;
        content: string;
    }>;
    summary?: string | null;
}
export interface ChatResponse {
    response: string;
    updated_summary?: string;
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
    input_language?: string | null;
    output_language?: string | null;
}
export interface DetectLanguageResponse {
    detected_language: string;
    output_language: string;
    detection_metadata?: Record<string, any> | null;
    output_method?: string | null;
}
export interface DocGenRequest {
    template_name: string;
    data: Record<string, any>;
}
export interface DocGenResponse {
    document_content: string;
    status: 'complete' | 'incomplete' | 'error';
    template_used: string;
    completion_percentage: number;
    total_fields: number;
    fields_provided: number;
    missing_fields: string[];
    critical_fields_missing: string[];
    ai_generated_fields: string[];
    warning: string | null;
    error?: string;
}
export interface TemplateListResponse {
    available_templates: string[];
    total_count: number;
}
export interface FieldSchema {
    name: string;
    required: boolean;
    field_type: string;
    description: string;
    placeholder: string;
}
export interface TemplateSchemaResponse {
    template_name: string;
    all_fields: FieldSchema[];
    critical_fields: string[];
    optional_fields: string[];
    total_fields: number;
    supports_auto_generation: boolean;
}
export interface TemplateInfo {
    name: string;
    display_name: string;
    description: string;
    category: string;
    icon: string;
}
export interface TemplateDetailResponse {
    template_info: TemplateInfo;
    schema: TemplateSchemaResponse;
}
export interface TemplateCriticalFieldsResponse {
    template_name: string;
    critical_fields: string[];
    count: number;
    note: string;
}
//# sourceMappingURL=python-backend.types.d.ts.map