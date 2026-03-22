import matterEventService from './matter-event.service.js';
class MatterEventController {
    async createEvent(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId } = req.params;
            const event = await matterEventService.createEvent(lawyerId, matterId, req.body);
            res.status(201).json({ success: true, data: event });
        }
        catch (error) {
            next(error);
        }
    }
    async listEvents(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId } = req.params;
            const { status, isDeadline, upcoming } = req.query;
            const events = await matterEventService.listEvents(lawyerId, matterId, {
                status,
                isDeadline: isDeadline !== undefined ? isDeadline === 'true' : undefined,
                upcoming: upcoming === 'true',
            });
            res.status(200).json({ success: true, data: events });
        }
        catch (error) {
            next(error);
        }
    }
    async getEvent(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId, eventId } = req.params;
            const event = await matterEventService.getEvent(lawyerId, matterId, eventId);
            res.status(200).json({ success: true, data: event });
        }
        catch (error) {
            next(error);
        }
    }
    async updateEvent(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId, eventId } = req.params;
            const event = await matterEventService.updateEvent(lawyerId, matterId, eventId, req.body);
            res.status(200).json({ success: true, data: event });
        }
        catch (error) {
            next(error);
        }
    }
    async completeEvent(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId, eventId } = req.params;
            const result = await matterEventService.completeEvent(lawyerId, matterId, eventId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteEvent(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId, eventId } = req.params;
            const result = await matterEventService.deleteEvent(lawyerId, matterId, eventId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getUpcomingDeadlines(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { daysAhead } = req.query;
            const deadlines = await matterEventService.getUpcomingDeadlines(lawyerId, daysAhead ? parseInt(daysAhead) : 30);
            res.status(200).json({ success: true, data: deadlines });
        }
        catch (error) {
            next(error);
        }
    }
}
export default new MatterEventController();
//# sourceMappingURL=matter-event.controller.js.map