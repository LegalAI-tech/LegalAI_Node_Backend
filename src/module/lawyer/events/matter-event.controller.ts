import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
import matterEventService from './matter-event.service.js';

class MatterEventController {

  async createEvent(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const matterId = req.params.matterId || req.body.matterId;
      
      if (!matterId) {
        return res.status(400).json({ success: false, message: 'matterId is required' });
      }

      const event = await matterEventService.createEvent(lawyerId, matterId, req.body);
      res.status(201).json({ success: true, data: event });
    } catch (error) { next(error); }
  }

  async listEvents(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const matterId = req.params.matterId || req.query.matterId as string;
      
      if (!matterId) {
        return res.status(400).json({ success: false, message: 'matterId is required' });
      }

      const { status, isDeadline, upcoming } = req.query as any;

      const events = await matterEventService.listEvents(lawyerId, matterId, {
        status,
        isDeadline: isDeadline !== undefined ? isDeadline === 'true' : undefined,
        upcoming: upcoming === 'true',
      });

      res.status(200).json({ success: true, data: events });
    } catch (error) { next(error); }
  }

  async getEvent(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const matterId = req.params.matterId || req.query.matterId as string || req.body.matterId;
      const { eventId } = req.params;
      
      if (!matterId) {
        return res.status(400).json({ success: false, message: 'matterId is required' });
      }

      const event = await matterEventService.getEvent(lawyerId, matterId, eventId!);
      res.status(200).json({ success: true, data: event });
    } catch (error) { next(error); }
  }

  async updateEvent(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const matterId = req.params.matterId || req.body.matterId || req.query.matterId as string;
      const { eventId } = req.params;
      
      if (!matterId) {
        return res.status(400).json({ success: false, message: 'matterId is required' });
      }

      const event = await matterEventService.updateEvent(lawyerId, matterId, eventId!, req.body);
      res.status(200).json({ success: true, data: event });
    } catch (error) { next(error); }
  }

  async completeEvent(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const matterId = req.params.matterId || req.body.matterId || req.query.matterId as string;
      const { eventId } = req.params;
      
      if (!matterId) {
        return res.status(400).json({ success: false, message: 'matterId is required' });
      }

      const result = await matterEventService.completeEvent(lawyerId, matterId, eventId!);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async deleteEvent(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const matterId = req.params.matterId || req.body.matterId || req.query.matterId as string;
      const { eventId } = req.params;
      
      if (!matterId) {
        return res.status(400).json({ success: false, message: 'matterId is required' });
      }

      const result = await matterEventService.deleteEvent(lawyerId, matterId, eventId!);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getUpcomingDeadlines(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const { daysAhead } = req.query;
      const parsedDays = daysAhead ? parseInt(daysAhead as string, 10) : undefined;

      const events = await matterEventService.getUpcomingDeadlines(lawyerId, parsedDays);
      res.status(200).json({ success: true, data: events });
    } catch (error) { next(error); }
  }
}

export default new MatterEventController();