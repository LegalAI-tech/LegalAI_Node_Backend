/**
 * One-off backfill: tell the Python backend who owns each matter document
 * uploaded before it tracked ownership, then store the stable document ID
 * it returns. Until this runs, those documents return "No content found".
 *
 * Run only after the Python deploy has finished re-indexing
 * (GET /health on the Python service shows reindexing_complete: true).
 *
 *   Dry run:  node dist/scripts/backfill-document-owners.js
 *   Apply:    node dist/scripts/backfill-document-owners.js --apply
 *   Locally:  npx dotenv -e .env -- npx tsx src/scripts/backfill-document-owners.ts [--apply]
 *
 * Citizen chat uploads cannot be backfilled: their storage URL was never saved.
 */
import prisma from '../config/database.js';
import pythonBackendService, { pythonCaller } from '../services/python-backend.service.js';
import type { DocumentOwnerAssignment } from '../types/python-backend.types.js';

const BATCH_SIZE = 100;

async function main() {
  const apply = process.argv.includes('--apply');

  const documents = await prisma.matterDocument.findMany({
    where: { fileUrl: { contains: '/uploads/' } },
    select: {
      id: true,
      title: true,
      originalName: true,
      fileUrl: true,
      vectorDocId: true,
      matterId: true,
      matter: { select: { lawyerId: true } },
    },
  });

  const unrecoverable = await prisma.conversation.count({ where: { documentId: { not: null } } });

  console.log(`Matter documents to backfill: ${documents.length}`);
  console.log(`Citizen conversations with an upload (cannot be backfilled): ${unrecoverable}`);

  if (!apply) {
    for (const doc of documents.slice(0, 10)) {
      console.log(`  ${doc.id}  lawyer:${doc.matter.lawyerId}  ${doc.fileUrl}`);
    }
    console.log('Dry run only. Re-run with --apply to write changes.');
    return;
  }

  const counts: Record<string, number> = {};

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);

    const assignments: DocumentOwnerAssignment[] = batch.map((doc) => ({
      storage_url: doc.fileUrl!,
      tenant_id: pythonCaller.lawyer(doc.matter.lawyerId).tenant!,
      matter_id: doc.matterId,
      legacy_document_id: doc.vectorDocId,
      file_name: doc.originalName ?? doc.title,
    }));

    const results = await pythonBackendService.assignDocumentOwners(assignments);

    for (const [index, result] of results.entries()) {
      const doc = batch[index]!;
      counts[result.status] = (counts[result.status] ?? 0) + 1;

      if (result.status !== 'assigned' || !result.document_id) {
        console.warn(`  ${result.status}: ${doc.id} (${result.detail ?? 'no detail'})`);
        continue;
      }

      if (result.chunks_updated === 0) {
        console.warn(`  ${doc.id}: owner recorded, but no indexed content found yet`);
      }

      await prisma.matterDocument.update({
        where: { id: doc.id },
        data: { vectorDocId: result.document_id },
      });
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, documents.length)} / ${documents.length}`);
  }

  console.log('Done:', counts);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error?.response?.data ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
