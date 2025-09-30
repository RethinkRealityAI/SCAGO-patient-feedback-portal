'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { X, Plus, Upload, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AdvancedFieldProps {
  fieldConfig: any;
  form: UseFormReturn<any>;
  isFrench?: boolean;
}

// Multi-Text Field (Add Multiple Entries)
export function MultiTextField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id) || [''];
  
  const addEntry = () => {
    form.setValue(fieldConfig.id, [...value, '']);
  };
  
  const removeEntry = (index: number) => {
    if (value.length > 1) {
      form.setValue(fieldConfig.id, value.filter((_: any, i: number) => i !== index));
    }
  };
  
  const updateEntry = (index: number, newValue: string) => {
    const updated = [...value];
    updated[index] = newValue;
    form.setValue(fieldConfig.id, updated);
  };
  
  return (
    <div className="space-y-2">
      {value.map((entry: string, index: number) => (
        <div key={index} className="flex gap-2">
          <Input
            value={entry}
            onChange={(e) => updateEntry(index, e.target.value)}
            placeholder={fieldConfig.placeholder || `Entry ${index + 1}`}
            className="flex-1"
          />
          {value.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeEntry(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
        <Plus className="mr-2 h-4 w-4" /> Add Another
      </Button>
    </div>
  );
}

// Matrix Field (Single or Multiple Choice)
export function MatrixField({ fieldConfig, form }: AdvancedFieldProps) {
  const isMultiple = fieldConfig.type === 'matrix-multiple';
  const value = form.watch(fieldConfig.id) || {};
  const rows = fieldConfig.rows || [];
  const columns = fieldConfig.columns || [];
  
  const handleSingleChoice = (rowValue: string, colValue: string) => {
    form.setValue(fieldConfig.id, { ...value, [rowValue]: colValue });
  };
  
  const handleMultipleChoice = (rowValue: string, colValue: string) => {
    const currentRow = value[rowValue] || [];
    const updated = currentRow.includes(colValue)
      ? currentRow.filter((v: string) => v !== colValue)
      : [...currentRow, colValue];
    form.setValue(fieldConfig.id, { ...value, [rowValue]: updated });
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 bg-muted/50 text-left font-medium"></th>
            {columns.map((col: any) => (
              <th key={col.value} className="border p-2 bg-muted/50 text-center font-medium text-sm">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.value}>
              <td className="border p-2 font-medium text-sm">{row.label}</td>
              {columns.map((col: any) => (
                <td key={col.value} className="border p-2 text-center">
                  {isMultiple ? (
                    <Checkbox
                      checked={value[row.value]?.includes(col.value) || false}
                      onCheckedChange={() => handleMultipleChoice(row.value, col.value)}
                    />
                  ) : (
                    <RadioGroupItem
                      value={col.value}
                      checked={value[row.value] === col.value}
                      onClick={() => handleSingleChoice(row.value, col.value)}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Likert Scale (Agreement Scale)
export function LikertScaleField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id);
  const options = [
    { value: '1', label: 'Strongly Disagree' },
    { value: '2', label: 'Disagree' },
    { value: '3', label: 'Neutral' },
    { value: '4', label: 'Agree' },
    { value: '5', label: 'Strongly Agree' },
  ];
  
  return (
    <RadioGroup value={value} onValueChange={(val) => form.setValue(fieldConfig.id, val)}>
      <div className="flex flex-col space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`${fieldConfig.id}-${option.value}`} />
            <Label htmlFor={`${fieldConfig.id}-${option.value}`} className="font-normal cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  );
}

// Pain Scale (Visual 0-10)
export function PainScaleField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id) || 0;
  const painLevels = [
    { value: 0, label: 'No Pain', color: 'bg-green-500' },
    { value: 1, label: '', color: 'bg-green-400' },
    { value: 2, label: '', color: 'bg-green-300' },
    { value: 3, label: 'Mild', color: 'bg-yellow-400' },
    { value: 4, label: '', color: 'bg-yellow-500' },
    { value: 5, label: 'Moderate', color: 'bg-orange-400' },
    { value: 6, label: '', color: 'bg-orange-500' },
    { value: 7, label: 'Severe', color: 'bg-red-400' },
    { value: 8, label: '', color: 'bg-red-500' },
    { value: 9, label: '', color: 'bg-red-600' },
    { value: 10, label: 'Worst', color: 'bg-red-700' },
  ];
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-1">
        {painLevels.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => form.setValue(fieldConfig.id, level.value)}
            className={cn(
              'flex-1 h-12 rounded transition-all cursor-pointer border-2',
              value === level.value ? 'border-primary scale-110' : 'border-transparent hover:scale-105',
              level.color
            )}
            title={`Pain level ${level.value}${level.label ? ` - ${level.label}` : ''}`}
          >
            <span className="text-white font-bold text-sm">{level.value}</span>
          </button>
        ))}
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{value}</div>
        <div className="text-sm text-muted-foreground">
          {value === 0 ? 'No Pain' : value <= 3 ? 'Mild Pain' : value <= 6 ? 'Moderate Pain' : value <= 9 ? 'Severe Pain' : 'Worst Possible Pain'}
        </div>
      </div>
    </div>
  );
}

// Ranking Field (Drag to Reorder)
function SortableItem({ id, label, index }: { id: string; label: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 p-3 bg-card border rounded-lg',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
          {index + 1}
        </div>
        <span className="flex-1">{label}</span>
      </div>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}

export function RankingField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id) || fieldConfig.options?.map((opt: any) => opt.value) || [];
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = value.indexOf(active.id);
      const newIndex = value.indexOf(over.id);
      form.setValue(fieldConfig.id, arrayMove(value, oldIndex, newIndex));
    }
  };
  
  const getLabel = (val: string) => {
    return fieldConfig.options?.find((opt: any) => opt.value === val)?.label || val;
  };
  
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Drag items to reorder from most to least important</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value} strategy={verticalListSortingStrategy}>
          {value.map((item: string, index: number) => (
            <SortableItem key={item} id={item} label={getLabel(item)} index={index} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

// File Upload Field
export function FileUploadField({ fieldConfig, form }: AdvancedFieldProps) {
  const [files, setFiles] = useState<File[]>([]);
  const maxFiles = fieldConfig.maxFiles || 1;
  const maxFileSize = (fieldConfig.maxFileSize || 5) * 1024 * 1024; // Convert MB to bytes
  const allowedTypes = fieldConfig.fileTypes || ['.pdf', '.jpg', '.png'];
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return allowedTypes.includes(ext) && file.size <= maxFileSize;
      });
      const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
      setFiles(updatedFiles);
      form.setValue(fieldConfig.id, updatedFiles);
    }
  };
  
  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    form.setValue(fieldConfig.id, updated);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              {allowedTypes.join(', ')} (Max {maxFiles} file{maxFiles !== 1 ? 's' : ''}, {fieldConfig.maxFileSize || 5}MB each)
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            multiple={maxFiles > 1}
            accept={allowedTypes.join(',')}
            onChange={handleFileChange}
            disabled={files.length >= maxFiles}
          />
        </label>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Date & Time Combined
export function DateTimeField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id) || { date: '', time: '' };
  
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">Date</Label>
        <Input
          type="date"
          value={value.date || ''}
          onChange={(e) => form.setValue(fieldConfig.id, { ...value, date: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Time</Label>
        <Input
          type="time"
          value={value.time || ''}
          onChange={(e) => form.setValue(fieldConfig.id, { ...value, time: e.target.value })}
        />
      </div>
    </div>
  );
}

// Color Picker
export function ColorPickerField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id) || '#000000';
  
  return (
    <div className="flex items-center gap-3">
      <Input
        type="color"
        value={value}
        onChange={(e) => form.setValue(fieldConfig.id, e.target.value)}
        className="w-20 h-10 cursor-pointer"
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => form.setValue(fieldConfig.id, e.target.value)}
        placeholder="#000000"
        className="flex-1 font-mono"
      />
    </div>
  );
}

