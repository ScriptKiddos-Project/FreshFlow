import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
// import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  FileText,
  Camera,
  Star,
  AlertTriangle
} from 'lucide-react';

interface VendorData {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;
  fssaiLicense?: string;
  documents: {
    id: string;
    type: 'aadhar' | 'pan' | 'gst' | 'fssai' | 'shop_license';
    name: string;
    url: string;
    verified: boolean;
  }[];
  businessPhotos: string[];
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string;
}

interface VendorApprovalFormProps {
  vendor: VendorData;
  onApprove: (vendorId: string, notes?: string) => void;
  onReject: (vendorId: string, reason: string) => void;
  onRequestMoreInfo: (vendorId: string, message: string) => void;
  loading?: boolean;
}

const VendorApprovalForm: React.FC<VendorApprovalFormProps> = ({
  vendor,
  onApprove,
  onReject,
  onRequestMoreInfo,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'photos'>('details');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [moreInfoMessage, setMoreInfoMessage] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showMoreInfoDialog, setShowMoreInfoDialog] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'aadhar':
        return <User className="h-4 w-4" />;
      case 'pan':
        return <FileText className="h-4 w-4" />;
      case 'gst':
        return <FileText className="h-4 w-4" />;
      case 'fssai':
        return <Star className="h-4 w-4" />;
      case 'shop_license':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleApprove = () => {
    onApprove(vendor.id, approvalNotes);
    setShowApprovalDialog(false);
    setApprovalNotes('');
  };

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onReject(vendor.id, rejectionReason);
      setShowRejectionDialog(false);
      setRejectionReason('');
    }
  };

  const handleRequestMoreInfo = () => {
    if (moreInfoMessage.trim()) {
      onRequestMoreInfo(vendor.id, moreInfoMessage);
      setShowMoreInfoDialog(false);
      setMoreInfoMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{vendor.name}</h2>
              <p className="text-gray-600">{vendor.businessName}</p>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="h-4 w-4 mr-1" />
                  {vendor.email}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Phone className="h-4 w-4 mr-1" />
                  {vendor.phone}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(vendor.status)}>
              {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
            </Badge>
            <p className="text-sm text-gray-500 mt-2">
              Applied: {new Date(vendor.appliedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'details', label: 'Business Details', icon: User },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'photos', label: 'Photos', icon: Camera }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'details' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <div className="text-gray-900">{vendor.businessName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <div className="text-gray-900">{vendor.gstNumber || 'Not provided'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FSSAI License
                </label>
                <div className="text-gray-900">{vendor.fssaiLicense || 'Not provided'}</div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Address
                </label>
                <div className="text-gray-900">
                  {vendor.address}, {vendor.city}, {vendor.state} - {vendor.pincode}
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Submitted Documents</h3>
            <div className="space-y-4">
              {vendor.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDocumentIcon(doc.type)}
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.name}</h4>
                      <p className="text-sm text-gray-500">{doc.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {doc.verified ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'photos' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Business Photos</h3>
            {vendor.businessPhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {vendor.businessPhotos.map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={photo}
                      alt={`Business photo ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(photo, '_blank')}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No business photos uploaded</p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Verification Notes */}
      {vendor.verificationNotes && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Previous Notes
          </h3>
          <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg">
            {vendor.verificationNotes}
          </p>
        </Card>
      )}

      {/* Action Buttons */}
      {vendor.status === 'pending' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Verification Actions</h3>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setShowApprovalDialog(true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Vendor
            </Button>
            <Button
              onClick={() => setShowRejectionDialog(true)}
              disabled={loading}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Application
            </Button>
            <Button
              onClick={() => setShowMoreInfoDialog(true)}
              disabled={loading}
              variant="outline"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request More Info
            </Button>
          </div>
        </Card>
      )}

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Approve Vendor</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to approve {vendor.name}'s application?
            </p>
            <textarea
              placeholder="Add approval notes (optional)"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none h-24 mb-4"
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowApprovalDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rejection Dialog */}
      {showRejectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Reject Application</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting {vendor.name}'s application:
            </p>
            <textarea
              placeholder="Rejection reason (required)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none h-24 mb-4"
              required
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowRejectionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                variant="destructive"
              >
                Reject
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* More Info Dialog */}
      {showMoreInfoDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Request More Information</h3>
            <p className="text-gray-600 mb-4">
              Send a message to {vendor.name} requesting additional information:
            </p>
            <textarea
              placeholder="Message to vendor (required)"
              value={moreInfoMessage}
              onChange={(e) => setMoreInfoMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none h-24 mb-4"
              required
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowMoreInfoDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestMoreInfo}
                disabled={loading || !moreInfoMessage.trim()}
              >
                Send Request
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VendorApprovalForm;