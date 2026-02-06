'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Users2,
    MessageSquarePlus,
    FileCheck2,
    ArrowRight,
    Sparkles,
    ShieldCheck,
    LayoutDashboard,
    Search,
    Filter,
    Activity,
    Plus,
    CheckCircle2,
    MessageSquare
} from 'lucide-react';
import { cn } from "@/lib/utils";

const TUTORIAL_STEPS = [
    {
        title: "Platform Overview",
        description: "Your unified command center for patient-centered support. Manage data, track health metrics, and maintain clinical compliance across the network.",
        icon: <Users2 className="h-10 w-10 text-primary" />,
        features: [
            { icon: <LayoutDashboard className="h-4 w-4" />, text: "Real-time Analytics" },
            { icon: <Search className="h-4 w-4" />, text: "Global Search & Filter" },
            { icon: <FileCheck2 className="h-4 w-4" />, text: "Automated Compliance tracking" }
        ],
        visual: (
            <div className="relative w-full h-48 bg-gradient-to-br from-primary/5 to-indigo-500/5 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="grid grid-cols-2 gap-4 w-full p-6">
                    <div className="space-y-2 translate-y-4">
                        <div className="h-24 bg-white/10 rounded-xl border border-white/20 p-3 space-y-2">
                            <div className="h-2 w-1/2 bg-primary/40 rounded" />
                            <div className="h-12 w-full bg-white/5 rounded-lg" />
                        </div>
                    </div>
                    <div className="space-y-2 -translate-y-4">
                        <div className="h-24 bg-white/10 rounded-xl border border-white/20 p-3 space-y-2">
                            <div className="h-2 w-1/3 bg-indigo-400/40 rounded" />
                            <div className="h-12 w-full bg-white/5 rounded-lg flex items-center justify-center">
                                <Activity className="h-8 w-8 text-indigo-400/50" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "Adding New Patients",
        description: "Click the 'Add Patient' button in the directory. Fill in clinical details, set the case status, and establish contact preferences to get started.",
        icon: <Plus className="h-10 w-10 text-emerald-500" />,
        features: [
            { icon: <CheckCircle2 className="h-4 w-4" />, text: "Click '+ Add Patient'" },
            { icon: <CheckCircle2 className="h-4 w-4" />, text: "Input Hospital & MRN" },
            { icon: <CheckCircle2 className="h-4 w-4" />, text: "Save Patient Record" }
        ],
        visual: (
            <div className="relative w-full h-48 bg-slate-950/40 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-6 space-y-4 overflow-hidden">
                <div className="flex items-center gap-3 self-end -mr-2 bg-primary/20 p-2 rounded-xl border border-primary/30 animate-pulse">
                    <div className="bg-primary p-1.5 rounded-lg">
                        <Plus className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-bold text-primary">Add Patient</span>
                </div>
                <div className="w-full space-y-3 bg-white/5 border border-white/10 rounded-xl p-4 translate-y-2">
                    <div className="flex gap-2">
                        <div className="h-6 w-1/2 bg-white/10 rounded border border-white/10" />
                        <div className="h-6 w-1/2 bg-white/10 rounded border border-white/10" />
                    </div>
                    <div className="h-6 w-full bg-white/10 rounded border border-white/10" />
                    <div className="h-8 w-1/3 bg-primary/40 rounded-lg self-end border border-primary/20" />
                </div>
            </div>
        )
    },
    {
        title: "Logging Interactions",
        description: "Maintain accurate history by logging every touchpoint. Select 'Log Interaction' from any profile to record support provided and outcomes.",
        icon: <MessageSquarePlus className="h-10 w-10 text-indigo-500" />,
        features: [
            { icon: <CheckCircle2 className="h-4 w-4" />, text: "Select Contact Method" },
            { icon: <CheckCircle2 className="h-4 w-4" />, text: "Toggle Support Types" },
            { icon: <CheckCircle2 className="h-4 w-4" />, text: "Record Next Steps" }
        ],
        visual: (
            <div className="relative w-full h-48 bg-slate-950/40 rounded-2xl border border-white/10 flex items-center justify-center p-6 overflow-hidden">
                <div className="w-5/6 h-full bg-white/10 border border-white/20 rounded-t-2xl p-4 space-y-3 shadow-2xl scale-105 translate-y-4">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                        <div className="h-3 w-24 bg-indigo-400/40 rounded" />
                        <div className="h-3 w-3 bg-white/20 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="h-4 w-full bg-white/5 rounded" />
                        <div className="h-4 w-full bg-white/5 rounded" />
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3].map(i => <div key={i} className="h-4 w-8 bg-indigo-500/20 rounded-full border border-indigo-500/30" />)}
                    </div>
                    <div className="h-12 w-full bg-white/5 rounded-lg border border-white/10" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-150 animate-pulse" />
                        <MessageSquare className="h-12 w-12 text-indigo-400 relative z-10 drop-shadow-lg" />
                    </div>
                </div>
            </div>
        )
    }
];

