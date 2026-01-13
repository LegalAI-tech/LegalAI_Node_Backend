import axios from 'axios';
import FormData from 'form-data';
class PythonBackendService {
    client;
    constructor() {
        const timeout = parseInt(process.env.PYTHON_BACKEND_TIMEOUT || '180000'); // 180s default
        this.client = axios.create({
            baseURL: process.env.PYTHON_BACKEND_URL,
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
    async chat(prompt, history) {
        const request = {
            prompt,
            history: history || [],
        };
        const response = await this.client.post('/api/v1/chat', request);
        return response.data;
    }
    async agentChat(message, sessionId, documentId) {
        const request = {
            message,
            session_id: sessionId || '',
            document_id: documentId || '',
        };
        const response = await this.client.post('/api/v1/agent/chat', request);
        return response.data;
    }
    async agentUploadAndChat(file, fileName, initialMessage = 'Please analyze this document', sessionId, inputLanguage, outputLanguage) {
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
        const response = await this.client.post('/api/v1/agent/upload-and-chat', formData, {
            headers: formData.getHeaders(),
        });
        return response.data;
    }
    async detectLanguage(text) {
        const response = await this.client.post('/api/v1/agent/detect-language', { text });
        return response.data;
    }
    async generateDocument(templateName, data) {
        const request = {
            template_name: templateName,
            data,
        };
        const response = await this.client.post('/api/v1/generate-document', // CORRECT: with hyphen
        request);
        return response.data;
    }
    async translate(text, sourceLang = 'en', targetLang = 'hi') {
        const request = {
            text,
            source_lang: sourceLang,
            target_lang: targetLang,
        };
        const response = await this.client.post('/api/v1/translate', request);
        return response.data;
    }
}
export default new PythonBackendService();
//# sourceMappingURL=python-backend.service.js.map