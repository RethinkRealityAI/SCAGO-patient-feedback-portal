'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { generateProgramReportPdf } from '@/lib/program-report-pdf';
import { exportToCSV } from '@/lib/export-utils';
import type { ProgramReportData, ProgramReportSupportCounts } from '@/types/program-report';
import { PROGRAM_REPORT_SUPPORT_LABELS } from '@/types/program-report';

interface ProgramReportEditorProps {
    initialData: ProgramReportData;
}

function toRows(data: ProgramReportData): Array<{ metric: string; value: string | number }> {
    return [
        { metric: 'Total adult patients with SCD treated in clinic', value: data.section1.totalPatientsTreated.adult },
        { metric: 'Total pediatric patients with SCD treated in clinic', value: data.section1.totalPatientsTreated.pediatric },
        { metric: 'Total new adult patients with SCD treated in clinic', value: data.section1.newPatientsTreated.adult },
        { metric: 'Total new pediatric patients with SCD treated in clinic', value: data.section1.newPatientsTreated.pediatric },
        { metric: 'Wait time for access to care', value: data.section1.waitTimeForAccessToCare },
        { metric: 'Transitional referrals from pediatric care', value: data.section1.transitionalReferralsFromPediatric },
        { metric: 'ER quality care reported (total)', value: data.section1.qualityOfCare.er.quality.total },
        { metric: 'ER quality care reported (pediatric)', value: data.section1.qualityOfCare.er.quality.pediatric },
        { metric: 'ER quality care reported (adult)', value: data.section1.qualityOfCare.er.quality.adult },
        { metric: 'ER sub-quality care reported (total)', value: data.section1.qualityOfCare.er.subQuality.total },
        { metric: 'ER sub-quality care reported (pediatric)', value: data.section1.qualityOfCare.er.subQuality.pediatric },
        { metric: 'ER sub-quality care reported (adult)', value: data.section1.qualityOfCare.er.subQuality.adult },
        { metric: 'Admission quality care reported (total)', value: data.section1.qualityOfCare.admission.quality.total },
        { metric: 'Admission quality care reported (pediatric)', value: data.section1.qualityOfCare.admission.quality.pediatric },
        { metric: 'Admission quality care reported (adult)', value: data.section1.qualityOfCare.admission.quality.adult },
        { metric: 'Admission sub-quality care reported (total)', value: data.section1.qualityOfCare.admission.subQuality.total },
        { metric: 'Admission sub-quality care reported (pediatric)', value: data.section1.qualityOfCare.admission.subQuality.pediatric },
        { metric: 'Admission sub-quality care reported (adult)', value: data.section1.qualityOfCare.admission.subQuality.adult },
        { metric: 'Supported in ER (pediatric)', value: data.section2.supportedInHospital.er.pediatric },
        { metric: 'Supported in ER (adult)', value: data.section2.supportedInHospital.er.adult },
        { metric: 'Supported after admission (pediatric)', value: data.section2.supportedInHospital.afterAdmission.pediatric },
        { metric: 'Supported after admission (adult)', value: data.section2.supportedInHospital.afterAdmission.adult },
        { metric: 'Total supported in hospital (pediatric)', value: data.section2.supportedInHospital.total.pediatric },
        { metric: 'Total supported in hospital (adult)', value: data.section2.supportedInHospital.total.adult },
        { metric: 'Referred to hematologist before discharge (pediatric)', value: data.section2.referredToHematologistBeforeDischarge.pediatric },
        { metric: 'Referred to hematologist before discharge (adult)', value: data.section2.referredToHematologistBeforeDischarge.adult },
        { metric: 'Pain crisis analgesics within 60 minutes (pediatric)', value: data.section2.painCrisisAnalgesicsWithin60Minutes.pediatric },
        { metric: 'Pain crisis analgesics within 60 minutes (adult)', value: data.section2.painCrisisAnalgesicsWithin60Minutes.adult },
        { metric: 'Routine clinical support count (pediatric)', value: data.section2.routineClinicalVisitSupportCount.pediatric },
        { metric: 'Routine clinical support count (adult)', value: data.section2.routineClinicalVisitSupportCount.adult },
        { metric: 'Notes', value: data.section3.notes },
    ];
}

