'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Plus,
  Calendar,
  Users,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getWorkshops, deleteWorkshop, getWorkshopAttendance } from '@/app/youth-empowerment/actions';
import { YEPWorkshop } from '@/lib/youth-empowerment';
import { WorkshopForm } from './workshop-form';
import { AttendanceForm } from './attendance-form';

interface WorkshopsTableProps {
  onRefresh?: () => void;
}

export function WorkshopsTable({ onRefresh }: WorkshopsTableProps) {
  const [workshops, setWorkshops] = useState<YEPWorkshop[]>([]);
  const [filteredWorkshops, setFilteredWorkshops] = useState<YEPWorkshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [selectedWorkshop, setSelectedWorkshop] = useState<YEPWorkshop | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [workshopToDelete, setWorkshopToDelete] = useState<YEPWorkshop | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadWorkshops();
  }, []);

  useEffect(() => {
    filterWorkshops();
  }, [workshops, searchTerm, statusFilter]);

  const loadWorkshops = async () => {
    setIsLoading(true);
    try {
      const data = await getWorkshops();
      setWorkshops(data);
    } catch (error) {
      console.error('Error loading workshops:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workshops',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterWorkshops = () => {
    let filtered = workshops;
    const now = new Date();

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(w => 
        w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (w.location && w.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => {
        const workshopDate = new Date(w.date);
        return statusFilter === 'upcoming' ? workshopDate > now : workshopDate <= now;
      });
    }

    setFilteredWorkshops(filtered);
  };

  const handleEdit = (workshop: YEPWorkshop) => {
    setSelectedWorkshop(workshop);
    setIsFormOpen(true);
  };

  const handleView = (workshop: YEPWorkshop) => {
    setSelectedWorkshop(workshop);
    setIsViewOpen(true);
  };

  const handleDelete = (workshop: YEPWorkshop) => {
    setWorkshopToDelete(workshop);
    setIsDeleteOpen(true);
  };

  const handleMarkAttendance = (workshop: YEPWorkshop) => {
    setSelectedWorkshop(workshop);
    setIsAttendanceOpen(true);
  };

  const confirmDelete = async () => {
    if (!workshopToDelete) return;

    try {
      const result = await deleteWorkshop(workshopToDelete.id);
      if (result.success) {
        toast({
          title: 'Workshop Deleted',
          description: 'Workshop has been removed from the system.',
        });
        loadWorkshops();
        onRefresh?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete workshop',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting workshop:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteOpen(false);
      setWorkshopToDelete(null);
    }
  };

  const handleFormSuccess = () => {
    loadWorkshops();
    onRefresh?.();
  };

  const getStatusBadge = (workshop: YEPWorkshop) => {
    const now = new Date();
    const workshopDate = new Date(workshop.date);
    
    if (workshopDate > now) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Upcoming</Badge>;
    }
    return <Badge variant="secondary">Past</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workshops</CardTitle>
          <CardDescription>Loading workshops...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Workshops ({filteredWorkshops.length})
              </CardTitle>
              <CardDescription>
                Manage workshops and track attendance
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Workshop
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workshops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workshops</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workshop</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkshops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No workshops found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkshops.map((workshop) => (
                    <TableRow key={workshop.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{workshop.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {workshop.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(workshop.date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(workshop)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleView(workshop)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(workshop)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkAttendance(workshop)}>
                              <Users className="mr-2 h-4 w-4" />
                              Mark Attendance
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(workshop)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Forms and Modals */}
      <WorkshopForm
        workshop={selectedWorkshop || undefined}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedWorkshop(null);
          handleFormSuccess(); // Refresh the data when form closes
        }}
        onSuccess={handleFormSuccess}
      />

      <AttendanceForm
        isOpen={isAttendanceOpen}
        onClose={() => {
          setIsAttendanceOpen(false);
          setSelectedWorkshop(null);
        }}
        onSuccess={handleFormSuccess}
        preselectedWorkshop={selectedWorkshop?.id}
      />

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workshop Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedWorkshop?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedWorkshop && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="text-sm">{selectedWorkshop.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <p className="text-sm">{formatDate(selectedWorkshop.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-sm">{selectedWorkshop.location || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Capacity</label>
                  <p className="text-sm">{selectedWorkshop.capacity || 'No limit'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="text-sm">{getStatusBadge(selectedWorkshop)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Feedback Survey</label>
                  <p className="text-sm">
                    {selectedWorkshop.feedbackSurveyId ? 'Survey attached' : 'No survey'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1">{selectedWorkshop.description}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewOpen(false);
              handleEdit(selectedWorkshop!);
            }}>
              Edit Workshop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workshop</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{workshopToDelete?.title}"? 
              This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