// Range Slider
export function RangeField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id) || { min: fieldConfig.min || 0, max: fieldConfig.max || 100 };
  const min = fieldConfig.min || 0;
  const max = fieldConfig.max || 100;
  
  return (
    <div className="space-y-4">
      <Slider
        min={min}
        max={max}
        step={fieldConfig.step || 1}
        value={[value.min, value.max]}
        onValueChange={([newMin, newMax]) => form.setValue(fieldConfig.id, { min: newMin, max: newMax })}
        className="w-full"
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{value.min}</span>
        <span>{value.max}</span>
      </div>
    </div>
  );
}

// Percentage Field
export function PercentageField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id) || 0;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => {
            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
            form.setValue(fieldConfig.id, val);
          }}
          className="flex-1"
        />
        <span className="text-xl font-bold text-muted-foreground">%</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([val]) => form.setValue(fieldConfig.id, val)}
        className="w-full"
      />
    </div>
  );
}

// Currency Field
export function CurrencyField({ fieldConfig, form }: AdvancedFieldProps) {
  const value = form.watch(fieldConfig.id) || '';
  const prefix = fieldConfig.prefix || '$';
  const suffix = fieldConfig.suffix || 'CAD';
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">{prefix}</span>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => form.setValue(fieldConfig.id, e.target.value)}
        className="flex-1"
        placeholder="0.00"
      />
      <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
    </div>
  );
}

// Calculated Field (Read-only, auto-computed)
export function CalculatedField({ fieldConfig, form }: AdvancedFieldProps) {
  const calculateValue = () => {
    try {
      if (!fieldConfig.calculation) return '';
      // Simple calculation parsing - in production, use a proper expression parser
      let formula = fieldConfig.calculation;
      const fieldIds = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      
      fieldIds.forEach((id: string) => {
        const value = form.watch(id);
        formula = formula.replace(new RegExp(`\\b${id}\\b`, 'g'), value || '0');
      });
      
      // Use Function constructor safely for calculation
      const result = new Function(`return ${formula}`)();
      return isNaN(result) ? '' : result.toFixed(2);
    } catch (error) {
      return 'Error';
    }
  };
  
  const calculatedValue = calculateValue();
  
  return (
    <div className="relative">
      <Input
        type="text"
        value={calculatedValue}
        readOnly
        className="bg-muted/50 cursor-not-allowed font-mono"
      />
      <div className="text-xs text-muted-foreground mt-1">
        Auto-calculated: {fieldConfig.calculation}
      </div>
    </div>
  );
}

