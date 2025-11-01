'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { getPagePermissions, setUserPermissions } from '@/lib/page-permissions-actions';

const ROUTE_KEYS = [
  { key: 'yep-portal', label: 'YEP Portal' },
  { key: 'editor', label: 'Editor' },
  { key: 'dashboard', label: 'Dashboard' },
];

export function PagePermissionsManager() {
  const [routesByEmail, setRoutesByEmail] = useState<Record<string, string[]>>({});
  const [selectedEmail, setSelectedEmail] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await getPagePermissions();
    setRoutesByEmail(res.routesByEmail);
  };

  const handleToggle = (routeKey: string) => {
    setSelectedRoutes((prev) =>
      prev.includes(routeKey) ? prev.filter((r) => r !== routeKey) : [...prev, routeKey]
    );
  };

  const handleEdit = (email: string) => {
    setSelectedEmail(email);
    setSelectedRoutes(routesByEmail[email] || []);
  };

  const handleSave = async () => {
    if (!selectedEmail) return;
    setSaving(true);
    try {
      await setUserPermissions(selectedEmail, selectedRoutes);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Permissions</CardTitle>
        <CardDescription>Assign route access to individual users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Existing Assignments</p>
            <div className="border rounded-md divide-y">
              {Object.keys(routesByEmail).length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No assignments yet</div>
              ) : (
                Object.entries(routesByEmail).map(([email, routes]) => (
                  <button
                    key={email}
                    onClick={() => handleEdit(email)}
                    className="w-full text-left p-3 hover:bg-accent/50"
                  >
                    <div className="font-medium text-sm">{email}</div>
                    <div className="text-xs text-muted-foreground">{routes.join(', ') || 'None'}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Edit Assignment</p>
            <Input
              type="email"
              placeholder="user@example.com"
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
            />
            <div className="space-y-2">
              {ROUTE_KEYS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedRoutes.includes(key)}
                    onCheckedChange={() => handleToggle(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saving || !selectedEmail}>
              {saving ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



