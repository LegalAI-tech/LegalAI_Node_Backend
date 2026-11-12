import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService, { pythonCaller } from '../../../services/python-backend.service.js';
import { buildClientCommsPrompt } from '../../../prompts/client-comms.prompt.js';
import workspaceMemoryService from '../workspace/workspace-memory.service.js';


export type CommsFormat = 'whatsapp' | 'email' | 'voice_note' | 'all';

export interface GenerateCommsInput {
  matterId: string;
  eventContext: string;        
  clientName: string;          
  format?: CommsFormat;        
  language?: string;           
  outputLanguage?: string;
  additionalContext?: string;  
}


class ClientCommsService {
 
  async generate(lawyerId: string, input: GenerateCommsInput) {
    const { matterId, format = 'all', language, outputLanguage } = input;

    
    const matter = await prisma.matter.findFirst({
      where: { id: matterId, lawyerId },
      include: { memory: true },
    });

    if (!matter) {
      throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
    }

    const workspaceContext = this.buildContextString(matter.memory);

    let workspaceMemoryPayload: Record<string, any> | undefined;
    if (matter.memory) {
      workspaceMemoryPayload = workspaceMemoryService.buildPayload(matter.memory);
    }

    const prompt = buildClientCommsPrompt(input, matter.title, workspaceContext);

    let result: any;
    try {
      result = await pythonBackendService.lawyerAgentChat(pythonCaller.lawyer(lawyerId, matterId), {
        query: prompt,
        matterId,
        workspaceMemory: workspaceMemoryPayload,
        conversationType: 'client_comms_generation',
        outputLanguage: outputLanguage ?? language,
      });
    } catch (err: any) {
      logger.error('Client comms generation failed', { lawyerId, matterId, error: err?.message });
      throw new AppError(
        'The AI service encountered an error generating communications. Please try again.',
        502,
        'AI_SERVICE_ERROR'
      );
    }

    const rawOutput: string = result.response ?? '';

    const parsed = this.parseFormats(rawOutput, format);

    logger.info('Client comms generated', {
      lawyerId,
      matterId,
      format,
      formatsGenerated: Object.keys(parsed).length,
    });

    return {
      matterId,
      matterTitle: matter.title,
      clientName: input.clientName,
      format,
      rawOutput,
      ...parsed,
    };
  }

  private buildContextString(memory: any): string {
    if (!memory) return '';

    const parts: string[] = [];

    if (memory.partySummary) parts.push(`Parties: ${memory.partySummary}`);
    if (memory.legalIssues) parts.push(`Legal issues: ${memory.legalIssues}`);
    if (memory.aiSummary) parts.push(`Case summary: ${memory.aiSummary}`);

    if (memory.keyDates && Array.isArray(memory.keyDates) && memory.keyDates.length > 0) {
      const dates = (memory.keyDates as any[])
        .slice(0, 3)
        .map((d: any) => `${d.label}: ${d.date}`)
        .join(', ');
      parts.push(`Key dates: ${dates}`);
    }

    return parts.join('\n');
  }


  private parseFormats(
    text: string,
    format: CommsFormat
  ): {
    whatsapp?: string;
    emailSubject?: string;
    emailBody?: string;
    voiceNote?: string;
  } {
    if (!text) return {};

    const result: {
      whatsapp?: string;
      emailSubject?: string;
      emailBody?: string;
      voiceNote?: string;
    } = {};

    const extract = (heading: string): string | undefined => {
      const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
      const match = text.match(regex);
      return match?.[1]?.trim();
    };

    if (format === 'all' || format === 'whatsapp') {
      result.whatsapp = extract('WHATSAPP MESSAGE');
    }

    if (format === 'all' || format === 'email') {
      result.emailSubject = extract('EMAIL SUBJECT');
      result.emailBody = extract('EMAIL BODY');
    }

    if (format === 'all' || format === 'voice_note') {
      result.voiceNote = extract('VOICE NOTE SCRIPT');
    }

    const hasAnyContent = Object.values(result).some(v => v && v.length > 0);
    if (!hasAnyContent && text) {
      if (format === 'whatsapp') result.whatsapp = text;
      else if (format === 'email') result.emailBody = text;
      else if (format === 'voice_note') result.voiceNote = text;
    }

    return result;
  }
}

export default new ClientCommsService();