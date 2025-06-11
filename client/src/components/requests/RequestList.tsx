import React from 'react';
import { Request, User } from '@shared/schema';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface RequestListProps {
  requests: Request[];
  users?: User[];
  isAdmin?: boolean;
  onUpdateStatus?: (requestId: number, status: 'approved' | 'rejected', resolution: string) => Promise<void>;
}

const RequestList: React.FC<RequestListProps> = ({ requests, users = [], isAdmin = false, onUpdateStatus }) => {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [resolution, setResolution] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved');
  
  const getStudentName = (studentId: number) => {
    const student = users.find(user => user.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : `Student ID: ${studentId}`;
  };
  
  const getResolverName = (userId: number | null) => {
    if (!userId) return 'N/A';
    const user = users.find(user => user.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `User ID: ${userId}`;
  };
  
  const handleOpenDialog = (request: Request, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setActionType(action);
    setResolution('');
    setIsDialogOpen(true);
  };
  
  const handleProcessRequest = async () => {
    if (!selectedRequest || !onUpdateStatus) return;
    
    try {
      setIsProcessing(true);
      await onUpdateStatus(selectedRequest.id, actionType, resolution);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error processing request:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {requests.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-neutral-100 text-neutral-500">
          No requests available
        </div>
      ) : (
        requests.map((request) => (
          <Card key={request.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-heading">{request.type}</CardTitle>
              <Badge variant="outline" className={`bg-${getStatusColor(request.status)} bg-opacity-10 text-${getStatusColor(request.status)} border-0`}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-neutral-500">From: {getStudentName(request.studentId)}</p>
                  <p className="text-sm text-neutral-500">Submitted: {request.createdAt ? formatDate(request.createdAt) : "N/A"}</p>
                </div>
                
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm whitespace-pre-line">{request.description}</p>
                </div>
                
                {request.status !== 'pending' && (
                  <div className="border-t border-neutral-200 pt-4 mt-4">
                    <p className="text-sm text-neutral-500">
                      Resolved by: {getResolverName(request.resolvedBy)}
                    </p>
                    <p className="text-sm text-neutral-500">
                      Resolved on: {request.resolvedAt ? formatDate(request.resolvedAt) : 'N/A'}
                    </p>
                    {request.resolution && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Resolution:</p>
                        <p className="text-sm mt-1 p-3 bg-neutral-50 rounded-lg">{request.resolution}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {isAdmin && request.status === 'pending' && (
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => handleOpenDialog(request, 'rejected')}
                      className="border-error text-error hover:bg-error hover:text-white"
                    >
                      Reject
                    </Button>
                    <Button 
                      onClick={() => handleOpenDialog(request, 'approved')}
                      className="bg-success hover:bg-success-dark"
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
      
      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approved' 
                ? 'Please provide any notes or instructions for the approval.'
                : 'Please provide a reason for rejecting this request.'}
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder={`Enter ${actionType === 'approved' ? 'approval notes' : 'rejection reason'}...`}
            rows={4}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProcessRequest}
              disabled={isProcessing}
              className={actionType === 'approved' ? 'bg-success hover:bg-success-dark' : 'bg-error hover:bg-error-dark'}
            >
              {isProcessing ? 'Processing...' : actionType === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestList;
