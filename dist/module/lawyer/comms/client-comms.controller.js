import clientCommsService from './client-comms.service.js';
class ClientCommsController {
    async generate(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId, eventContext, clientName, format, language, outputLanguage, additionalContext, } = req.body;
            if (!matterId) {
                return res.status(400).json({ success: false, message: 'matterId is required.' });
            }
            if (!eventContext?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'eventContext is required — describe what happened or what to communicate.',
                });
            }
            if (!clientName?.trim()) {
                return res.status(400).json({ success: false, message: 'clientName is required.' });
            }
            const validFormats = ['whatsapp', 'email', 'voice_note', 'all'];
            if (format && !validFormats.includes(format)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid format. Must be one of: ${validFormats.join(', ')}.`,
                });
            }
            const result = await clientCommsService.generate(lawyerId, {
                matterId,
                eventContext: eventContext.trim(),
                clientName: clientName.trim(),
                format: format ?? 'all',
                language,
                outputLanguage,
                additionalContext: additionalContext?.trim(),
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
export default new ClientCommsController();
//# sourceMappingURL=client-comms.controller.js.map