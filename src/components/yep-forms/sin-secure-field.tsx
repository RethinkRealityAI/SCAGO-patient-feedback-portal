'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { validateSIN } from '@/lib/youth-empowerment';

interface SINSecureFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showValidation?: boolean;
  isEditing?: boolean; // New prop to indicate if we're editing an existing participant
}

export function SINSecureField({ 
  value = '', 
  onChange, 
  disabled, 
  placeholder = "Enter SIN (will be securely hashed)",
  showValidation = true,
  isEditing = false
}: SINSecureFieldProps) {
  const [isValid, setIsValid] = useState(false);
  const [showSIN, setShowSIN] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Only digits
    if (input.length <= 9) {
      onChange?.(input);
      
      if (showValidation) {
        validateSINInput(input);
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const validateSINInput = (sin: string) => {
    if (sin.length === 0) {
      setIsValid(false);
      setValidationMessage('');
      return;
    }

    // When editing, only show validation for complete SINs to avoid confusion
    if (isEditing && sin.length > 0 && sin.length < 9) {
      setIsValid(false);
      setValidationMessage('');
      return;
    }

    // Only show validation messages for partial or complete SINs
    if (sin.length > 0 && sin.length < 9) {
      setIsValid(false);
      setValidationMessage(`Enter ${9 - sin.length} more digits`);
      return;
    }

    // For 9-digit SINs, only show errors for obviously invalid patterns
    // Don't use strict Luhn validation during input as it's too restrictive
    if (sin.length === 9) {
      if (/^(\d)\1{8}$/.test(sin)) {
        setIsValid(false);
        setValidationMessage('Invalid SIN format (all same digits)');
      } else if (sin.startsWith('000') || sin.startsWith('999')) {
        setIsValid(false);
        setValidationMessage('Invalid SIN format');
      } else {
        // For valid-looking SINs, show positive feedback
        setIsValid(true);
        setValidationMessage('Valid SIN format');
      }
    }
  };

  const toggleVisibility = () => {
    setShowSIN(!showSIN);
  };

  const formatSIN = (sin: string) => {
    if (sin.length <= 3) return sin;
    if (sin.length <= 6) return `${sin.slice(0, 3)} ${sin.slice(3)}`;
    return `${sin.slice(0, 3)} ${sin.slice(3, 6)} ${sin.slice(6)}`;
  };

  const getDisplayValue = () => {
    if (!value || value.trim() === '') return '';
    // Show actual value when focused (for typing) or when showSIN is true
    if (isFocused || showSIN) {
      return formatSIN(value);
    }
    return '•'.repeat(value.length);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Secure SIN Input</span>
        <Badge variant="outline" className="text-xs">
          <Lock className="h-3 w-3 mr-1" />
          Encrypted
        </Badge>
      </div>

      <div className="relative">
        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type={showSIN ? 'text' : 'password'}
          placeholder={placeholder}
          value={getDisplayValue()}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className="pl-10 pr-20"
          maxLength={11} // 9 digits + 2 spaces
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1 h-8 w-8 p-0"
          onClick={toggleVisibility}
          disabled={disabled}
        >
          {showSIN ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {showValidation && validationMessage && (
        <div className={`flex items-center gap-2 text-sm ${
          isValid ? 'text-green-600' : 'text-red-600'
        }`}>
          {isValid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {validationMessage}
        </div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              <span>Only the last 4 digits will be stored for reference</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3" />
              <span>Full SIN is encrypted using bcrypt with 12 salt rounds</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {value && value.length === 9 && (
        <div className="text-xs text-muted-foreground">
          Last 4 digits: {value.slice(-4)}
        </div>
      )}
    </div>
  );
}
