// Sent with every matter document upload; the reply becomes the document's AI summary
export const DOCUMENT_INDEXING_PROMPT =
  'Please analyse and index this legal document. Provide a brief summary of its key contents.';

// Question used when a document is uploaded to the agent without one
export const DEFAULT_DOCUMENT_QUESTION = 'Please analyze this document';
