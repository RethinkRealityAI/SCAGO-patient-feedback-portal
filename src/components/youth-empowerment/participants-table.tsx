'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Download, 
  Search, 
  Filter, 
  Plus,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Mail,
  MapPin,
  Calendar,
  Phone,
  CreditCard,
  Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getParticipants, deleteParticipant } from '@/app/youth-empowerment/actions';
import { YEPParticipant } from '@/lib/youth-empowerment';
import { ParticipantForm } from './participant-form';
import { ParticipantImporter } from './participant-importer';

interface ParticipantsTableProps {
  onRefresh?: () => void;
}

export function ParticipantsTable({ onRefresh }: ParticipantsTableProps) {
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<YEPParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedParticipant, setSelectedParticipant] = useState<YEPParticipant | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<YEPParticipant | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadParticipants();
  }, []);

  useEffect(() => {
    filterParticipants();
  }, [participants, searchTerm, statusFilter, regionFilter]);

  const loadParticipants = async () => {
    setIsLoading(true);
    try {
      const data = await getParticipants();
      setParticipants(data);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load participants',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterParticipants = () => {
    let filtered = participants;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.youthParticipant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.etransferEmailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mailingAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.region.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => 
        statusFilter === 'approved' ? p.approved : !p.approved
      );
    }

    // Region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter(p => p.region === regionFilter);
    }

    setFilteredParticipants(filtered);
  };

  const handleEdit = (participant: YEPParticipant) => {
    setSelectedParticipant(participant);
    setIsFormOpen(true);
  };

  const handleView = (participant: YEPParticipant) => {
    setSelectedParticipant(participant);
    setIsViewOpen(true);
  };

  const handleDelete = (participant: YEPParticipant) => {
    setParticipantToDelete(participant);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!participantToDelete) return;

    try {
      const result = await deleteParticipant(participantToDelete.id);
      if (result.success) {
        toast({
          title: 'Participant Deleted',
          description: 'Participant has been removed from the system.',
        });
        loadParticipants();
        onRefresh?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete participant',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting participant:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteOpen(false);
      setParticipantToDelete(null);
    }
  };

  const handleFormSuccess = () => {
    loadParticipants();
    onRefresh?.();
  };

  const getStatusBadge = (participant: YEPParticipant) => {
    if (participant.approved) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getDocumentStatus = (participant: YEPParticipant) => {
    const statuses = [];
    if (participant.contractSigned) statuses.push('Contract');
    if (participant.signedSyllabus) statuses.push('Syllabus');
    if (participant.idProvided) statuses.push('ID');
    if (participant.proofOfAffiliationWithSCD) statuses.push('SCD Proof');
    
    return statuses.length > 0 ? statuses.join(', ') : 'None';
  };

  const regions = Array.from(new Set(participants.map(p => p.region)));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Youth Participants</CardTitle>
          <CardDescription>Loading participants...</CardDescription>
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
                <User className="h-5 w-5" />
                Youth Participants ({filteredParticipants.length})
              </CardTitle>
              <CardDescription>
                Manage youth participants in the empowerment program
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Participant
            </Button>
            <Button variant="secondary" onClick={() => setIsImporterOpen(true)}>
              Import CSV
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
                  placeholder="Search participants..."
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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Recruitment</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No participants found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{participant.youthParticipant}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {participant.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {participant.phoneNumber && (
                            <div className="text-sm flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {participant.phoneNumber}
                            </div>
                          )}
                          {participant.etransferEmailAddress && (
                            <div className="text-sm flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {participant.etransferEmailAddress}
                            </div>
                          )}
                          {participant.mailingAddress && (
                            <div className="text-sm flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              <span className="truncate max-w-[200px]" title={participant.mailingAddress}>
                                {participant.mailingAddress}
                              </span>
                            </div>
                          )}
                          {!participant.phoneNumber && !participant.etransferEmailAddress && !participant.mailingAddress && (
                            <span className="text-muted-foreground text-sm">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(participant)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {participant.region}
                        </div>
                      </TableCell>
                      <TableCell>
                        {participant.age ? (
                          <span className="text-sm">{participant.age}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {participant.projectCategory ? (
                          <div className="text-sm">
                            <div className="font-medium">{participant.projectCategory}</div>
                            {participant.duties && (
                              <div className="text-muted-foreground truncate max-w-[150px]" title={participant.duties}>
                                {participant.duties}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {participant.recruited && (
                            <Badge variant="default" className="text-xs">
                              Recruited
                            </Badge>
                          )}
                          {participant.interviewed && (
                            <Badge variant="outline" className="text-xs">
                              Interviewed
                            </Badge>
                          )}
                          {!participant.recruited && !participant.interviewed && (
                            <span className="text-muted-foreground text-sm">Pending</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {participant.assignedMentor || (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getDocumentStatus(participant)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {participant.fileUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(participant.fileUrl, '_blank')}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No file</span>
                        )}
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
                            <DropdownMenuItem onClick={() => handleView(participant)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(participant)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(participant)}
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
      <ParticipantForm
        participant={selectedParticipant || undefined}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedParticipant(null);
        }}
        onSuccess={handleFormSuccess}
      />

      <ParticipantImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImported={handleFormSuccess}
      />

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Participant Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedParticipant?.youthParticipant}
            </DialogDescription>
          </DialogHeader>
          {selectedParticipant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{selectedParticipant.youthParticipant}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{selectedParticipant.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-sm">{selectedParticipant.phoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">E-transfer Email</label>
                  <p className="text-sm">{selectedParticipant.etransferEmailAddress || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mailing Address</label>
                  <p className="text-sm">{selectedParticipant.mailingAddress || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Region</label>
                  <p className="text-sm">{selectedParticipant.region}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="text-sm">{getStatusBadge(selectedParticipant)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Canadian Status</label>
                  <p className="text-sm">{selectedParticipant.canadianStatus}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p className="text-sm">{new Date(selectedParticipant.dob).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Mentor</label>
                  <p className="text-sm">{selectedParticipant.assignedMentor || 'Not assigned'}</p>
                </div>
              </div>
              {selectedParticipant.youthProposal && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Youth Proposal</label>
                  <p className="text-sm mt-1">{selectedParticipant.youthProposal}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Document Status</label>
                <p className="text-sm mt-1">{getDocumentStatus(selectedParticipant)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewOpen(false);
              handleEdit(selectedParticipant!);
            }}>
              Edit Participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Participant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {participantToDelete?.youthParticipant}? 
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
