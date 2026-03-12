'use server';

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PDFName, PDFArray, PDFString } from 'pdf-lib';

/**
 * Represents a file attachment uploaded with a form submission.
 */
export interface FileAttachment {
    name: string;
    url: string;
    size?: number;
    type?: string;
    path?: string;
    uploadedAt?: string;
}

/**
 * Configuration for generating a submission PDF.
 */
export interface SubmissionPdfConfig {
    title: string;
    surveyId: string;
    submittedAt: Date;
    data: Record<string, any>;
    fieldLabels?: Record<string, string>; // Optional map of fieldId -> human-readable label
}

/**
 * Check if a value is a file attachment array.
 */
function isFileAttachmentArray(value: any): value is FileAttachment[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        'url' in value[0] &&
        'name' in value[0]
    );
}

import { getQuestionText, formatAnswerValue } from './question-mapping';
import { extractName } from './submission-utils';

/**
 * Format a field value for PDF display using the centralized formatting utility.
 */
function formatValueForPdf(value: any): string {
    const formatted = formatAnswerValue(value);
    if (Array.isArray(formatted)) {
        return formatted.join('\n');
    }
    return formatted === 'N/A' ? '' : formatted;
}

/**
 * Helper to extract field labels from survey data
 */
export async function extractFieldLabels(surveyData: any): Promise<Record<string, string>> {
    const labels: Record<string, string> = {};
    if (surveyData?.sections) {
        for (const section of surveyData.sections) {
            for (const field of section.fields || []) {
                if (field.id && field.label) {
                    labels[field.id] = field.label;
                }
                if (field.type === 'group' && field.fields) {
                    for (const subField of field.fields) {
                        if (subField.id && subField.label) {
                            labels[subField.id] = subField.label;
                        }
                    }
                }
            }
        }
    }
    return labels;
}

/**
 * Helper to extract field order from survey data
 */
export async function extractFieldOrder(surveyData: any): Promise<string[]> {
    const order: string[] = [];
    if (surveyData?.sections) {
        for (const section of surveyData.sections) {
            for (const field of section.fields || []) {
                if (field.id) {
                    order.push(field.id);
                }
                if (field.type === 'group' && field.fields) {
                    for (const subField of field.fields) {
                        if (subField.id) {
                            order.push(subField.id);
                        }
                    }
                }
            }
        }
    }
    return order;
}


/**
 * Sanitize text to remove characters unsupported by WinAnsi encoding (standard PDF fonts)
 */
function sanitizeText(text: string): string {
    if (!text) return '';
    return String(text)
        .replace(/\t/g, '    ') // Convert tabs to spaces
        .replace(/\r/g, '')     // Remove carriage returns
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove unprintable control characters
        .replace(/[^\x00-\xFF]/g, '?'); // Replace non-Latin-1 chars
}

/**
 * Draw wrapped text on a PDF page and return the new Y position.
 */
