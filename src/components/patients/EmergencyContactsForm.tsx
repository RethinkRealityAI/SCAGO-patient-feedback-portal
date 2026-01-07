'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Star } from 'lucide-react';
import { EmergencyContact } from '@/types/patient';

interface EmergencyContactsFormProps {
    contacts: EmergencyContact[];
    onChange: (contacts: EmergencyContact[]) => void;
}

const RELATIONSHIPS = [
    'Parent',
    'Spouse',
    'Sibling',
    'Child',
    'Grandparent',
    'Friend',
    'Caregiver',
    'Other',
];

export function EmergencyContactsForm({ contacts, onChange }: EmergencyContactsFormProps) {
    const [newContact, setNewContact] = useState<Partial<EmergencyContact>>({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        isPrimary: false,
    });

    const handleAddContact = () => {
        if (newContact.name && newContact.relationship && newContact.phone) {
            const contact: EmergencyContact = {
                name: newContact.name,
                relationship: newContact.relationship,
                phone: newContact.phone,
                email: newContact.email || '',
                isPrimary: contacts.length === 0 ? true : newContact.isPrimary || false,
            };
            onChange([...contacts, contact]);
            setNewContact({
                name: '',
                relationship: '',
                phone: '',
                email: '',
                isPrimary: false,
            });
        }
    };

    const handleRemoveContact = (index: number) => {
        const newContacts = contacts.filter((_, i) => i !== index);
        // If we removed the primary contact, make the first one primary
        if (contacts[index].isPrimary && newContacts.length > 0) {
            newContacts[0].isPrimary = true;
        }
        onChange(newContacts);
    };

    const handleSetPrimary = (index: number) => {
        const newContacts = contacts.map((contact, i) => ({
            ...contact,
            isPrimary: i === index,
        }));
        onChange(newContacts);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Emergency Contacts</CardTitle>
                <CardDescription>
                    Add emergency contacts for this patient
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Existing Contacts */}
                {contacts.length > 0 && (
                    <div className="space-y-3">
                        {contacts.map((contact, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{contact.name}</span>
                                        {contact.isPrimary && (
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {contact.relationship} • {contact.phone}
                                        {contact.email && ` • ${contact.email}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!contact.isPrimary && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSetPrimary(index)}
                                        >
                                            Set Primary
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveContact(index)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add New Contact Form */}
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium">Add New Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="contact-name">Name *</Label>
                            <Input
                                id="contact-name"
                                placeholder="Full name"
                                value={newContact.name}
                                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-relationship">Relationship *</Label>
                            <Select
                                value={newContact.relationship}
                                onValueChange={(value) => setNewContact({ ...newContact, relationship: value })}
                            >
                                <SelectTrigger id="contact-relationship">
                                    <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                                <SelectContent>
                                    {RELATIONSHIPS.map((rel) => (
                                        <SelectItem key={rel} value={rel}>
                                            {rel}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-phone">Phone *</Label>
                            <Input
                                id="contact-phone"
                                type="tel"
                                placeholder="(555) 123-4567"
                                value={newContact.phone}
                                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-email">Email</Label>
                            <Input
                                id="contact-email"
                                type="email"
                                placeholder="email@example.com"
                                value={newContact.email}
                                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleAddContact}
                        disabled={!newContact.name || !newContact.relationship || !newContact.phone}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Emergency Contact
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
