import type { CommsFormat, GenerateCommsInput } from '../module/lawyer/comms/client-comms.service.js';

/**
 * Client update in one or all formats (WhatsApp, email, voice note), each under its
 * own `##` heading so the service can split them.
 */
export function buildClientCommsPrompt(
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
