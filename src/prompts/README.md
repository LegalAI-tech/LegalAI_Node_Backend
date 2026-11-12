# Prompts

Every prompt the Node backend sends to the Python AI service, one file per feature,
so wording can be reviewed and changed without touching service code.

| File | Used by | What it asks for |
|---|---|---|
| `contract-review.prompt.ts` | `contract-review.service.ts` | Clause-by-clause review (professional) or plain-language explanation (client) |
| `case-law.prompt.ts` | `case-law.service.ts` | Case-law research as JSON, for one of four search modes |
| `client-comms.prompt.ts` | `client-comms.service.ts` | Client update as WhatsApp, email and/or voice-note script |
| `workspace-memory.prompt.ts` | `workspace-memory.service.ts` | Fresh AI summary of a matter |
| `documents.prompt.ts` | `matter-document.service.ts`, `python-backend.service.ts` | Fixed instructions sent with document uploads |

Conventions:

- Prompts assembled from runtime values are `build*Prompt` functions; fixed ones are `UPPER_CASE` constants.
- Services parse some replies by their `##` headings or JSON shape. Change a prompt's output format together with its parser.
- The Python service has its own prompts in `prompts/` there; these are sent to it as the user query.
