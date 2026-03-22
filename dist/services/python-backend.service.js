import axios from 'axios';
import FormData from 'form-data';
class PythonBackendService {
    client;
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
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.code === 'ECONNABORTED') {
                console.error('Python backend timeout. The space might be sleeping or overloaded.');
                error.message = 'The AI service is taking longer than expected. This might be because the service is waking up from sleep. Please try again in a moment.';
            }
            throw error;
        });
    }
    async chat(prompt, history = [], summary, options) {
        const request = {
            prompt,
            history,
        };
        if (summary) {
            request.summary = summary;
        }
        if (options?.input_language)
            request.input_language = options.input_language;
        if (options?.output_language)
            request.output_language = options.output_language;
        try {
            const response = await this.client.post('/chat', request);
            return response.data;
        }
        catch (error) {
            if (error.response?.data) {
                console.error('Python backend /chat 422 error detail:', JSON.stringify(error.response.data, null, 2));
                throw new Error(`Python backend validation error (422) in /chat: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }
    async agentChat(message, sessionId, documentId, previousSummary) {
        const request = {
            query: message,
        };
        if (sessionId)
            request.session_id = sessionId;
        if (documentId)
            request.document_id = documentId;
        if (previousSummary)
            request.previous_summary = previousSummary;
        const response = await this.client.post('/agent/chat', request);
        return response.data;
    }
    async agentUploadAndChat(file, fileName, initialMessage = 'Please analyze this document', sessionId, inputLanguage, outputLanguage, previousSummary) {
        const formData = new FormData();
        formData.append('file', file, fileName);
        formData.append('query', initialMessage);
        if (sessionId) {
            formData.append('session_id', sessionId);
        }
        if (previousSummary) {
            formData.append('previous_summary', previousSummary);
        }
        const response = await this.client.post('/agent/upload-and-chat', formData, {
            headers: formData.getHeaders(),
        });
        return response.data;
    }
    async lawyerAgentChat(params) {
        const body = {
            query: params.query,
            user_role: 'LAWYER',
        };
        if (params.sessionId)
            body.session_id = params.sessionId;
        if (params.documentId)
            body.document_id = params.documentId;
        if (params.history)
            body.history = params.history;
        if (params.previousSummary)
            body.previous_summary = params.previousSummary;
        if (params.conversationType)
            body.conversation_type = params.conversationType;
        if (params.matterId)
            body.matter_id = params.matterId;
        if (params.workspaceMemory)
            body.workspace_memory = params.workspaceMemory;
        if (params.inputLanguage)
            body.input_language = params.inputLanguage;
        if (params.outputLanguage)
            body.output_language = params.outputLanguage;
        const response = await this.client.post('/agent/chat', body);
        return response.data;
    }
    async detectLanguage(text) {
        const response = await this.client.post('/language/detect', { text });
        return response.data;
    }
    async listTemplates() {
        const response = await this.client.get('/generate-document/templates');
        return response.data;
    }
    async getTemplateSchema(templateName) {
        const response = await this.client.get(`/generate-document/templates/${encodeURIComponent(templateName)}/schema`);
        return response.data;
    }
    async getTemplateInfo(templateName) {
        const response = await this.client.get(`/generate-document/templates/${encodeURIComponent(templateName)}/info`);
        return response.data;
    }
    async getTemplateCriticalFields(templateName) {
        const response = await this.client.get(`/generate-document/templates/${encodeURIComponent(templateName)}/critical-fields`);
        return response.data;
    }
    async generateDocument(templateName, data) {
        const request = {
            template_name: templateName,
            data,
        };
        const response = await this.client.post('/generate-document', request);
        return response.data;
    }
    async translate(text, sourceLang = 'en', targetLang = 'hi') {
        const request = {
            text,
            source_lang: sourceLang,
            target_lang: targetLang,
        };
        const response = await this.client.post('/translate', request);
        return response.data;
    }
}
export default new PythonBackendService();
//# sourceMappingURL=python-backend.service.js.map