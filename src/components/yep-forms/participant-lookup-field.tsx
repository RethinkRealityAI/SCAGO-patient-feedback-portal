'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User, X, Plus } from 'lucide-react';
import { getParticipants } from '@/app/youth-empowerment/actions';
import { YEPParticipant } from '@/lib/youth-empowerment';

interface ParticipantLookupFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (participant: YEPParticipant) => void;
  disabled?: boolean;
  placeholder?: string;
  allowCreate?: boolean;
}

export function ParticipantLookupField({ 
  value, 
  onChange, 
  onSelect, 
  disabled, 
  placeholder = "Search participants...",
  allowCreate = false 
}: ParticipantLookupFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<YEPParticipant | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Load participants when component mounts
  useEffect(() => {
    loadParticipants();
  }, []);

  // Search participants when search term changes
  useEffect(() => {
    if (searchTerm.length > 2) {
      searchParticipants();
    } else {
      setShowResults(false);
    }
  }, [searchTerm]);

  const loadParticipants = async () => {
    try {
      setIsLoading(true);
      const result = await getParticipants();
      setParticipants(result as any);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchParticipants = async () => {
    try {
      setIsLoading(true);
      const result = await getParticipants();
      const filtered = (result as any[]).filter((participant: any) =>
        (participant.youthParticipant || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (participant.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (participant.region || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setParticipants(filtered as any);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching participants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (participant: YEPParticipant) => {
    setSelectedParticipant(participant);
    setSearchTerm(participant.youthParticipant);
    setShowResults(false);
    onChange?.(participant.id);
    onSelect?.(participant);
  };

  const handleClear = () => {
    setSelectedParticipant(null);
    setSearchTerm('');
    setShowResults(false);
    onChange?.('');
  };

  const handleCreateNew = () => {
    // TODO: Open create participant dialog
    console.log('Create new participant');
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
        {selectedParticipant && !isLoading && (
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

      {showResults && participants.length > 0 && (
        <Card className="absolute z-50 w-full">
          <CardContent className="p-2">
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                  onClick={() => handleSelect(participant)}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{participant.youthParticipant}</div>
                      <div className="text-sm text-muted-foreground">
                        {participant.email} • {participant.region}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.approved && (
                      <Badge variant="secondary" className="text-xs">Approved</Badge>
                    )}
                    {participant.assignedMentor && (
                      <Badge variant="outline" className="text-xs">Mentor Assigned</Badge>
                    )}
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
                  Create New Participant
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedParticipant && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <User className="h-4 w-4" />
          <div className="flex-1">
            <div className="font-medium">{selectedParticipant.youthParticipant}</div>
            <div className="text-sm text-muted-foreground">
              {selectedParticipant.email} • {selectedParticipant.region}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {selectedParticipant.approved && (
              <Badge variant="secondary" className="text-xs">Approved</Badge>
            )}
            {selectedParticipant.assignedMentor && (
              <Badge variant="outline" className="text-xs">Mentor Assigned</Badge>
            )}
          </div>
        </div>
      )}

      {showResults && participants.length === 0 && searchTerm.length > 2 && (
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No participants found</p>
              {allowCreate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Participant
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
