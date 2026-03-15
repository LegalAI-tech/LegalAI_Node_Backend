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
  history?: Array<{role: string; content: string}>;
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
