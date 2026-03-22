import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
import workspaceMemoryService from './workspace-memory.service.js';

class WorkspaceMemoryController {

  async getMemory(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const { matterId } = req.params;
      const memory = await workspaceMemoryService.getMemory(lawyerId, matterId!);
      res.status(200).json({ success: true, data: memory });
    } catch (error) { next(error); }
  }

  async updateMemory(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const { matterId } = req.params;
      const memory = await workspaceMemoryService.updateMemory(lawyerId, matterId!, req.body);
      res.status(200).json({ success: true, data: memory });
    } catch (error) { next(error); }
  }

  async regenerateMemory(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const { matterId } = req.params;
      workspaceMemoryService.regenerateAiSummary(lawyerId, matterId!).catch(() => {});

      res.status(202).json({
        success: true,
        message: 'AI summary regeneration started. Refresh in a few seconds.',
      });
    } catch (error) { next(error); }
  }
}

export default new WorkspaceMemoryController();