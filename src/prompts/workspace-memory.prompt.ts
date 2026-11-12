export interface MemoryRegenerationInput {
  memory: {
    partySummary?: string | null;
    legalIssues?: string | null;
    factChronology?: string | null;
    lawyerNotes?: string | null;
  };
  // One line per indexed document and recent message, already formatted
  docContext: string;
  convContext: string;
}

/** Asks for a fresh AI summary of a matter from its memory, documents and recent chats. */
export function buildMemoryRegenerationPrompt({
  memory: currentMemory,
  docContext,
  convContext,
}: MemoryRegenerationInput): string {
  return `
      You are a legal AI assistant updating the workspace memory for a legal matter.

      CURRENT WORKSPACE MEMORY:
      - Parties: ${currentMemory.partySummary || 'Not set'}
      - Legal Issues: ${currentMemory.legalIssues || 'Not set'}
      - Fact Chronology: ${currentMemory.factChronology || 'Not set'}
      - Lawyer Notes: ${currentMemory.lawyerNotes || 'Not set'}

      RECENT DOCUMENTS:
      ${docContext || 'No documents yet.'}

      RECENT CONVERSATIONS:
      ${convContext || 'No conversations yet.'}

      Based on all of the above, write a concise, structured AI summary of this legal matter (max 400 words).
      Cover: key parties, core legal issues, current stage, and important next steps if apparent.
      `.trim();
}
