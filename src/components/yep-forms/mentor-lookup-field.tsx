'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User, X, Plus } from 'lucide-react';
import { getMentors } from '@/app/youth-empowerment/actions';
import { YEPMentor } from '@/lib/youth-empowerment';

interface MentorLookupFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (mentor: YEPMentor) => void;
  disabled?: boolean;
  placeholder?: string;
  allowCreate?: boolean;
}

export function MentorLookupField({ 
  value, 
  onChange, 
  onSelect, 
  disabled, 
  placeholder = "Search mentors...",
  allowCreate = false 
}: MentorLookupFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mentors, setMentors] = useState<YEPMentor[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<YEPMentor | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Load mentors when component mounts
  useEffect(() => {
    loadMentors();
  }, []);

  // Search mentors when search term changes
  useEffect(() => {
    if (searchTerm.length > 2) {
      searchMentors();
    } else {
      setShowResults(false);
    }
  }, [searchTerm]);

  const loadMentors = async () => {
    try {
      setIsLoading(true);
      const result = await getMentors();
      setMentors(result as any);
    } catch (error) {
      console.error('Error loading mentors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchMentors = async () => {
    try {
      setIsLoading(true);
      const result = await getMentors();
      const filtered = (result as any[]).filter((mentor: any) =>
        (mentor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mentor.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setMentors(filtered as any);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching mentors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (mentor: YEPMentor) => {
    setSelectedMentor(mentor);
    setSearchTerm(mentor.name);
    setShowResults(false);
    onChange?.(mentor.id);
    onSelect?.(mentor);
  };

  const handleClear = () => {
    setSelectedMentor(null);
    setSearchTerm('');
    setShowResults(false);
    onChange?.('');
  };

  const handleCreateNew = () => {
    // TODO: Open create mentor dialog
    console.log('Create new mentor');
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="pl-10"
          onFocus={() => {
            if (searchTerm.length > 2) {
              setShowResults(true);
            }
          }}
        />
        {isLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}
        {selectedMentor && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-1 h-8 w-8 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && mentors.length > 0 && (
        <Card className="absolute z-50 w-full">
          <CardContent className="p-2">
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {mentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                  onClick={() => handleSelect(mentor)}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{mentor.name}</div>
                      <div className="text-sm text-muted-foreground">{mentor.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {mentor.assignedStudents.length} students
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {allowCreate && (
              <div className="border-t pt-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Mentor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedMentor && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <User className="h-4 w-4" />
          <div className="flex-1">
            <div className="font-medium">{selectedMentor.name}</div>
            <div className="text-sm text-muted-foreground">{selectedMentor.title}</div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {selectedMentor.assignedStudents.length} students
          </Badge>
        </div>
      )}

      {showResults && mentors.length === 0 && searchTerm.length > 2 && (
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No mentors found</p>
              {allowCreate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Mentor
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
