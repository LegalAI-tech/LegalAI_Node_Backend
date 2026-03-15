import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import HTMLtoDOCX from 'html-to-docx';
import { marked } from 'marked';
function buildFullHtml(rawContent) {
    if (/<html[\s>]/i.test(rawContent))
        return rawContent;
    const looksLikeMarkdown = /\*\*[^*]+\*\*/.test(rawContent) ||
        /^#{1,4}\s/m.test(rawContent) ||
        /^[-*]\s/m.test(rawContent);
    let bodyHtml;
    if (looksLikeMarkdown) {
        marked.setOptions({
            gfm: true,
            breaks: true,
        });
        bodyHtml = marked.parse(rawContent);
    }
    else {
        bodyHtml = rawContent
            .split('\n')
            .map((line) => line.trim() ? `<p>${line}</p>` : '<p>&nbsp;</p>')
            .join('\n');
    }
    bodyHtml = bodyHtml.replace(/\[([A-Z][A-Z0-9 :_/\-]{1,60})\]/g, '<span class="placeholder">[$1]</span>');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    /* ── Page setup ── */
    @page { margin: 25mm 20mm; }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #000;
      background: #fff;
      max-width: 210mm;
      margin: 0 auto;
      padding: 0 0 20mm 0;
    }

    /* ── Headings ── */
    h1 {
      font-size: 14pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 18pt 0 10pt;
    }
    h2 {
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
      margin: 14pt 0 6pt;
    }
    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin: 10pt 0 4pt;
    }
    h4 {
      font-size: 12pt;
      font-weight: bold;
      font-style: italic;
      margin: 8pt 0 4pt;
    }

    /* ── Body text ── */
    p {
      margin-bottom: 8pt;
      text-align: justify;
      text-indent: 0;
    }

    /* ── Inline bold from markdown **text** ── */
    strong {
      font-weight: bold;
    }

    /* ── Lists ── */
    ul, ol {
      margin: 6pt 0 6pt 24pt;
      padding: 0;
    }
    li {
      margin-bottom: 4pt;
      text-align: justify;
    }

    /* ── Numbered section headers that come through as bold paragraphs ──
       e.g. <p><strong>1. DEMAND:</strong></p>
       These get extra top margin so sections breathe. */
    p > strong:first-child {
      display: block;
      margin-top: 10pt;
    }

    /* ── Horizontal rules (--- in markdown) ── */
    hr {
      border: none;
      border-top: 1px solid #000;
      margin: 12pt 0;
    }

    /* ── Tables ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
      font-size: 11pt;
    }
    th, td {
      border: 1px solid #555;
      padding: 5pt 8pt;
      vertical-align: top;
      text-align: left;
    }
    th { background: #f2f2f2; font-weight: bold; }

    /* ── Unfilled placeholders ── */
    .placeholder {
      color: #cc0000;
      font-style: italic;
      font-family: "Courier New", monospace;
      font-size: 10pt;
      background: #fff8f8;
      border-radius: 2px;
      padding: 0 2px;
    }

    /* ── Signature / sign-off block ── */
    .signature { margin-top: 32pt; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
async function convertToPdf(htmlContent) {
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: true,
        defaultViewport: { width: 1280, height: 900 },
    });
    try {
        const page = await browser.newPage();
        await page.setContent(buildFullHtml(htmlContent), {
            waitUntil: 'networkidle0',
            timeout: 30_000,
        });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
            displayHeaderFooter: false,
        });
        return Buffer.from(pdf);
    }
    finally {
        await browser.close();
    }
}
async function convertToDocx(htmlContent) {
    const options = {
        table: { row: { cantSplit: true } },
        header: false,
        footer: false,
        pageSize: { width: 12240, height: 15840 },
        margins: {
            top: 1134,
            right: 1134,
            bottom: 1134,
            left: 1134,
        },
        font: 'Times New Roman',
        fontSize: 24,
        lineHeight: 276,
    };
    const docxBuffer = await HTMLtoDOCX(buildFullHtml(htmlContent), null, options);
    return Buffer.isBuffer(docxBuffer)
        ? docxBuffer
        : Buffer.from(docxBuffer);
}
function convertToTxt(htmlContent) {
    const text = htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return Buffer.from(text, 'utf-8');
}
class DocumentConverterService {
    /**
     * @param htmlContent
     * @param format
     * @returns            { buffer, mimeType, extension }
     */
    async convert(htmlContent, format) {
        switch (format) {
            case 'pdf': {
                const buffer = await convertToPdf(htmlContent);
                return { buffer, mimeType: 'application/pdf', extension: 'pdf' };
            }
            case 'docx': {
                const buffer = await convertToDocx(htmlContent);
                return {
                    buffer,
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    extension: 'docx',
                };
            }
            case 'txt': {
                const buffer = convertToTxt(htmlContent);
                return { buffer, mimeType: 'text/plain', extension: 'txt' };
            }
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    mimeTypeFor(format) {
        const map = {
            pdf: 'application/pdf',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            txt: 'text/plain',
        };
        return map[format];
    }
}
export default new DocumentConverterService();
//# sourceMappingURL=document-converter.js.map