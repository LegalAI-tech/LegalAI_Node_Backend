import type { CaseLawSearchInput, SearchMode } from '../module/lawyer/research/case-law.service.js';

/**
 * Case-law research instructions for one search mode. The reply must be the JSON
 * object described in the prompt (summary, cases, statutory framework, current position).
 */
export function buildCaseLawPrompt(input: CaseLawSearchInput): string {
  const { query, searchMode = 'general', jurisdiction = 'all' } = input;

  const jurisdictionClause =
    jurisdiction === 'all'
      ? 'across Supreme Court of India and all High Courts'
      : `from the ${jurisdiction}`;

  const jsonSchema = `
Return ONLY a valid JSON object in this exact shape — no markdown, no preamble, no explanation outside the JSON:
{
  "summary": "A 2-3 sentence overview of the legal position on this query.",
  "cases": [
    {
      "caseName": "Full case name e.g. Mohori Bibee v. Dharmodas Ghose",
      "citation": "Full citation e.g. (1903) 30 IA 114 or AIR 1963 SC 1 or (2022) 5 SCC 123",
      "court": "Supreme Court of India | Delhi High Court | Bombay High Court | etc.",
      "year": "4-digit year",
      "ratio": "The binding legal principle or ratio decidendi in 1-3 sentences.",
      "keyObservations": "Specific paragraphs, head-notes, or judicial observations directly relevant to the query. Quote briefly if needed.",
      "applicability": "How this case directly applies to the stated query or fact pattern. 1-2 sentences."
    }
  ],
  "statutoryFramework": "Relevant Indian statutes and sections, if any.",
  "currentLegalPosition": "1-2 sentences on the present settled position."
}`.trim();

  const modeContext: Record<SearchMode, string> = {
    fact_pattern: `You are an Indian legal research assistant. Find case law ${jurisdictionClause} matching this fact pattern: "${query}". Prioritise cases with similar facts. Note any cases that directly address partial payments, acknowledgements, or procedural variations as applicable.`,
    issue_specific: `You are an Indian legal research assistant. Find authoritative case law ${jurisdictionClause} on this legal issue: "${query}". Prioritise Supreme Court decisions. Note if any cases overrule prior precedents.`,
    statute: `You are an Indian legal research assistant. Explain the statutory provision and find leading interpretive cases ${jurisdictionClause}: "${query}". Include the exact provision text in the summary.`,
    general: `You are an Indian legal research assistant. Research the following query using Indian case law and statutes ${jurisdictionClause}: "${query}".`,
  };

  return `${modeContext[searchMode]}

${jsonSchema}

Include 3 to 6 of the most relevant cases. If fewer than 3 exist, include all available.
Do not include any text outside the JSON object.`;
}
