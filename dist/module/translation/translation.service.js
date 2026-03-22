import prisma from '../../config/database.js';
import pythonBackend from '../../services/python-backend.service.js';
import cacheService from '../../services/cache.service.js';
import { AppError } from '../../middleware/error.middleware.js';
class TranslationService {
    async translate(userId, text, sourceLang, targetLang) {
        const cached = await cacheService.getTranslation(text, sourceLang, targetLang);
        if (cached && typeof cached === 'string') {
            return {
                sourceText: text,
                translatedText: cached,
                sourceLang,
                targetLang,
                cached: true,
            };
        }
        const result = await pythonBackend.translate(text, sourceLang, targetLang);
        const translatedText = result.translated_text || '';
        if (!translatedText) {
            throw new Error('Translation failed: No translated text returned');
        }
        await prisma.translation.create({
            data: {
                userId,
                sourceText: text,
                translatedText,
                sourceLang,
                targetLang,
                metadata: {},
            },
        });
        await cacheService.cacheTranslation(text, sourceLang, targetLang, translatedText);
        return {
            sourceText: text,
            translatedText,
            sourceLang,
            targetLang,
            cached: false,
        };
    }
    async detectLanguage(text) {
        if (!text || text.trim().length === 0) {
            throw new Error('Text is required for language detection');
        }
        const result = await pythonBackend.detectLanguage(text);
        const language = result.detected_language;
        const displayName = language; // Since schema doesn't provide display_name, use the language code
        if (!language) {
            throw new AppError('Language detection failed: invalid response from AI service', 502, 'LANGUAGE_DETECTION_FAILED');
        }
        return {
            language,
            display_name: displayName,
        };
    }
    async getUserTranslations(userId) {
        const translations = await prisma.translation.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return translations;
    }
}
export default new TranslationService();
//# sourceMappingURL=translation.service.js.map