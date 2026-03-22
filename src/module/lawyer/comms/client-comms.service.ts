import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService from '../../../services/python-backend.service.js';
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


function buildCommsPrompt(
  input: GenerateCommsInput,
  matterTitle: string,
  workspaceContext: string
): string {
  const { clientName, eventContext, additionalContext, format = 'all' } = input;

  const contextBlock = workspaceContext
    ? `\nMATTER CONTEXT:\n${workspaceContext}\n`
    : '';

  const extraBlock = additionalContext
    ? `\nADDITIONAL NOTES FROM LAWYER:\n${additionalContext}\n`
    : '';

  const formatInstructions: Record<CommsFormat, string> = {
    whatsapp: `
Generate ONLY a WhatsApp message for the client.
- Maximum 200 words
- Conversational, warm, and clear
- No legal jargon
- Start with a greeting using the client's name
- End with a clear next step or action item
- Use line breaks for readability (WhatsApp-friendly formatting)
Label the output clearly: ## WHATSAPP MESSAGE`,

    email: `
Generate ONLY an email for the client.
- Subject line included
- Professional but accessible tone
- 150–300 words
- Clear explanation of what happened and what comes next
- No legal jargon without explanation
- Close with next steps and lawyer's availability
Label clearly: ## EMAIL SUBJECT and ## EMAIL BODY`,

    voice_note: `
Generate ONLY a voice-note script the lawyer can record and send.
- Written as spoken language (not read-aloud text)
- 60–90 seconds when spoken at normal pace (~120-150 words)
- Natural, conversational, reassuring tone
- No legal abbreviations or case citations
- End with clear next steps
Label clearly: ## VOICE NOTE SCRIPT`,

    all: `
Generate ALL THREE formats below, each clearly labelled:

## WHATSAPP MESSAGE
(Max 200 words. Conversational, warm. No jargon. WhatsApp-friendly line breaks.)

## EMAIL SUBJECT
(One line subject)

## EMAIL BODY
(150-300 words. Professional but clear. Explain what happened and what's next.)

## VOICE NOTE SCRIPT
(60-90 seconds spoken. Natural language. Reassuring tone. Clear next steps.)`,
  };

  return `
You are a legal communication assistant helping an Indian lawyer communicate with their client.

CLIENT NAME: ${clientName}
MATTER: ${matterTitle}
${contextBlock}
WHAT HAPPENED / WHAT TO COMMUNICATE:
${eventContext}
${extraBlock}

INSTRUCTIONS:
${formatInstructions[format]}

Rules for ALL formats:
- Use plain, simple language the client can understand
- Be accurate about the facts but avoid alarming language
- Never make legal guarantees or predictions
- If the next hearing date or deadline is known, mention it
- Maintain the lawyer's professional but caring persona
`.trim();
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

    const prompt = buildCommsPrompt(input, matter.title, workspaceContext);

    let result: any;
    try {
      result = await pythonBackendService.lawyerAgentChat({
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