'use server';

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

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
        return formatted.join(', ');
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
 * Sanitize text to remove characters unsupported by WinAnsi encoding (standard PDF fonts)
 */
function sanitizeText(text: string): string {
    // Replace characters outside the WinAnsi range (approx Latin-1) with '?'
    return text.replace(/[^\x00-\xFF]/g, '?');
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
    const words = safeText.split(' ');
    let line = '';
    let cursorY = y;

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

        let page = doc.addPage([pageWidth, pageHeight]);
        let cursorY = pageHeight - margin;

        // Title
        const title = sanitizeText(config.title || 'Form Submission');
        page.drawText(title, {
            x: margin,
            y: cursorY,
            size: 18,
            font: boldFont,
            color: rgb(0.1, 0.1, 0.1),
        });
        cursorY -= 25;

        // Survey ID, Patient & Submission Date
        const patientName = extractName(config.data);
        if (patientName) {
            page.drawText(`Patient: ${patientName}`, {
                x: margin,
                y: cursorY,
                size: 11,
                font: boldFont,
                color: rgb(0.2, 0.2, 0.2),
            });
            cursorY -= 16;
        }

        page.drawText(`Survey ID: ${config.surveyId}`, {
            x: margin,
            y: cursorY,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
        });
        cursorY -= 14;

        page.drawText(`Submitted: ${config.submittedAt.toLocaleString()}`, {
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

            const formattedValue = formatValueForPdf(value);
            if (!formattedValue && formattedValue !== '0') continue; // Skip empty values

            // Draw field label
            page.drawText(`${sanitizeText(label)}:`, {
                x: margin,
                y: cursorY,
                size: 11,
                font: boldFont,
                color: rgb(0.2, 0.2, 0.2),
            });
            cursorY -= lineHeight;

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

                page.drawText(`${sanitizeText(label)}:`, {
                    x: margin,
                    y: cursorY,
                    size: 11,
                    font: boldFont,
                    color: rgb(0.2, 0.2, 0.2),
                });
                cursorY -= lineHeight;

                for (const file of files) {
                    if (cursorY < margin + 20) {
                        page = doc.addPage([pageWidth, pageHeight]);
                        cursorY = pageHeight - margin;
                    }

                    // Draw file name as a link annotation
                    const linkText = `📎 ${sanitizeText(file.name)}`;
                    const linkWidth = font.widthOfTextAtSize(linkText, 10);

                    page.drawText(linkText, {
                        x: margin + 10,
                        y: cursorY,
                        size: 10,
                        font,
                        color: rgb(0, 0.4, 0.8),
                    });

                    // Add link annotation for clickable URL
                    const linkAnnotation = doc.context.obj({
                        Type: 'Annot',
                        Subtype: 'Link',
                        Rect: [margin + 10, cursorY - 2, margin + 10 + linkWidth, cursorY + 10],
                        Border: [0, 0, 0],
                        A: {
                            Type: 'Action',
                            S: 'URI',
                            URI: file.url,
                        },
                    });

                    const linkRef = doc.context.register(linkAnnotation);
                    const existingAnnots = page.node.get(doc.context.obj('Annots'));
                    if (existingAnnots) {
                        (existingAnnots as any).push(linkRef);
                    } else {
                        page.node.set(doc.context.obj('Annots'), doc.context.obj([linkRef]));
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

        return await doc.save();
    } catch (error) {
        console.error('Error generating submission PDF:', error);
        return null;
    }
}
