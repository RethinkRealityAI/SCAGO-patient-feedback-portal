'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  User,
  Users,
  GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getMentors, deleteMentor, getParticipants } from '@/app/youth-empowerment/actions';
import { YEPMentor, YEPParticipant } from '@/lib/youth-empowerment';
import { MentorForm } from './mentor-form';

interface MentorsTableProps {
  onRefresh?: () => void;
}

export function MentorsTable({ onRefresh }: MentorsTableProps) {
  const [mentors, setMentors] = useState<YEPMentor[]>([]);
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<YEPMentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMentor, setSelectedMentor] = useState<YEPMentor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [mentorToDelete, setMentorToDelete] = useState<YEPMentor | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterMentors();
  }, [mentors, searchTerm]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mentorsData, participantsData] = await Promise.all([
        getMentors(),
        getParticipants(),
      ]);
      setMentors(mentorsData);
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load mentors',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterMentors = () => {
    let filtered = mentors;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMentors(filtered);
  };

  const handleEdit = (mentor: YEPMentor) => {
    setSelectedMentor(mentor);
    setIsFormOpen(true);
  };

  const handleView = (mentor: YEPMentor) => {
    setSelectedMentor(mentor);
    setIsViewOpen(true);
  };

  const handleDelete = (mentor: YEPMentor) => {
    setMentorToDelete(mentor);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!mentorToDelete) return;

    try {
      const result = await deleteMentor(mentorToDelete.id);
      if (result.success) {
        toast({
          title: 'Mentor Deleted',
          description: 'Mentor has been removed from the system.',
        });
        loadData();
        onRefresh?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete mentor',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting mentor:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteOpen(false);
      setMentorToDelete(null);
    }
  };

  const handleFormSuccess = () => {
    loadData();
    onRefresh?.();
  };

  const getAssignedStudents = (mentor: YEPMentor) => {
    return participants.filter(p => mentor.assignedStudents.includes(p.id));
  };

  const getStudentNames = (mentor: YEPMentor) => {
    const assignedStudents = getAssignedStudents(mentor);
    return assignedStudents.map(s => s.youthParticipant).join(', ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mentors</CardTitle>
          <CardDescription>Loading mentors...</CardDescription>
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
                <GraduationCap className="h-5 w-5" />
                Mentors ({filteredMentors.length})
              </CardTitle>
              <CardDescription>
                Manage mentors and their assigned participants
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Mentor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search mentors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Assigned Students</TableHead>
                  <TableHead>Student Count</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMentors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No mentors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMentors.map((mentor) => {
                    const assignedStudents = getAssignedStudents(mentor);
                    return (
                      <TableRow key={mentor.id}>
                        <TableCell>
                          <div className="font-medium">{mentor.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{mentor.title}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {assignedStudents.length > 0 ? (
                              <div className="text-sm">
                                {assignedStudents.slice(0, 2).map(student => (
                                  <div key={student.id} className="truncate">
                                    {student.youthParticipant}
                                  </div>
                                ))}
                                {assignedStudents.length > 2 && (
                                  <div className="text-muted-foreground">
                                    +{assignedStudents.length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No students assigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{assignedStudents.length}</span>
                          </div>
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
                              <DropdownMenuItem onClick={() => handleView(mentor)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(mentor)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(mentor)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Forms and Modals */}
      <MentorForm
        mentor={selectedMentor}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedMentor(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mentor Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedMentor?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedMentor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{selectedMentor.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="text-sm">{selectedMentor.title}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Students</label>
                <div className="mt-2 space-y-2">
                  {getAssignedStudents(selectedMentor).length > 0 ? (
                    getAssignedStudents(selectedMentor).map(student => (
                      <div key={student.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <div className="font-medium text-sm">{student.youthParticipant}</div>
                          <div className="text-xs text-muted-foreground">{student.region} • {student.email}</div>
                        </div>
                        <Badge variant={student.approved ? "default" : "secondary"}>
                          {student.approved ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No students assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewOpen(false);
              handleEdit(selectedMentor!);
            }}>
              Edit Mentor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mentor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {mentorToDelete?.name}? 
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