function SupportEditor({
    title,
    value,
    onChange,
}: {
    title: string;
    value: ProgramReportSupportCounts;
    onChange: (next: ProgramReportSupportCounts) => void;
}) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PROGRAM_REPORT_SUPPORT_LABELS.map((field) => (
                    <div key={field.key} className="space-y-1">
                        <Label>{field.label}</Label>
                        <Input
                            type="number"
                            min={0}
                            value={value[field.key]}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    [field.key]: Number(e.target.value || 0),
                                })
                            }
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export function ProgramReportEditor({ initialData }: ProgramReportEditorProps) {
    const [reportData, setReportData] = useState<ProgramReportData>(initialData);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const { toast } = useToast();

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        try {
            const pdfBytes = await generateProgramReportPdf(reportData);
            if (!pdfBytes) {
                toast({
                    title: 'Export failed',
                    description: 'Failed to generate PDF.',
                    variant: 'destructive',
                });
                return;
            }

            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const patientTag = reportData.patientDisplayName
                ? reportData.patientDisplayName.toLowerCase().replace(/\s+/g, '-')
                : 'roster';
            link.download = `program-report-${patientTag}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export program report PDF:', error);
            toast({
                title: 'Export failed',
                description: 'Failed to generate PDF.',
                variant: 'destructive',
            });
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportCsv = () => {
        const rows = toRows(reportData);
        const patientTag = reportData.patientDisplayName
            ? reportData.patientDisplayName.toLowerCase().replace(/\s+/g, '-')
            : 'roster';
        exportToCSV(rows, `program-report-${patientTag}-${reportData.year}-${String(reportData.month).padStart(2, '0')}`);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Program Report Editor</CardTitle>
                    <CardDescription>
                        Review and adjust report metrics before exporting.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <Label>Hospital</Label>
                        <Input
                            value={reportData.hospital}
                            onChange={(e) => setReportData((prev) => ({ ...prev, hospital: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Report Month</Label>
                        <Input
                            type="number"
                            min={1}
                            max={12}
                            value={reportData.month}
                            onChange={(e) =>
                                setReportData((prev) => ({ ...prev, month: Number(e.target.value || prev.month) }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Report Year</Label>
                        <Input
                            type="number"
                            min={2024}
                            value={reportData.year}
                            onChange={(e) =>
                                setReportData((prev) => ({ ...prev, year: Number(e.target.value || prev.year) }))
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Section 1: Clinic Metrics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>Total adult patients treated</Label>
                        <Input
                            type="number"
                            value={reportData.section1.totalPatientsTreated.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        totalPatientsTreated: {
                                            ...prev.section1.totalPatientsTreated,
                                            adult: Number(e.target.value || 0),
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Total pediatric patients treated</Label>
                        <Input
                            type="number"
                            value={reportData.section1.totalPatientsTreated.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        totalPatientsTreated: {
                                            ...prev.section1.totalPatientsTreated,
                                            pediatric: Number(e.target.value || 0),
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>New adult patients</Label>
                        <Input
                            type="number"
                            value={reportData.section1.newPatientsTreated.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        newPatientsTreated: {
                                            ...prev.section1.newPatientsTreated,
                                            adult: Number(e.target.value || 0),
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>New pediatric patients</Label>
                        <Input
                            type="number"
                            value={reportData.section1.newPatientsTreated.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        newPatientsTreated: {
                                            ...prev.section1.newPatientsTreated,
                                            pediatric: Number(e.target.value || 0),
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <Label>Wait time for access to care</Label>
                        <Input
                            value={reportData.section1.waitTimeForAccessToCare}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        waitTimeForAccessToCare: e.target.value,
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Transitional referrals (pediatric to adult)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.transitionalReferralsFromPediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        transitionalReferralsFromPediatric: Number(e.target.value || 0),
                                    },
                                }))
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Quality of Care (ER)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <Label>Quality reported (total)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.er.quality.total}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            er: {
                                                ...prev.section1.qualityOfCare.er,
                                                quality: {
                                                    ...prev.section1.qualityOfCare.er.quality,
                                                    total: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Quality reported (pediatric)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.er.quality.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            er: {
                                                ...prev.section1.qualityOfCare.er,
                                                quality: {
                                                    ...prev.section1.qualityOfCare.er.quality,
                                                    pediatric: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Quality reported (adult)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.er.quality.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            er: {
                                                ...prev.section1.qualityOfCare.er,
                                                quality: {
                                                    ...prev.section1.qualityOfCare.er.quality,
                                                    adult: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Sub-quality reported (total)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.er.subQuality.total}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            er: {
                                                ...prev.section1.qualityOfCare.er,
                                                subQuality: {
                                                    ...prev.section1.qualityOfCare.er.subQuality,
                                                    total: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Sub-quality reported (pediatric)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.er.subQuality.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            er: {
                                                ...prev.section1.qualityOfCare.er,
                                                subQuality: {
                                                    ...prev.section1.qualityOfCare.er.subQuality,
                                                    pediatric: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Sub-quality reported (adult)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.er.subQuality.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            er: {
                                                ...prev.section1.qualityOfCare.er,
                                                subQuality: {
                                                    ...prev.section1.qualityOfCare.er.subQuality,
                                                    adult: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Quality of Care (Admission)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <Label>Quality reported (total)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.admission.quality.total}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            admission: {
                                                ...prev.section1.qualityOfCare.admission,
                                                quality: {
                                                    ...prev.section1.qualityOfCare.admission.quality,
                                                    total: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Quality reported (pediatric)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.admission.quality.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            admission: {
                                                ...prev.section1.qualityOfCare.admission,
                                                quality: {
                                                    ...prev.section1.qualityOfCare.admission.quality,
                                                    pediatric: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Quality reported (adult)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.admission.quality.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            admission: {
                                                ...prev.section1.qualityOfCare.admission,
                                                quality: {
                                                    ...prev.section1.qualityOfCare.admission.quality,
                                                    adult: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Sub-quality reported (total)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.admission.subQuality.total}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            admission: {
                                                ...prev.section1.qualityOfCare.admission,
                                                subQuality: {
                                                    ...prev.section1.qualityOfCare.admission.subQuality,
                                                    total: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Sub-quality reported (pediatric)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.admission.subQuality.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            admission: {
                                                ...prev.section1.qualityOfCare.admission,
                                                subQuality: {
                                                    ...prev.section1.qualityOfCare.admission.subQuality,
                                                    pediatric: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Sub-quality reported (adult)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section1.qualityOfCare.admission.subQuality.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section1: {
                                        ...prev.section1,
                                        qualityOfCare: {
                                            ...prev.section1.qualityOfCare,
                                            admission: {
                                                ...prev.section1.qualityOfCare.admission,
                                                subQuality: {
                                                    ...prev.section1.qualityOfCare.admission.subQuality,
                                                    adult: Number(e.target.value || 0),
                                                },
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Section 2: Hospital Support Metrics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>Supported in ER (pediatric)</Label>
                        <Input
                            type="number"
                            value={reportData.section2.supportedInHospital.er.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        supportedInHospital: {
                                            ...prev.section2.supportedInHospital,
                                            er: {
                                                ...prev.section2.supportedInHospital.er,
                                                pediatric: Number(e.target.value || 0),
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Supported in ER (adult)</Label>
                        <Input
                            type="number"
                            value={reportData.section2.supportedInHospital.er.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        supportedInHospital: {
                                            ...prev.section2.supportedInHospital,
                                            er: {
                                                ...prev.section2.supportedInHospital.er,
                                                adult: Number(e.target.value || 0),
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Referred to hematologist before discharge (pediatric)</Label>
                        <Input
                            value={reportData.section2.referredToHematologistBeforeDischarge.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        referredToHematologistBeforeDischarge: {
                                            ...prev.section2.referredToHematologistBeforeDischarge,
                                            pediatric: e.target.value,
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Referred to hematologist before discharge (adult)</Label>
                        <Input
                            value={reportData.section2.referredToHematologistBeforeDischarge.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        referredToHematologistBeforeDischarge: {
                                            ...prev.section2.referredToHematologistBeforeDischarge,
                                            adult: e.target.value,
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Supported after admission (pediatric)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section2.supportedInHospital.afterAdmission.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        supportedInHospital: {
                                            ...prev.section2.supportedInHospital,
                                            afterAdmission: {
                                                ...prev.section2.supportedInHospital.afterAdmission,
                                                pediatric: Number(e.target.value || 0),
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Supported after admission (adult)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section2.supportedInHospital.afterAdmission.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        supportedInHospital: {
                                            ...prev.section2.supportedInHospital,
                                            afterAdmission: {
                                                ...prev.section2.supportedInHospital.afterAdmission,
                                                adult: Number(e.target.value || 0),
                                            },
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Pain crisis analgesics within 60 min (pediatric)</Label>
                        <Input
                            value={reportData.section2.painCrisisAnalgesicsWithin60Minutes.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        painCrisisAnalgesicsWithin60Minutes: {
                                            ...prev.section2.painCrisisAnalgesicsWithin60Minutes,
                                            pediatric: e.target.value,
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Pain crisis analgesics within 60 min (adult)</Label>
                        <Input
                            value={reportData.section2.painCrisisAnalgesicsWithin60Minutes.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        painCrisisAnalgesicsWithin60Minutes: {
                                            ...prev.section2.painCrisisAnalgesicsWithin60Minutes,
                                            adult: e.target.value,
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Routine clinical visit support (pediatric)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section2.routineClinicalVisitSupportCount.pediatric}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        routineClinicalVisitSupportCount: {
                                            ...prev.section2.routineClinicalVisitSupportCount,
                                            pediatric: Number(e.target.value || 0),
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Routine clinical visit support (adult)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={reportData.section2.routineClinicalVisitSupportCount.adult}
                            onChange={(e) =>
                                setReportData((prev) => ({
                                    ...prev,
                                    section2: {
                                        ...prev.section2,
                                        routineClinicalVisitSupportCount: {
                                            ...prev.section2.routineClinicalVisitSupportCount,
                                            adult: Number(e.target.value || 0),
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <SupportEditor
                title="Support during ER visit or admission (Adult patients)"
                value={reportData.section2.supportDuringErOrAdmissionAdult}
                onChange={(next) =>
                    setReportData((prev) => ({
                        ...prev,
                        section2: { ...prev.section2, supportDuringErOrAdmissionAdult: next },
                    }))
                }
            />

            <SupportEditor
                title="Support after discharge (All patients)"
                value={reportData.section2.supportAfterDischargeAllPatients}
                onChange={(next) =>
                    setReportData((prev) => ({
                        ...prev,
                        section2: { ...prev.section2, supportAfterDischargeAllPatients: next },
                    }))
                }
            />

            <SupportEditor
                title="Support during routine clinical visit (All patients)"
                value={reportData.section3.supportDuringRoutineClinicalVisitAllPatients}
                onChange={(next) =>
                    setReportData((prev) => ({
                        ...prev,
                        section3: { ...prev.section3, supportDuringRoutineClinicalVisitAllPatients: next },
                    }))
                }
            />

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={reportData.section3.notes}
                        onChange={(e) =>
                            setReportData((prev) => ({
                                ...prev,
                                section3: { ...prev.section3, notes: e.target.value },
                            }))
                        }
                        rows={5}
                    />
                </CardContent>
            </Card>

            <Separator />

            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={handleExportCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
                <Button onClick={handleExportPdf} disabled={isExportingPdf}>
                    <FileDown className="mr-2 h-4 w-4" />
                    {isExportingPdf ? 'Generating PDF...' : 'Export PDF'}
                </Button>
            </div>
        </div>
    );
}
