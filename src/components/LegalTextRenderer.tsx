import React from 'react';

/**
 * Legal Document Section Headers commonly found in Argentine judicial rulings.
 * These are detected and rendered with special styling.
 */
const SECTION_HEADERS = [
  'VISTOS',
  'VISTA',
  'RESULTA',
  'RESULTANDO',
  'CONSIDERANDO',
  'SE RESUELVE',
  'RESUELVE',
  'POR ELLO',
  'POR TANTO',
  'SENTENCIA',
  'FALLO',
  'Y VISTOS',
  'Y CONSIDERANDO',
  'AUTOS Y VISTOS',
  'EL TRIBUNAL RESUELVE',
  'LA CORTE RESUELVE',
  'EL JUZGADO RESUELVE',
  'POR LO EXPUESTO',
  'EN CONSECUENCIA',
  'FUNDAMENTOS',
  'ANTECEDENTES',
  'VOTO DEL',
  'VOTO DE LA',
  'DISIDENCIA',
  'A LA PRIMERA CUESTIÓN',
  'A LA SEGUNDA CUESTIÓN',
  'A LA TERCERA CUESTIÓN',
  'A LA CUARTA CUESTIÓN',
];

/** Pattern to match "Que," / numbered considerandos like "1°)" or "1)" or "I.-" */
const CONSIDERANDO_PATTERN = /^(\d+[°º]?\)?\.?-?\s|[IVXLC]+[°º]?[\.\)\-]\s|Que,?\s)/;

/** Detect if a line looks like a section header */
function isSectionHeader(line: string): boolean {
  const cleaned = line.trim().replace(/[:\.\-–—]+$/, '').trim().toUpperCase();
  return SECTION_HEADERS.some(h => cleaned === h || cleaned.startsWith(h + ' ') || cleaned.startsWith(h + ':'));
}

/** Detect if a line is a numbered considerando */
function isConsiderandoStart(line: string): boolean {
  return CONSIDERANDO_PATTERN.test(line.trim());
}

interface LegalSection {
  type: 'header' | 'paragraph' | 'considerando' | 'signature';
  content: string;
}

/**
 * Cleans and structures raw PDF text into legal document sections.
 * - Rejoins lines broken by PDF column extraction
 * - Detects section headers (VISTOS, CONSIDERANDO, etc.)
 * - Separates numbered considerandos
 * - Groups text into proper paragraphs
 */
function parseFullText(rawText: string): LegalSection[] {
  if (!rawText || typeof rawText !== 'string') return [];

  // Step 1: Normalize line endings and collapse excessive whitespace
  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ');

  // Step 2: Rejoin lines broken mid-sentence by PDF extraction.
  // If a line ends with a lowercase letter/comma and the next starts lowercase, join them.
  text = text.replace(/([a-záéíóúñü,;])\n([a-záéíóúñü])/g, '$1 $2');

  // Step 3: Split into raw lines
  const rawLines = text.split('\n');
  const sections: LegalSection[] = [];
  let currentParagraph = '';

  const flushParagraph = () => {
    const trimmed = currentParagraph.trim();
    if (trimmed) {
      sections.push({ type: 'paragraph', content: trimmed });
    }
    currentParagraph = '';
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Skip empty lines — they mark paragraph boundaries
    if (!line) {
      flushParagraph();
      continue;
    }

    // Check if this line is a section header (VISTOS:, CONSIDERANDO:, etc.)
    if (isSectionHeader(line)) {
      flushParagraph();
      sections.push({ type: 'header', content: line.replace(/[:\-–—]+$/, '').trim() });
      continue;
    }

    // Check if this is a numbered considerando (1°, I.-, etc.)
    if (isConsiderandoStart(line)) {
      flushParagraph();
      currentParagraph = line;
      continue;
    }

    // Check if it looks like a signature block (short lines at the end, contains "Dr." or "//")
    if (line.startsWith('//') || line.startsWith('FDO') || line.startsWith('Fdo')) {
      flushParagraph();
      sections.push({ type: 'signature', content: line });
      continue;
    }

    // Otherwise, accumulate into current paragraph
    if (currentParagraph) {
      currentParagraph += ' ' + line;
    } else {
      currentParagraph = line;
    }
  }

  flushParagraph();
  return sections;
}

interface LegalTextRendererProps {
  text: string;
}

/**
 * Renders a legal document (sentencia) with proper formatting:
 * - Section headers are styled prominently
 * - Paragraphs have proper spacing and indentation
 * - Numbered considerandos are visually distinct
 * - Full justification with elegant serif typography
 */
export function LegalTextRenderer({ text }: LegalTextRendererProps) {
  const sections = parseFullText(text);

  if (sections.length === 0) {
    return (
      <p className="text-stone-400 text-center py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Sin contenido para mostrar.
      </p>
    );
  }

  return (
    <div className="legal-text-body space-y-1">
      {sections.map((section, idx) => {
        switch (section.type) {
          case 'header':
            return (
              <div key={idx} className="mt-10 mb-5 first:mt-0">
                <h3
                  className="text-lg md:text-xl font-bold text-stone-900 uppercase tracking-wide border-b border-stone-300/50 pb-2"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {section.content}
                </h3>
              </div>
            );

          case 'considerando':
            return (
              <p
                key={idx}
                className="text-base md:text-[17px] text-stone-700 leading-[2] text-justify pl-6 border-l-2 border-indigo-200/60 my-4"
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  textIndent: '0',
                  wordSpacing: '0.03em',
                }}
              >
                {section.content}
              </p>
            );

          case 'signature':
            return (
              <p
                key={idx}
                className="text-sm text-stone-500 text-center mt-8 italic"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {section.content}
              </p>
            );

          case 'paragraph':
          default:
            return (
              <p
                key={idx}
                className="text-base md:text-[17px] text-stone-700 leading-[2] text-justify my-3"
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  textIndent: '2em',
                  wordSpacing: '0.03em',
                  letterSpacing: '0.01em',
                  hyphens: 'auto',
                }}
              >
                {section.content}
              </p>
            );
        }
      })}
    </div>
  );
}