function drawWrappedText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font: PDFFont,
    size: number,
    lineHeight: number,
    color = rgb(0, 0, 0)
): number {
    const safeText = sanitizeText(text);
    const paragraphs = safeText.split('\n');
    let cursorY = y;

    for (const paragraph of paragraphs) {
        if (!paragraph.trim() && paragraph.length === 0) {
            continue;
        }

        const words = paragraph.split(' ');
        let line = '';

        for (const word of words) {
            const testLine = line ? `${line} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, size);

            if (testWidth > maxWidth && line) {
                page.drawText(line, { x, y: cursorY, size, font, color });
                cursorY -= lineHeight;
                line = word;
            } else {
                line = testLine;
            }
        }

        if (line) {
            page.drawText(line, { x, y: cursorY, size, font, color });
            cursorY -= lineHeight;
        }
    }

    return cursorY;
}

/**
 * Generate a PDF for a form submission.
 * Returns the PDF as a Uint8Array (or null on error).
 */
export async function generateSubmissionPdf(
    config: SubmissionPdfConfig
): Promise<Uint8Array | null> {
    try {
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

        const pageWidth = 612;
        const pageHeight = 792;
        const margin = 50;
        const maxTextWidth = pageWidth - margin * 2;
        const lineHeight = 14;

        // Safely convert submittedAt to Date (handles Firestore Timestamps)
        let submittedAtDate: Date;
        try {
            if (config.submittedAt && typeof (config.submittedAt as any).toDate === 'function') {
                // Firestore Timestamp
                submittedAtDate = (config.submittedAt as any).toDate();
            } else if (config.submittedAt instanceof Date) {
                submittedAtDate = config.submittedAt;
            } else if (typeof config.submittedAt === 'string' || typeof config.submittedAt === 'number') {
                submittedAtDate = new Date(config.submittedAt);
            } else {
                submittedAtDate = new Date();
            }
        } catch (e) {
            console.warn('[generateSubmissionPdf] Failed to parse submittedAt, using current date:', e);
            submittedAtDate = new Date();
        }

        console.log(`[generateSubmissionPdf] Starting PDF generation for: ${config.title}`);

        let page = doc.addPage([pageWidth, pageHeight]);
        let cursorY = pageHeight - margin;

        // Title
        const title = sanitizeText(config.title || 'Form Submission');
        cursorY = drawWrappedText(
            page,
            title,
            margin,
            cursorY,
            maxTextWidth,
            boldFont,
            18,
            24,
            rgb(0.1, 0.1, 0.1)
        );
        cursorY -= 7;

        // Survey ID, Patient & Submission Date
        const patientName = extractName(config.data);
        if (patientName) {
            cursorY = drawWrappedText(
                page,
                `Patient: ${patientName}`,
                margin,
                cursorY,
                maxTextWidth,
                boldFont,
                11,
                14,
                rgb(0.2, 0.2, 0.2)
            );
            cursorY -= 4;
        }

        page.drawText(`Survey ID: ${config.surveyId}`, {
            x: margin,
            y: cursorY,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
        });
        cursorY -= 14;

        page.drawText(`Submitted: ${submittedAtDate.toLocaleString()}`, {
            x: margin,
            y: cursorY,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
        });
        cursorY -= 25;

        // Separator line
        page.drawLine({
            start: { x: margin, y: cursorY },
            end: { x: pageWidth - margin, y: cursorY },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });
        cursorY -= 20;

        // Collect file attachments for a separate section
        const fileAttachments: { label: string; files: FileAttachment[] }[] = [];

        // Render form data
        for (const [key, value] of Object.entries(config.data)) {
            // Skip internal fields
            if (key === 'surveyId' || key === 'sessionId' || key === 'submittedAt') {
                continue;
            }

            // Check if we need a new page
            if (cursorY < margin + 60) {
                page = doc.addPage([pageWidth, pageHeight]);
                cursorY = pageHeight - margin;
            }

            const label = config.fieldLabels?.[key] || getQuestionText(key);

            // Handle file attachments separately
            if (isFileAttachmentArray(value)) {
                fileAttachments.push({ label, files: value });
                continue;
            }

            // Handle single file upload objects
            if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'url' in value && 'name' in value) {
                fileAttachments.push({ label, files: [value as FileAttachment] });
                continue;
            }

            const formattedValue = formatValueForPdf(value);
            if (!formattedValue && formattedValue !== '0') continue; // Skip empty values

            // Draw field label
            cursorY = drawWrappedText(
                page,
                `${label}:`,
                margin,
                cursorY,
                maxTextWidth,
                boldFont,
                11,
                14,
                rgb(0.2, 0.2, 0.2)
            );
            cursorY -= 2;

            // Draw field value with wrapping
            cursorY = drawWrappedText(
                page,
                formattedValue,
                margin + 10,
                cursorY,
                maxTextWidth - 10,
                font,
                10,
                12,
                rgb(0.3, 0.3, 0.3)
            );
            cursorY -= 10; // Spacing between fields
        }

        // Render file attachments section (if any)
        if (fileAttachments.length > 0) {
            // Check if we need a new page
            if (cursorY < margin + 80) {
                page = doc.addPage([pageWidth, pageHeight]);
                cursorY = pageHeight - margin;
            }

            cursorY -= 10;
            page.drawText('File Attachments', {
                x: margin,
                y: cursorY,
                size: 14,
                font: boldFont,
                color: rgb(0.1, 0.4, 0.7),
            });
            cursorY -= 20;

            for (const { label, files } of fileAttachments) {
                if (cursorY < margin + 40) {
                    page = doc.addPage([pageWidth, pageHeight]);
                    cursorY = pageHeight - margin;
                }

                cursorY = drawWrappedText(
                    page,
                    `${label}:`,
                    margin,
                    cursorY,
                    maxTextWidth,
                    boldFont,
                    11,
                    14,
                    rgb(0.2, 0.2, 0.2)
                );
                cursorY -= 2;

                for (const file of files) {
                    if (cursorY < margin + 20) {
                        page = doc.addPage([pageWidth, pageHeight]);
                        cursorY = pageHeight - margin;
                    }

                    // Draw file name as a link annotation
                    const linkText = sanitizeText(`[File] ${file.name}`);
                    const linkWidth = font.widthOfTextAtSize(linkText, 10);

                    page.drawText(linkText, {
                        x: margin + 10,
                        y: cursorY,
                        size: 10,
                        font,
                        color: rgb(0, 0.4, 0.8),
                    });

                    // Add link annotation for clickable URL
                    try {
                        const linkAnnotation = doc.context.obj({
                            Type: 'Annot',
                            Subtype: 'Link',
                            Rect: [margin + 10, cursorY - 2, margin + 10 + linkWidth, cursorY + 10],
                            Border: [0, 0, 0],
                            A: {
                                Type: 'Action',
                                S: 'URI',
                                URI: PDFString.of(file.url),
                            },
                        });

                        const linkRef = doc.context.register(linkAnnotation);
                        const annotsKey = PDFName.of('Annots');
                        
                        // Carefully pull out the array, resolving potential references
                        let annots = page.node.lookupMaybe(annotsKey, PDFArray);
                        if (!annots) {
                            annots = doc.context.obj([]);
                            page.node.set(annotsKey, annots);
                        }
                        annots.push(linkRef);
                    } catch (annotError) {
                        // Link annotation failed — file text is still rendered, just not clickable
                        console.warn('[generateSubmissionPdf] Link annotation failed for file:', file.name, annotError);
                    }

                    cursorY -= 14;
                }
                cursorY -= 8;
            }
        }

        // Footer
        const totalPages = doc.getPageCount();
        for (let i = 0; i < totalPages; i++) {
            const p = doc.getPage(i);
            p.drawText(`Page ${i + 1} of ${totalPages}`, {
                x: pageWidth - margin - 60,
                y: 30,
                size: 8,
                font,
                color: rgb(0.6, 0.6, 0.6),
            });
        }

        const pdfBytes = await doc.save();
        console.log(`[generateSubmissionPdf] PDF created successfully: ${pdfBytes.length} bytes`);
        return pdfBytes;
    } catch (error) {
        console.error('[generateSubmissionPdf] Error generating submission PDF:', error);
        if (error instanceof Error) {
            console.error('[generateSubmissionPdf] Error stack:', error.stack);
        }
        return null;
    }
}
