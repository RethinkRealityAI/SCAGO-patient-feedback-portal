'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Home,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getParticipants, deleteParticipant } from '@/app/youth-empowerment/actions';
import { YEPParticipant } from '@/lib/youth-empowerment';
import { ParticipantForm } from './participant-form';
import { ParticipantImporter } from './participant-importer';
import { ProfileViewerModal } from '@/components/admin/profile-viewer-modal';

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
  const [ageFilter, setAgeFilter] = useState<'all' | 'under18' | '18-25' | 'over25'>('all');
  const [documentFilter, setDocumentFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [recruitmentFilter, setRecruitmentFilter] = useState<'all' | 'recruited' | 'interviewed' | 'pending'>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<YEPParticipant | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isProfileViewOpen, setIsProfileViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<YEPParticipant | null>(null);
  const [participantToView, setParticipantToView] = useState<YEPParticipant | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadParticipants();
  }, []);

  useEffect(() => {
    filterParticipants();
  }, [participants, searchTerm, statusFilter, regionFilter, ageFilter, documentFilter, recruitmentFilter]);

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

  const filterParticipants = useCallback(() => {
    let filtered = participants;

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        (p.youthParticipant || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.etransferEmailAddress || '').toLowerCase().includes(q) ||
        (p.phoneNumber || '').toLowerCase().includes(q) ||
        (p.mailingAddress || '').toLowerCase().includes(q) ||
        (p.region || '').toLowerCase().includes(q) ||
        (p.projectCategory || '').toLowerCase().includes(q) ||
        (p.emergencyContactRelationship || '').toLowerCase().includes(q) ||
        (p.emergencyContactNumber || '').toLowerCase().includes(q) ||
        (p.assignedMentor || '').toLowerCase().includes(q)
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

    // Age filter
    if (ageFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (p.age == null) return false; // Exclude missing ages when a specific filter is selected
        switch (ageFilter) {
          case 'under18': return p.age < 18;
          case '18-25': return p.age >= 18 && p.age <= 25;
          case 'over25': return p.age > 25;
          default: return true;
        }
      });
    }

    // Document filter
    if (documentFilter !== 'all') {
      filtered = filtered.filter(p => {
        const hasDocuments = p.contractSigned || p.signedSyllabus || p.idProvided || p.proofOfAffiliationWithSCD;
        return documentFilter === 'complete' ? hasDocuments : !hasDocuments;
      });
    }

    // Recruitment filter
    if (recruitmentFilter !== 'all') {
      filtered = filtered.filter(p => {
        switch (recruitmentFilter) {
          case 'recruited': return p.recruited;
          case 'interviewed': return p.interviewed;
          case 'pending': return !p.recruited && !p.interviewed;
          default: return true;
        }
      });
    }

    setFilteredParticipants(filtered);
  }, [participants, searchTerm, statusFilter, regionFilter, ageFilter, documentFilter, recruitmentFilter]);

  const handleEdit = (participant: YEPParticipant) => {
    setSelectedParticipant(participant);
    setIsFormOpen(true);
  };

  const handleView = (participant: YEPParticipant) => {
    setSelectedParticipant(participant);
    setIsViewOpen(true);
  };

  const handleViewProfile = (participant: YEPParticipant) => {
    setParticipantToView(participant);
    setIsProfileViewOpen(true);
  };

  const handleEditFromProfile = () => {
    if (participantToView) {
      setIsProfileViewOpen(false);
      setSelectedParticipant(participantToView);
      setIsFormOpen(true);
    }
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
      return <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-sm px-3 py-1">✓ Approved</Badge>;
    }
    return null; // Don't show pending approval badge
  };

  const getDocumentStatus = (participant: YEPParticipant) => {
    const statuses = [];
    if (participant.contractSigned) statuses.push('✓ Contract');
    if (participant.signedSyllabus) statuses.push('✓ Syllabus');
    if (participant.idProvided) statuses.push('✓ ID');
    if (participant.proofOfAffiliationWithSCD) statuses.push('✓ SCD Proof');
    if (participant.youthProposal) statuses.push('✓ Proposal');
    if (participant.affiliationWithSCD) statuses.push('✓ SCD Affil');
    
    return statuses.length > 0 ? statuses.join(' ') : 'No docs';
  };

  const getRecruitmentStatus = (participant: YEPParticipant) => {
    const statuses = [];
    if (participant.recruited) statuses.push('✓ Recruited');
    if (participant.interviewed) statuses.push('✓ Interviewed');
    if (participant.approved) statuses.push('✓ Approved');
    
    return statuses.length > 0 ? statuses.join(' ') : 'Pending';
  };

  const getDocumentStatusBadges = (participant: YEPParticipant) => {
    const badges = [];
    // Show completed items as green badges
    if (participant.contractSigned) {
      badges.push(<Badge key="contract" variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-300 whitespace-nowrap font-medium">Contract ✓</Badge>);
    }
    if (participant.signedSyllabus) {
      badges.push(<Badge key="syllabus" variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-300 whitespace-nowrap font-medium">Syllabus ✓</Badge>);
    }
    if (participant.idProvided) {
      badges.push(<Badge key="id" variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-300 whitespace-nowrap font-medium">ID ✓</Badge>);
    }
    if (participant.proofOfAffiliationWithSCD) {
      badges.push(<Badge key="scd-proof" variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-300 whitespace-nowrap font-medium">SCD Proof ✓</Badge>);
    }
    if (participant.youthProposal) {
      badges.push(<Badge key="proposal" variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-300 whitespace-nowrap font-medium">Proposal ✓</Badge>);
    }
    // Show pending items as amber/orange badges
    if (!participant.contractSigned) {
      badges.push(<Badge key="contract-pending" variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-300 whitespace-nowrap font-medium">Contract</Badge>);
    }
    if (!participant.signedSyllabus) {
      badges.push(<Badge key="syllabus-pending" variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-300 whitespace-nowrap font-medium">Syllabus</Badge>);
    }
    if (!participant.idProvided) {
      badges.push(<Badge key="id-pending" variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-300 whitespace-nowrap font-medium">ID</Badge>);
    }
    if (!participant.proofOfAffiliationWithSCD) {
      badges.push(<Badge key="scd-proof-pending" variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-300 whitespace-nowrap font-medium">SCD Proof</Badge>);
    }
    if (!participant.youthProposal) {
      badges.push(<Badge key="proposal-pending" variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-300 whitespace-nowrap font-medium">Proposal</Badge>);
    }
    
    return badges;
  };

  const getRecruitmentStatusBadges = (participant: YEPParticipant) => {
    const badges = [];
    if (participant.recruited) {
      badges.push(<Badge key="recruited" variant="default" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-300 whitespace-nowrap font-medium">Recruited ✓</Badge>);
    }
    if (participant.interviewed) {
      badges.push(<Badge key="interviewed" variant="default" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-300 whitespace-nowrap font-medium">Interviewed ✓</Badge>);
    }
    // Show pending recruitment items in gray
    if (!participant.recruited) {
      badges.push(<Badge key="recruited-pending" variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 border-gray-300 whitespace-nowrap font-medium">Recruit</Badge>);
    }
    if (!participant.interviewed) {
      badges.push(<Badge key="interviewed-pending" variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 border-gray-300 whitespace-nowrap font-medium">Interview</Badge>);
    }
    return badges;
  };

  const regions = Array.from(new Set(participants.map(p => p.region).filter((region): region is string => !!region && region.trim() !== '')));

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
            <div className="flex gap-2">
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </Button>
              <Button variant="secondary" onClick={() => setIsImporterOpen(true)}>
                Import CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            {/* Search */}
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
            
            {/* All Filters in One Row */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex flex-wrap gap-4 flex-1">
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
                
                <Select value={ageFilter} onValueChange={(value: any) => setAgeFilter(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Age" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="under18">Under 18</SelectItem>
                    <SelectItem value="18-25">18-25</SelectItem>
                    <SelectItem value="over25">Over 25</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={documentFilter} onValueChange={(value: any) => setDocumentFilter(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Documents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={recruitmentFilter} onValueChange={(value: any) => setRecruitmentFilter(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Recruitment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recruitment</SelectItem>
                    <SelectItem value="recruited">Recruited</SelectItem>
                    <SelectItem value="interviewed">Interviewed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Clear Filters Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setRegionFilter('all');
                  setAgeFilter('all');
                  setDocumentFilter('all');
                  setRecruitmentFilter('all');
                }}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="relative rounded-lg border shadow-sm overflow-x-auto">
            {/* scroll cue - more visible arrow */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-background via-background/80 to-transparent flex items-start justify-end pr-3 pt-4 z-20">
              <ArrowRight className="h-6 w-6 text-muted-foreground animate-pulse" />
            </div>
            <Table className="[&_tr]:border-b [&_th]:border-r [&_td]:border-r [&_tr:last-child]:border-b-0 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0">
              <TableHeader>
                <TableRow className="bg-muted/50 h-14 hover:bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-10 w-[200px] font-semibold">Participant</TableHead>
                  <TableHead className="min-w-[200px] font-semibold">Contact Info</TableHead>
                  <TableHead className="min-w-[450px] font-semibold">Status & Documents</TableHead>
                  <TableHead className="min-w-[120px] font-semibold">Region</TableHead>
                  <TableHead className="min-w-[80px] font-semibold text-center">Age</TableHead>
                  <TableHead className="min-w-[180px] font-semibold">Project</TableHead>
                  <TableHead className="min-w-[150px] font-semibold">Emergency Contact</TableHead>
                  <TableHead className="min-w-[140px] font-semibold">Mentor</TableHead>
                  <TableHead className="min-w-[100px] font-semibold">File</TableHead>
                  <TableHead className="w-[60px] sticky right-0 bg-muted/50 z-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow className="h-24 hover:bg-transparent">
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <User className="h-12 w-12 opacity-20" />
                        <p className="text-sm font-medium">No participants found</p>
                        <p className="text-xs">Try adjusting your filters or add a new participant</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipants.map((participant) => (
                    <TableRow key={participant.id} className="h-auto hover:bg-muted/40 transition-all duration-200 group">
                      <TableCell className="sticky left-0 bg-background group-hover:bg-muted/40 w-[200px] py-4 transition-colors">
                        <div className="space-y-2">
                          <div className="font-semibold text-sm truncate" title={participant.youthParticipant}>
                            {participant.youthParticipant}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate" title={participant.email}>{participant.email}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProfile(participant)}
                            className="h-7 text-xs px-2 py-1 gap-1.5 w-full"
                          >
                            <User className="h-3 w-3" />
                            View Profile
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1.5">
                          {participant.phoneNumber && (
                            <div className="text-xs flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span>{participant.phoneNumber}</span>
                            </div>
                          )}
                          {participant.etransferEmailAddress && (
                            <div className="text-xs flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate" title={participant.etransferEmailAddress}>
                                {participant.etransferEmailAddress}
                              </span>
                            </div>
                          )}
                          {participant.mailingAddress && (
                            <div className="text-xs flex items-start gap-1.5">
                              <Home className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              <span className="line-clamp-2 leading-tight" title={participant.mailingAddress}>
                                {participant.mailingAddress}
                              </span>
                            </div>
                          )}
                          {!participant.phoneNumber && !participant.etransferEmailAddress && !participant.mailingAddress && (
                            <span className="text-muted-foreground text-xs italic">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-2.5">
                          <div className="flex items-center">
                            {getStatusBadge(participant)}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Documents:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {getDocumentStatusBadges(participant)}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Recruitment:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {getRecruitmentStatusBadges(participant)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium">{participant.region}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        {participant.age ? (
                          <span className="font-medium text-sm">{participant.age}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {participant.projectCategory ? (
                          <div className="space-y-1">
                            <div className="font-medium text-sm line-clamp-1" title={participant.projectCategory}>
                              {participant.projectCategory}
                            </div>
                            {participant.projectInANutshell && (
                              <div className="text-xs text-muted-foreground line-clamp-2 leading-tight" title={participant.projectInANutshell}>
                                {participant.projectInANutshell}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {participant.emergencyContactRelationship && participant.emergencyContactNumber ? (
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{participant.emergencyContactRelationship}</div>
                            <div className="text-xs text-muted-foreground">{participant.emergencyContactNumber}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {participant.assignedMentor ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{participant.assignedMentor}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {participant.fileUrl || participant.healthCardUrl || participant.photoIdUrl || participant.consentFormUrl ? (
                          <div className="flex flex-col gap-1">
                            {participant.fileUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(participant.fileUrl, '_blank')}
                                className="gap-1.5 h-7 text-xs"
                              >
                                <Download className="h-3 w-3" />
                                File
                              </Button>
                            )}
                            {participant.healthCardUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(participant.healthCardUrl, '_blank')}
                                className="gap-1.5 h-7 text-xs"
                              >
                                <Download className="h-3 w-3" />
                                Health Card
                              </Button>
                            )}
                            {participant.photoIdUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(participant.photoIdUrl, '_blank')}
                                className="gap-1.5 h-7 text-xs"
                              >
                                <Download className="h-3 w-3" />
                                Photo ID
                              </Button>
                            )}
                            {participant.consentFormUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(participant.consentFormUrl, '_blank')}
                                className="gap-1.5 h-7 text-xs"
                              >
                                <Download className="h-3 w-3" />
                                Consent
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">No files</span>
                        )}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background group-hover:bg-muted/40 py-4 transition-colors">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted opacity-70 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="font-semibold">Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewProfile(participant)} className="cursor-pointer">
                              <User className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleView(participant)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(participant)} className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(participant)}
                              className="text-destructive focus:text-destructive cursor-pointer"
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
      <ProfileViewerModal
        open={isProfileViewOpen}
        onOpenChange={setIsProfileViewOpen}
        profile={participantToView}
        role="participant"
        onEdit={handleEditFromProfile}
      />

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
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{selectedParticipant.youthParticipant}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Age</label>
                    <p className="text-sm">{selectedParticipant.age || 'Not provided'}</p>
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
                    <label className="text-sm font-medium text-muted-foreground">Region</label>
                    <p className="text-sm">{selectedParticipant.region}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Mailing Address</label>
                    <p className="text-sm">{selectedParticipant.mailingAddress || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-sm">{selectedParticipant.dob ? new Date(selectedParticipant.dob).toLocaleDateString() : 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {(selectedParticipant.emergencyContactRelationship || selectedParticipant.emergencyContactNumber) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                      <p className="text-sm">{selectedParticipant.emergencyContactRelationship || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                      <p className="text-sm">{selectedParticipant.emergencyContactNumber || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Project Information */}
              {(selectedParticipant.projectCategory || selectedParticipant.projectInANutshell || selectedParticipant.duties) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Project Information</h3>
                  <div className="space-y-3">
                    {selectedParticipant.projectCategory && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Project Category</label>
                        <p className="text-sm">{selectedParticipant.projectCategory}</p>
                      </div>
                    )}
                    {selectedParticipant.projectInANutshell && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Project in a Nutshell</label>
                        <p className="text-sm">{selectedParticipant.projectInANutshell}</p>
                      </div>
                    )}
                    {selectedParticipant.duties && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Duties</label>
                        <p className="text-sm">{selectedParticipant.duties}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status and Documents */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Status & Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approval Status</label>
                    <div className="text-sm">{getStatusBadge(selectedParticipant)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Canadian Status</label>
                    <p className="text-sm">{selectedParticipant.canadianStatus}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Document Status</label>
                    <p className="text-sm">{getDocumentStatus(selectedParticipant)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Recruitment Status</label>
                    <p className="text-sm">{getRecruitmentStatus(selectedParticipant)}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(selectedParticipant.youthProposal || selectedParticipant.affiliationWithSCD || selectedParticipant.scagoCounterpart || selectedParticipant.notes) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                  <div className="space-y-3">
                    {selectedParticipant.youthProposal && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Youth Proposal</label>
                        <p className="text-sm">{selectedParticipant.youthProposal}</p>
                      </div>
                    )}
                    {selectedParticipant.affiliationWithSCD && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Affiliation with SCD</label>
                        <p className="text-sm">{selectedParticipant.affiliationWithSCD}</p>
                      </div>
                    )}
                    {selectedParticipant.scagoCounterpart && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">SCAGO Counterpart</label>
                        <p className="text-sm">{selectedParticipant.scagoCounterpart}</p>
                      </div>
                    )}
                    {selectedParticipant.notes && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Notes</label>
                        <p className="text-sm">{selectedParticipant.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mentor Assignment */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Mentor Assignment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assigned Mentor</label>
                    <p className="text-sm">{selectedParticipant.assignedMentor || 'Not assigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Availability</label>
                    <p className="text-sm">{selectedParticipant.availability || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsViewOpen(false);
                if (selectedParticipant) {
                  handleViewProfile(selectedParticipant);
                }
              }}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              View Full Profile
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setIsViewOpen(false);
                handleEdit(selectedParticipant!);
              }}>
                Edit Participant
              </Button>
            </div>
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
