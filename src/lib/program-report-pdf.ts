import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ProgramReportData, ProgramReportSupportCounts } from '@/types/program-report';
import { PROGRAM_REPORT_SUPPORT_LABELS } from '@/types/program-report';

interface MetricRow {
    metric: string;
    value: string;
}

function sanitizeText(text: string): string {
    return text.replace(/[^\x00-\xFF]/g, '?');
}

function drawWrappedText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font: PDFFont,
    size: number,
    lineHeight: number
): { nextY: number; lines: number } {
    const words = sanitizeText(text).split(' ');
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, size) > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);

    let cursorY = y;
    for (const wrappedLine of lines) {
        page.drawText(wrappedLine, { x, y: cursorY, size, font, color: rgb(0.15, 0.15, 0.15) });
        cursorY -= lineHeight;
    }

    return { nextY: cursorY, lines: Math.max(lines.length, 1) };
}

function supportCountsToLines(s: ProgramReportSupportCounts): string {
    return PROGRAM_REPORT_SUPPORT_LABELS.map(({ key, label }) => `${label}: ${s[key]}`).join('\n');
}

function flattenReportRows(data: ProgramReportData): MetricRow[] {
    return [
        { metric: 'i. Total adult patients with SCD treated in the Hemoglobinopathy Clinic', value: String(data.section1.totalPatientsTreated.adult) },
        { metric: 'i. Total pediatric patients with SCD treated in the Hemoglobinopathy Clinic', value: String(data.section1.totalPatientsTreated.pediatric) },
        { metric: 'ii. Total new adult patients with SCD treated in the Hemoglobinopathy Clinic', value: String(data.section1.newPatientsTreated.adult) },
        { metric: 'iii. Total new pediatric patients with SCD treated in the Hemoglobinopathy Clinic', value: String(data.section1.newPatientsTreated.pediatric) },
        { metric: 'iv. Wait time for access to care for new referrals and ongoing patients', value: data.section1.waitTimeForAccessToCare || 'Not provided' },
        { metric: 'v. Number of patients referred from another clinic because of transition from pediatric care', value: String(data.section1.transitionalReferralsFromPediatric) },
        {
            metric: 'vi. SCD patients reporting quality or sub-quality care after interacting with ER',
            value: [
                `Quality care reported (total): ${data.section1.qualityOfCare.er.quality.total}`,
                `Pediatric: ${data.section1.qualityOfCare.er.quality.pediatric}`,
                `Adult: ${data.section1.qualityOfCare.er.quality.adult}`,
                `Sub-quality care reported (total): ${data.section1.qualityOfCare.er.subQuality.total}`,
                `Pediatric: ${data.section1.qualityOfCare.er.subQuality.pediatric}`,
                `Adult: ${data.section1.qualityOfCare.er.subQuality.adult}`,
            ].join('\n'),
        },
        {
            metric: 'Total SCD patients reporting quality or sub-quality care during admission to hospital',
            value: [
                `Quality care reported (total): ${data.section1.qualityOfCare.admission.quality.total}`,
                `Pediatric: ${data.section1.qualityOfCare.admission.quality.pediatric}`,
                `Adult: ${data.section1.qualityOfCare.admission.quality.adult}`,
                `Sub-quality care reported (total): ${data.section1.qualityOfCare.admission.subQuality.total}`,
                `Pediatric: ${data.section1.qualityOfCare.admission.subQuality.pediatric}`,
                `Adult: ${data.section1.qualityOfCare.admission.subQuality.adult}`,
            ].join('\n'),
        },
        {
            metric: 'Total SCD patients that were supported in hospital by SCAGO',
            value: [
                `Supported in E.R. - Pediatric: ${data.section2.supportedInHospital.er.pediatric}`,
                `Supported in E.R. - Adult: ${data.section2.supportedInHospital.er.adult}`,
                `Supported after Admission - Pediatric: ${data.section2.supportedInHospital.afterAdmission.pediatric}`,
                `Supported after Admission - Adult: ${data.section2.supportedInHospital.afterAdmission.adult}`,
                `Total - Pediatric: ${data.section2.supportedInHospital.total.pediatric}`,
                `Total - Adult: ${data.section2.supportedInHospital.total.adult}`,
            ].join('\n'),
        },
        {
            metric: 'Total SCD patients referred to a hematologist before discharge',
            value: `Pediatric: ${data.section2.referredToHematologistBeforeDischarge.pediatric}\nAdult: ${data.section2.referredToHematologistBeforeDischarge.adult}`,
        },
        {
            metric: 'Total SCD patients with pain crisis who were provided with analgesics within 60 minutes',
            value: `Pediatric: ${data.section2.painCrisisAnalgesicsWithin60Minutes.pediatric}\nAdult: ${data.section2.painCrisisAnalgesicsWithin60Minutes.adult}`,
        },
        {
            metric: 'Total SCD patients that received support in hospital during routine clinical visit by SCAGO',
            value: `Pediatric: ${data.section2.routineClinicalVisitSupportCount.pediatric}\nAdult: ${data.section2.routineClinicalVisitSupportCount.adult}`,
        },
        { metric: 'i. What support did patients receive from SCAGO during their ER visit or admission? (Adult patients)', value: supportCountsToLines(data.section2.supportDuringErOrAdmissionAdult) },
        { metric: 'ii. What support did patients receive from SCAGO after being discharged? (All patients)', value: supportCountsToLines(data.section2.supportAfterDischargeAllPatients) },
        { metric: 'iii. What support did patients who were visited during routine clinical visits receive from SCAGO? (All patients)', value: supportCountsToLines(data.section3.supportDuringRoutineClinicalVisitAllPatients) },
        { metric: 'Notes', value: data.section3.notes || 'None' },
    ];
}