export function PatientTutorialModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('scago_patient_tutorial_seen');
        if (!hasSeenTutorial) {
            setIsOpen(true);
        }
    }, []);

    const handleFinish = () => {
        if (dontShowAgain) {
            localStorage.setItem('scago_patient_tutorial_seen', 'true');
        }
        setIsOpen(false);
    };

    const nextStep = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const step = TUTORIAL_STEPS[currentStep];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden glass-premium border-white/20 shadow-2xl rounded-[2rem]">
                <DialogHeader className="sr-only">
                    <DialogTitle>{step.title}</DialogTitle>
                    <DialogDescription>{step.description}</DialogDescription>
                </DialogHeader>

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5 z-20">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(200,38,42,0.5)]"
                        style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                    />
                </div>

                <div className="p-8 sm:p-10 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center text-center space-y-6">
                        {/* Custom Visual Representation */}
                        <div className="w-full relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-indigo-500/30 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                            {step.visual}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
                                    {step.icon}
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
                                    {step.title}
                                </h1>
                            </div>
                            <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
                                {step.description}
                            </p>
                        </div>

                        {/* Feature Tags with subtle animation */}
                        <div className="flex flex-wrap justify-center gap-3">
                            {step.features.map((feature, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-all hover:scale-105 duration-300"
                                >
                                    <span className="text-primary">{feature.icon}</span>
                                    <span>{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full mt-10 md:mt-12 flex flex-col space-y-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                                <Checkbox
                                    id="dont-show"
                                    checked={dontShowAgain}
                                    onCheckedChange={(checked) => setDontShowAgain(!!checked)}
                                    className="rounded-md border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <label
                                    htmlFor="dont-show"
                                    className="text-sm font-medium text-muted-foreground cursor-pointer select-none group-hover:text-foreground transition-colors"
                                >
                                    Don't show this again
                                </label>
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {currentStep > 0 && (
                                    <Button
                                        variant="ghost"
                                        onClick={prevStep}
                                        className="flex-1 sm:flex-none h-12 rounded-xl px-8 hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                                    >
                                        Back
                                    </Button>
                                )}
                                <Button
                                    onClick={nextStep}
                                    className="flex-1 sm:flex-none rounded-2xl px-10 h-12 font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all group overflow-hidden relative"
                                >
                                    <span className="relative z-10 flex items-center justify-center">
                                        {currentStep === TUTORIAL_STEPS.length - 1 ? (
                                            "Get Started"
                                        ) : (
                                            <>
                                                Next Step
                                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 group-hover:scale-105 transition-transform duration-500" />
                                </Button>
                            </div>
                        </div>

                        {/* Indicator Dots */}
                        <div className="flex justify-center gap-3">
                            {TUTORIAL_STEPS.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "h-1.5 transition-all duration-500 rounded-full",
                                        idx === currentStep ? "w-10 bg-primary shadow-[0_0_8px_rgba(200,38,42,0.4)]" : "w-1.5 bg-white/20"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
