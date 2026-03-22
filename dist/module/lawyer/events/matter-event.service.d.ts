export interface CreateEventInput {
    title: string;
    eventDate: string;
    isDeadline?: boolean;
    reminderDays?: number[];
    notes?: string;
}
export interface UpdateEventInput {
    title?: string;
    eventDate?: string;
    isDeadline?: boolean;
    reminderDays?: number[];
    notes?: string;
    status?: 'PENDING' | 'COMPLETED' | 'MISSED';
}
export interface ListEventsQuery {
    status?: 'PENDING' | 'COMPLETED' | 'MISSED';
    isDeadline?: boolean;
    upcoming?: boolean;
}
declare class MatterEventService {
    createEvent(lawyerId: string, matterId: string, input: CreateEventInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: import("@prisma/client").$Enums.EventStatus;
        notes: string | null;
        matterId: string;
        eventDate: Date;
        isDeadline: boolean;
        reminderDays: number[];
        completedAt: Date | null;
        remindersSent: number[];
    }>;
    listEvents(lawyerId: string, matterId: string, query: ListEventsQuery): Promise<{
        id: any;
        matterId: any;
        title: any;
        eventDate: any;
        isDeadline: any;
        reminderDays: any;
        notes: any;
        status: any;
        completedAt: any;
        remindersSent: any;
        createdAt: any;
        updatedAt: any;
        daysRemaining: number | null;
        isOverdue: boolean;
        isUrgent: boolean;
    }[]>;
    getEvent(lawyerId: string, matterId: string, eventId: string): Promise<{
        id: any;
        matterId: any;
        title: any;
        eventDate: any;
        isDeadline: any;
        reminderDays: any;
        notes: any;
        status: any;
        completedAt: any;
        remindersSent: any;
        createdAt: any;
        updatedAt: any;
        daysRemaining: number | null;
        isOverdue: boolean;
        isUrgent: boolean;
    }>;
    updateEvent(lawyerId: string, matterId: string, eventId: string, input: UpdateEventInput): Promise<{
        id: any;
        matterId: any;
        title: any;
        eventDate: any;
        isDeadline: any;
        reminderDays: any;
        notes: any;
        status: any;
        completedAt: any;
        remindersSent: any;
        createdAt: any;
        updatedAt: any;
        daysRemaining: number | null;
        isOverdue: boolean;
        isUrgent: boolean;
    }>;
    completeEvent(lawyerId: string, matterId: string, eventId: string): Promise<{
        id: any;
        matterId: any;
        title: any;
        eventDate: any;
        isDeadline: any;
        reminderDays: any;
        notes: any;
        status: any;
        completedAt: any;
        remindersSent: any;
        createdAt: any;
        updatedAt: any;
        daysRemaining: number | null;
        isOverdue: boolean;
        isUrgent: boolean;
    } | {
        message: string;
    }>;
    deleteEvent(lawyerId: string, matterId: string, eventId: string): Promise<{
        message: string;
    }>;
    getUpcomingDeadlines(lawyerId: string, daysAhead?: number): Promise<{
        matter: any;
        id: any;
        matterId: any;
        title: any;
        eventDate: any;
        isDeadline: any;
        reminderDays: any;
        notes: any;
        status: any;
        completedAt: any;
        remindersSent: any;
        createdAt: any;
        updatedAt: any;
        daysRemaining: number | null;
        isOverdue: boolean;
        isUrgent: boolean;
    }[]>;
    private verifyMatterOwnership;
    private formatEvent;
}
declare const _default: MatterEventService;
export default _default;
//# sourceMappingURL=matter-event.service.d.ts.map