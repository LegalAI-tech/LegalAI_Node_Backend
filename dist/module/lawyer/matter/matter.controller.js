import matterService from './matter.service.js';
class MatterController {
    async createMatter(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const matter = await matterService.createMatter(lawyerId, req.body);
            res.status(201).json({ success: true, data: matter });
        }
        catch (error) {
            next(error);
        }
    }
    async listMatters(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { stage, practiceArea, search, page, limit } = req.query;
            const result = await matterService.listMatters(lawyerId, {
                stage,
                practiceArea,
                search,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getMatter(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId } = req.params;
            const matter = await matterService.getMatter(lawyerId, matterId);
            res.status(200).json({ success: true, data: matter });
        }
        catch (error) {
            next(error);
        }
    }
    async updateMatter(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId } = req.params;
            const matter = await matterService.updateMatter(lawyerId, matterId, req.body);
            res.status(200).json({ success: true, data: matter });
        }
        catch (error) {
            next(error);
        }
    }
    async archiveMatter(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId } = req.params;
            const result = await matterService.archiveMatter(lawyerId, matterId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
export default new MatterController();
//# sourceMappingURL=matter.controller.js.map