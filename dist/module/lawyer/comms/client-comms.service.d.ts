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
declare class ClientCommsService {
    generate(lawyerId: string, input: GenerateCommsInput): Promise<{
        whatsapp?: string;
        emailSubject?: string;
        emailBody?: string;
        voiceNote?: string;
        matterId: string;
        matterTitle: string;
        clientName: string;
        format: CommsFormat;
        rawOutput: string;
    }>;
    private buildContextString;
    private parseFormats;
}
declare const _default: ClientCommsService;
export default _default;
//# sourceMappingURL=client-comms.service.d.ts.map