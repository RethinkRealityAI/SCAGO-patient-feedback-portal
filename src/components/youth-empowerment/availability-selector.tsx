'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, Plus, X } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  day: string;
  available: boolean;
  timeSlots: TimeSlot[];
}

interface AvailabilitySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const TIME_OPTIONS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

export function AvailabilitySelector({ value = '', onChange, disabled = false }: AvailabilitySelectorProps) {
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const isInitialized = useRef(false);
  const lastValue = useRef(value);

  // Initialize availability from value
  useEffect(() => {
    if (value !== lastValue.current) {
      lastValue.current = value;
      
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            setAvailability(parsed);
            isInitialized.current = true;
            return;
          }
        } catch (e) {
          // If parsing fails, try to parse as old format
          const days = DAYS_OF_WEEK.map(day => ({
            day,
            available: value.toLowerCase().includes(day.toLowerCase()),
            timeSlots: []
          }));
          setAvailability(days);
          isInitialized.current = true;
          return;
        }
      }
      
      // Initialize with empty availability
      const initialAvailability = DAYS_OF_WEEK.map(day => ({
        day,
        available: false,
        timeSlots: []
      }));
      setAvailability(initialAvailability);
      isInitialized.current = true;
    }
  }, [value]);

  // Update parent when availability changes (but avoid infinite loops)
  useEffect(() => {
    if (isInitialized.current) {
      const jsonValue = JSON.stringify(availability);
      // Only call onChange if the value is actually different
      if (jsonValue !== value) {
        // Use a small timeout to debounce rapid changes
        const timeoutId = setTimeout(() => {
          onChange(jsonValue);
        }, 0);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [availability, onChange, value]);

  const toggleDayAvailability = useCallback((dayIndex: number) => {
    setAvailability(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? { ...day, available: !day.available, timeSlots: !day.available ? [] : day.timeSlots }
          : day
      )
    );
  }, []);

  const addTimeSlot = useCallback((dayIndex: number) => {
    setAvailability(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? { 
              ...day, 
              timeSlots: [...day.timeSlots, { start: '9:00 AM', end: '5:00 PM' }]
            }
          : day
      )
    );
  }, []);

  const removeTimeSlot = useCallback((dayIndex: number, slotIndex: number) => {
    setAvailability(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? { 
              ...day, 
              timeSlots: day.timeSlots.filter((_, i) => i !== slotIndex)
            }
          : day
      )
    );
  }, []);

  const updateTimeSlot = useCallback((dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? {
              ...day,
              timeSlots: day.timeSlots.map((slot, i) => 
                i === slotIndex ? { ...slot, [field]: value } : slot
              )
            }
          : day
      )
    );
  }, []);

  const getAvailableDays = useCallback(() => {
    return availability.filter(day => day.available);
  }, [availability]);

  const formatAvailabilitySummary = useCallback(() => {
    const availableDays = getAvailableDays();
    if (availableDays.length === 0) return 'No availability set';
    
    return availableDays.map(day => {
      if (day.timeSlots.length === 0) {
        return day.day;
      }
      const timeRanges = day.timeSlots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
      return `${day.day}: ${timeRanges}`;
    }).join('; ');
  }, [getAvailableDays]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Availability Summary: {formatAvailabilitySummary()}</span>
      </div>

      <div className="grid gap-4">
        {availability.map((day, dayIndex) => (
          <Card key={day.day} className={`transition-all ${day.available ? 'border-primary' : 'border-muted'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id={`day-${dayIndex}`}
                  checked={day.available}
                  onCheckedChange={() => toggleDayAvailability(dayIndex)}
                  disabled={disabled}
                />
                <Label htmlFor={`day-${dayIndex}`} className="text-base font-medium cursor-pointer">
                  {day.day}
                </Label>
              </div>
            </CardHeader>
            
            {day.available && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {day.timeSlots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Time Slot {slotIndex + 1}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Start</Label>
                          <Select
                            value={slot.start}
                            onValueChange={(value) => updateTimeSlot(dayIndex, slotIndex, 'start', value)}
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <span className="text-muted-foreground">to</span>
                        
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">End</Label>
                          <Select
                            value={slot.end}
                            onValueChange={(value) => updateTimeSlot(dayIndex, slotIndex, 'end', value)}
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                          disabled={disabled}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(dayIndex)}
                    disabled={disabled}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Slot
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
