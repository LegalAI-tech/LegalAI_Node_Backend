import axios from 'axios';
import FormData from 'form-data';
class PythonBackendService {
    client;
    getBasePathPrefixes() {
        const rawBaseUrl = this.client.defaults.baseURL || '';
        try {
            const parsed = new URL(rawBaseUrl);
            const normalizedPath = parsed.pathname.replace(/\/+$/, '');
            if (!normalizedPath || normalizedPath === '/') {
                return [];
            }
            const knownPrefixes = ['/api/v3', '/api/v1', '/api'];
            return knownPrefixes.filter((prefix) => normalizedPath.toLowerCase().endsWith(prefix));
        }
        catch {
            return [];
        }
    }
    buildCandidatePaths(paths) {
        const candidates = [];
        const seen = new Set();
        const basePrefixes = this.getBasePathPrefixes();
        const addCandidate = (path) => {
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
    async postWithFallbacks(paths, data, config) {
        let lastError;
        const candidatePaths = this.buildCandidatePaths(paths);
        for (const path of candidatePaths) {
            try {
                const response = await this.client.post(path, data, config);
                return response.data;
            }
            catch (error) {
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
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.code === 'ECONNABORTED') {
                console.error('Python backend timeout. The space might be sleeping or overloaded.');
                error.message = 'The AI service is taking longer than expected. This might be because the service is waking up from sleep. Please try again in a moment.';
            }
            throw error;
        });
    }
    async chat(prompt, history = [], summary = null) {
        const request = {
            prompt,
            history,
            summary,
        };
        const response = await this.client.post('/api/v3/chat', request);
        return response.data;
    }
    async agentChat(message, sessionId, documentId) {
        const request = {
            message,
            session_id: sessionId || '',
            document_id: documentId || '',
        };
        const response = await this.client.post('/api/v3/agent/chat', request);
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
        return this.postWithFallbacks([
            '/api/v3/agent/upload-and-chat',
            '/api/v1/agent/upload-and-chat',
            '/api/v3/upload-and-chat',
            '/api/v1/upload-and-chat',
            '/agent/upload-and-chat',
            '/upload-and-chat',
        ], formData, {
            headers: formData.getHeaders(),
        });
    }
    async detectLanguage(text) {
        return this.postWithFallbacks([
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
        ], { text });
    }
    async listTemplates() {
        const response = await this.client.get('/api/v3/generate-document/templates');
        return response.data;
    }
    async getTemplateSchema(templateName) {
        const response = await this.client.get(`/api/v3/generate-document/templates/${encodeURIComponent(templateName)}/schema`);
        return response.data;
    }
    async getTemplateInfo(templateName) {
        const response = await this.client.get(`/api/v3/generate-document/templates/${encodeURIComponent(templateName)}/info`);
        return response.data;
    }
    async getTemplateCriticalFields(templateName) {
        const response = await this.client.get(`/api/v3/generate-document/templates/${encodeURIComponent(templateName)}/critical-fields`);
        return response.data;
    }
    async generateDocument(templateName, data) {
        const request = {
            template_name: templateName,
            data,
        };
        const response = await this.client.post('/api/v3/generate-document', request);
        return response.data;
    }
    async translate(text, sourceLang = 'en', targetLang = 'hi') {
        const request = {
            text,
            source_lang: sourceLang,
            target_lang: targetLang,
        };
        const response = await this.client.post('/api/v3/translate', request);
        return response.data;
    }
}
export default new PythonBackendService();
//# sourceMappingURL=python-backend.service.js.map