export async function generateProgramReportPdf(data: ProgramReportData): Promise<Uint8Array | null> {
    try {
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        const pageWidth = 612;
        const pageHeight = 792;
        const margin = 36;
        const leftWidth = 250;
        const rightWidth = pageWidth - margin * 2 - leftWidth;
        const lineHeight = 12;
        const cellPadding = 6;

        const rows = flattenReportRows(data);
        let page = doc.addPage([pageWidth, pageHeight]);
        let cursorY = pageHeight - margin;

        page.drawText('Hemoglobinopathy Clinic Program Metrics Report', {
            x: margin,
            y: cursorY,
            size: 14,
            font: boldFont,
            color: rgb(0.05, 0.1, 0.3),
        });
        cursorY -= 18;

        page.drawText(`Reporting period: ${data.reportingLabel}`, {
            x: margin,
            y: cursorY,
            size: 10,
            font,
            color: rgb(0.3, 0.3, 0.3),
        });
        cursorY -= 14;

        page.drawText(`Hospital: ${data.hospital || 'All Hospitals'}${data.patientDisplayName ? ` | Patient: ${data.patientDisplayName}` : ''}`, {
            x: margin,
            y: cursorY,
            size: 10,
            font,
            color: rgb(0.3, 0.3, 0.3),
        });
        cursorY -= 20;

        const drawHeader = () => {
            page.drawRectangle({
                x: margin,
                y: cursorY - 20,
                width: leftWidth,
                height: 20,
                color: rgb(0.05, 0.2, 0.5),
            });
            page.drawRectangle({
                x: margin + leftWidth,
                y: cursorY - 20,
                width: rightWidth,
                height: 20,
                color: rgb(0.05, 0.2, 0.5),
            });
            page.drawText('Program Report with Metrics', {
                x: margin + cellPadding,
                y: cursorY - 14,
                size: 9,
                font: boldFont,
                color: rgb(1, 1, 1),
            });
            page.drawText('Response', {
                x: margin + leftWidth + cellPadding,
                y: cursorY - 14,
                size: 9,
                font: boldFont,
                color: rgb(1, 1, 1),
            });
            cursorY -= 20;
        };

        drawHeader();

        for (const row of rows) {
            const metricLines = row.metric.split('\n');
            const valueLines = row.value.split('\n');
            const rowHeight = Math.max(metricLines.length, valueLines.length) * lineHeight + cellPadding * 2;

            if (cursorY - rowHeight < margin) {
                page = doc.addPage([pageWidth, pageHeight]);
                cursorY = pageHeight - margin;
                drawHeader();
            }

            page.drawRectangle({
                x: margin,
                y: cursorY - rowHeight,
                width: leftWidth,
                height: rowHeight,
                borderWidth: 0.5,
                borderColor: rgb(0.7, 0.7, 0.7),
            });
            page.drawRectangle({
                x: margin + leftWidth,
                y: cursorY - rowHeight,
                width: rightWidth,
                height: rowHeight,
                borderWidth: 0.5,
                borderColor: rgb(0.7, 0.7, 0.7),
            });

            drawWrappedText(
                page,
                row.metric,
                margin + cellPadding,
                cursorY - cellPadding - lineHeight + 2,
                leftWidth - cellPadding * 2,
                font,
                9,
                lineHeight
            );
            drawWrappedText(
                page,
                row.value,
                margin + leftWidth + cellPadding,
                cursorY - cellPadding - lineHeight + 2,
                rightWidth - cellPadding * 2,
                font,
                9,
                lineHeight
            );

            cursorY -= rowHeight;
        }

        const pageCount = doc.getPageCount();
        for (let i = 0; i < pageCount; i += 1) {
            const p = doc.getPage(i);
            p.drawText(`Page ${i + 1} of ${pageCount}`, {
                x: pageWidth - margin - 70,
                y: 20,
                size: 8,
                font,
                color: rgb(0.5, 0.5, 0.5),
            });
        }

        return await doc.save();
    } catch (error) {
        console.error('Error generating program report PDF:', error);
        return null;
    }
}
