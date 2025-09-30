'use client';

import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function SignaturePad({ 
  value, 
  onChange, 
  label = 'Signature',
  placeholder = 'Draw your signature here',
  className 
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load existing signature when component mounts or value changes
  useEffect(() => {
    if (value && sigCanvas.current && !hasLoaded) {
      try {
        sigCanvas.current.fromDataURL(value);
        setIsEmpty(false);
        setHasLoaded(true);
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    }
  }, [value, hasLoaded]);

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
      onChange('');
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      const canvasEmpty = sigCanvas.current.isEmpty();
      setIsEmpty(canvasEmpty);
      if (!canvasEmpty) {
        onChange(dataUrl);
      }
    }
  };

  const handleUndo = () => {
    if (sigCanvas.current) {
      const data = sigCanvas.current.toData();
      if (data && data.length > 0) {
        data.pop(); // Remove the last stroke
        sigCanvas.current.fromData(data);
        handleEnd(); // Update the value
      }
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg bg-background hover:border-muted-foreground/50 transition-colors overflow-hidden">
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                <span className="text-sm">{placeholder}</span>
              </div>
            </div>
          )}
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: 'w-full h-full cursor-crosshair touch-none',
              style: { 
                width: '100%', 
                height: '200px',
                touchAction: 'none'
              }
            }}
            backgroundColor="transparent"
            penColor="currentColor"
            minWidth={1}
            maxWidth={3}
            velocityFilterWeight={0.7}
            onEnd={handleEnd}
            clearOnResize={false}
          />
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={isEmpty}
              className="h-8"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Undo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={isEmpty}
              className="h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
          
          {!isEmpty && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-green-600" />
              <span>Signed</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Use your mouse, finger, or stylus to draw your signature above
      </p>
    </div>
  );
}
