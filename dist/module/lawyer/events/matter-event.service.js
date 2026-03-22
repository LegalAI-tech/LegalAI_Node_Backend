import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
class MatterEventService {
    async createEvent(lawyerId, matterId, input) {
        await this.verifyMatterOwnership(lawyerId, matterId);
        const { title, eventDate, isDeadline = false, reminderDays = [], notes } = input;
        if (!title || title.trim().length < 2) {
            throw new AppError('Event title must be at least 2 characters.', 400, 'INVALID_TITLE');
        }
        const parsedDate = new Date(eventDate);
        if (isNaN(parsedDate.getTime())) {
            throw new AppError('Invalid event date.', 400, 'INVALID_DATE');
        }
        const cleanReminderDays = [...new Set(reminderDays)]
            .filter(d => Number.isInteger(d) && d > 0)
            .sort((a, b) => b - a);
        const event = await prisma.matterEvent.create({
            data: {
                matterId,
                title: title.trim(),
                eventDate: parsedDate,
                isDeadline,
                reminderDays: cleanReminderDays,
                notes: notes?.trim() || null,
                status: 'PENDING',
                remindersSent: [],
            },
        });
        logger.info('MatterEvent created', { lawyerId, matterId, eventId: event.id, isDeadline });
        return event;
    }
    async listEvents(lawyerId, matterId, query) {
        await this.verifyMatterOwnership(lawyerId, matterId);
        const { status, isDeadline, upcoming } = query;
        const where = { matterId };
        if (status)
            where.status = status;
        if (isDeadline !== undefined)
            where.isDeadline = isDeadline;
        if (upcoming) {
            where.eventDate = { gte: new Date() };
        }
        const events = await prisma.matterEvent.findMany({
            where,
            orderBy: { eventDate: 'asc' },
        });
        return events.map(e => this.formatEvent(e));
    }
    async getEvent(lawyerId, matterId, eventId) {
        await this.verifyMatterOwnership(lawyerId, matterId);
        const event = await prisma.matterEvent.findFirst({
            where: { id: eventId, matterId },
        });
        if (!event) {
            throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
        }
        return this.formatEvent(event);
    }
    async updateEvent(lawyerId, matterId, eventId, input) {
        await this.verifyMatterOwnership(lawyerId, matterId);
        const existing = await prisma.matterEvent.findFirst({
            where: { id: eventId, matterId },
        });
        if (!existing) {
            throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
        }
        let parsedDate;
        if (input.eventDate) {
            parsedDate = new Date(input.eventDate);
            if (isNaN(parsedDate.getTime())) {
                throw new AppError('Invalid event date.', 400, 'INVALID_DATE');
            }
        }
        let cleanReminderDays;
        if (input.reminderDays) {
            cleanReminderDays = [...new Set(input.reminderDays)]
                .filter(d => Number.isInteger(d) && d > 0)
                .sort((a, b) => b - a);
        }
        const updated = await prisma.matterEvent.update({
            where: { id: eventId },
            data: {
                ...(input.title && { title: input.title.trim() }),
                ...(parsedDate && { eventDate: parsedDate }),
                ...(input.isDeadline !== undefined && { isDeadline: input.isDeadline }),
                ...(cleanReminderDays !== undefined && { reminderDays: cleanReminderDays }),
                ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
                ...(input.status && {
                    status: input.status,
                    completedAt: input.status === 'COMPLETED' ? new Date() : existing.completedAt,
                }),
            },
        });
        logger.info('MatterEvent updated', { lawyerId, matterId, eventId });
        return this.formatEvent(updated);
    }
    async completeEvent(lawyerId, matterId, eventId) {
        await this.verifyMatterOwnership(lawyerId, matterId);
        const existing = await prisma.matterEvent.findFirst({
            where: { id: eventId, matterId },
        });
        if (!existing) {
            throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
        }
        if (existing.status === 'COMPLETED') {
            return { message: 'Event is already marked as completed.' };
        }
        const updated = await prisma.matterEvent.update({
            where: { id: eventId },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });
        logger.info('MatterEvent completed', { lawyerId, matterId, eventId });
        return this.formatEvent(updated);
    }
    async deleteEvent(lawyerId, matterId, eventId) {
        await this.verifyMatterOwnership(lawyerId, matterId);
        const existing = await prisma.matterEvent.findFirst({
            where: { id: eventId, matterId },
        });
        if (!existing) {
            throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
        }
        await prisma.matterEvent.delete({ where: { id: eventId } });
        logger.info('MatterEvent deleted', { lawyerId, matterId, eventId });
        return { message: 'Event deleted successfully.' };
    }
    async getUpcomingDeadlines(lawyerId, daysAhead = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + daysAhead);
        const events = await prisma.matterEvent.findMany({
            where: {
                matter: { lawyerId },
                isDeadline: true,
                status: 'PENDING',
                eventDate: {
                    gte: new Date(),
                    lte: cutoff,
                },
            },
            orderBy: { eventDate: 'asc' },
            include: {
                matter: {
                    select: { id: true, title: true, caseNumber: true, court: true },
                },
            },
        });
        return events.map(e => ({
            ...this.formatEvent(e),
            matter: e.matter,
        }));
    }
    async verifyMatterOwnership(lawyerId, matterId) {
        const matter = await prisma.matter.findFirst({
            where: { id: matterId, lawyerId },
            select: { id: true },
        });
        if (!matter) {
            throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
        }
    }
    formatEvent(event) {
        const now = new Date();
        const eventDate = new Date(event.eventDate);
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysRemaining = Math.ceil((eventDate.getTime() - now.getTime()) / msPerDay);
        return {
            id: event.id,
            matterId: event.matterId,
            title: event.title,
            eventDate: event.eventDate,
            isDeadline: event.isDeadline,
            reminderDays: event.reminderDays,
            notes: event.notes,
            status: event.status,
            completedAt: event.completedAt,
            remindersSent: event.remindersSent,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            daysRemaining: event.status === 'PENDING' ? daysRemaining : null,
            isOverdue: event.status === 'PENDING' && daysRemaining < 0,
            isUrgent: event.status === 'PENDING' && daysRemaining >= 0 && daysRemaining <= 3,
        };
    }
}
export default new MatterEventService();
//# sourceMappingURL=matter-event.service.js.map