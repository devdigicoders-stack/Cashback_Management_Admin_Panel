import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaArrowLeft, FaIdCard, FaWallet, FaStore, FaCheckCircle, FaTimesCircle, FaUser, FaUniversity, FaEdit, FaTrash, FaPowerOff } from "react-icons/fa";
import Swal from "sweetalert2";

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ user: null, wallet: null, transactions: [] });

  const [processing, setProcessing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectData, setRejectData] = useState({ documentType: "", reason: "" });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ name: "", email: "", phone: "", firmName: "" });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // KYC Upload States
  const [uploadAadharModalOpen, setUploadAadharModalOpen] = useState(false);
  const [aadharUploadData, setAadharUploadData] = useState({ aadharNumber: "", aadharFront: null, aadharBack: null });
  const [uploadPanModalOpen, setUploadPanModalOpen] = useState(false);
  const [panUploadData, setPanUploadData] = useState({ panNumber: "", panCard: null });

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to fetch user details");
      }

      setData({
        user: resData.user,
        wallet: resData.wallet,
        transactions: resData.transactions || [],
      });
    } catch (err) {
      toast.error(err.message);
      navigate("/users");
    } finally {
      setLoading(false);
    }
  };

  const handleKycAction = async (documentType, action, reason = "") => {
    if (action === "reject" && !reason) {
      setRejectData({ documentType, reason: "" });
      setRejectModalOpen(true);
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${id}/kyc-process`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentType, action, rejectionReason: reason }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to process KYC");
      }

      toast.success(`KYC ${action}d successfully`);
      setRejectModalOpen(false);
      fetchUserDetails(); // Refresh data
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadKYC = async (documentType) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("documentType", documentType);

      if (documentType === "aadhar") {
        if (!aadharUploadData.aadharFront || !aadharUploadData.aadharBack) {
          throw new Error("Both Aadhar Front and Back images are required");
        }
        formData.append("aadharNumber", aadharUploadData.aadharNumber);
        formData.append("aadharFront", aadharUploadData.aadharFront);
        formData.append("aadharBack", aadharUploadData.aadharBack);
      } else if (documentType === "pan") {
        if (!panUploadData.panCard) {
          throw new Error("PAN Card image is required");
        }
        formData.append("panNumber", panUploadData.panNumber);
        formData.append("panCard", panUploadData.panCard);
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${id}/kyc`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData, // No Content-Type header when using FormData
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to upload KYC");
      }

      toast.success(`${documentType.toUpperCase()} KYC uploaded and approved successfully`);
      if (documentType === "aadhar") {
        setUploadAadharModalOpen(false);
        setAadharUploadData({ aadharNumber: "", aadharFront: null, aadharBack: null });
      } else {
        setUploadPanModalOpen(false);
        setPanUploadData({ panNumber: "", panCard: null });
      }
      fetchUserDetails();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateUserDetails = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to update user");
      }

      toast.success("User details updated successfully");
      setEditModalOpen(false);
      fetchUserDetails();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!data.user) return;
    const newStatus = !data.user.isActive;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to mark this user as ${newStatus ? 'Active' : 'Inactive'}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, update it!"
    });
    
    if (!result.isConfirmed) return;

    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to update status");
      }

      toast.success(resData.message);
      fetchUserDetails();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to completely delete ${user.name}? This will remove their account and wallet permanently. This action cannot be undone.`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });
    
    if (!result.isConfirmed) return;

    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to delete user");
      }

      toast.success("User deleted successfully");
      navigate("/users");
    } catch (err) {
      toast.error(err.message);
      setProcessing(false);
    }
  };

  if (loading || !data.user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
      </div>
    );
  }

  const { user, wallet, transactions } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/users")} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition">
          <FaArrowLeft />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">User Details</h1>
          <p className="text-sm text-gray-500">ID: {user._id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Basic Info & Wallet */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mb-4 overflow-hidden border-2 border-blue-100">
                {user.profileImage ? (
                  <img 
                    src={`${import.meta.env.VITE_API_BASE_URL}${user.profileImage}`} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                  />
                ) : (
                  <FaUser />
                )}
              </div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-gray-500 mb-2">{user.phone}</p>
              <span className={`px-3 py-1 text-xs rounded-full font-medium uppercase ${user.role === 'electrician' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                {user.role}
              </span>
            </div>
            <hr className="my-4 border-gray-200" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Email:</span> <span className="font-medium">{user.email || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Joined:</span> <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status:</span> 
                <span className={`font-medium px-2 py-0.5 rounded text-xs ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <button 
                onClick={() => {
                  setEditData({ name: user.name, email: user.email || "", phone: user.phone, firmName: user.firmName || "" });
                  setEditModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
              >
                <FaEdit /> Edit
              </button>
              <button 
                onClick={handleToggleStatus}
                disabled={processing}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${user.isActive ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                <FaPowerOff /> {user.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button 
                onClick={handleDeleteUser}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition"
              >
                <FaTrash /> Delete
              </button>
            </div>
          </div>

          {/* Wallet Card */}
          <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <div className="flex items-center gap-2 mb-4">
              <FaWallet className="text-green-500 text-xl" />
              <h2 className="text-lg font-bold">Wallet</h2>
            </div>
            <div className="text-3xl font-bold text-green-600">₹{wallet?.balance || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Available Balance</p>
          </div>

          {/* Shop Details (If Retailer) */}
          {user.role === 'retailer' && user.shopDetails && (
            <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
               <div className="flex items-center gap-2 mb-4">
                <FaStore className="text-purple-500 text-xl" />
                <h2 className="text-lg font-bold">Shop Details</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col"><span className="text-gray-500">Shop Name:</span> <span className="font-medium">{user.shopDetails.shopName || 'N/A'}</span></div>
                <div className="flex flex-col mt-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{user.shopDetails.shopAddress || 'N/A'}</span></div>
                <div className="flex justify-between mt-2"><span className="text-gray-500">GST:</span> <span className="font-medium">{user.shopDetails.gstNumber || 'N/A'}</span></div>
              </div>
            </div>
          )}

          {/* Bank Details */}
          {user.bankDetails && (
            <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
               <div className="flex items-center gap-2 mb-4">
                <FaUniversity className="text-blue-500 text-xl" />
                <h2 className="text-lg font-bold">Bank Details</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col"><span className="text-gray-500">Bank Name:</span> <span className="font-medium">{user.bankDetails.bankName || 'N/A'}</span></div>
                <div className="flex flex-col mt-2"><span className="text-gray-500">Account Holder:</span> <span className="font-medium">{user.bankDetails.accountHolderName || 'N/A'}</span></div>
                <div className="flex justify-between mt-2"><span className="text-gray-500">Account No:</span> <span className="font-medium">{user.bankDetails.accountNumber || 'N/A'}</span></div>
                <div className="flex justify-between mt-2"><span className="text-gray-500">IFSC Code:</span> <span className="font-medium">{user.bankDetails.ifscCode || 'N/A'}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: KYC & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* KYC Section */}
          <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <div className="flex items-center gap-2 mb-6">
              <FaIdCard className="text-blue-500 text-xl" />
              <h2 className="text-lg font-bold">KYC Verification</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Aadhar Box */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Aadhar Card</h3>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${user.kycStatus?.aadhar?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : user.kycStatus?.aadhar?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {user.kycStatus?.aadhar || 'Pending'}
                    </span>
                    {(user.kycStatus?.aadhar !== 'approved' && user.kycStatus?.aadhar !== 'submitted') && (
                      <button onClick={() => setUploadAadharModalOpen(true)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">Upload</button>
                    )}
                  </div>
                </div>

                {user.kycDetails?.aadharNumber && (
                  <p className="text-sm mt-2"><strong>Aadhar No:</strong> {user.kycDetails.aadharNumber}</p>
                )}
                
                <div className="flex gap-2 mt-3">
                  {user.kycDetails?.aadharFrontUrl && (
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Front</p>
                      <a href={`${import.meta.env.VITE_API_BASE_URL}${user.kycDetails.aadharFrontUrl}`} target="_blank" rel="noopener noreferrer">
                        <img src={`${import.meta.env.VITE_API_BASE_URL}${user.kycDetails.aadharFrontUrl}`} alt="Aadhar Front" className="w-full h-24 object-cover rounded border hover:opacity-80 transition cursor-pointer" />
                      </a>
                    </div>
                  )}
                  {user.kycDetails?.aadharBackUrl && (
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Back</p>
                      <a href={`${import.meta.env.VITE_API_BASE_URL}${user.kycDetails.aadharBackUrl}`} target="_blank" rel="noopener noreferrer">
                        <img src={`${import.meta.env.VITE_API_BASE_URL}${user.kycDetails.aadharBackUrl}`} alt="Aadhar Back" className="w-full h-24 object-cover rounded border hover:opacity-80 transition cursor-pointer" />
                      </a>
                    </div>
                  )}
                </div>

                {user.kycStatus?.aadhar?.toLowerCase() === 'submitted' && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleKycAction('aadhar', 'approve')} disabled={processing} className="flex-1 bg-[#1A365D] hover:bg-opacity-90 text-white py-2 rounded-md text-sm font-medium flex justify-center items-center gap-1 transition">
                      <FaCheckCircle /> Approve
                    </button>
                    <button onClick={() => handleKycAction('aadhar', 'reject')} disabled={processing} className="flex-1 bg-[#1A365D] hover:bg-opacity-90 text-white py-2 rounded-md text-sm font-medium flex justify-center items-center gap-1 transition">
                      <FaTimesCircle /> Reject
                    </button>
                  </div>
                )}
              </div>

              {/* PAN Box */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">PAN Card</h3>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${user.kycStatus?.pan?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : user.kycStatus?.pan?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {user.kycStatus?.pan || 'Pending'}
                    </span>
                    {(user.kycStatus?.pan !== 'approved' && user.kycStatus?.pan !== 'submitted') && (
                      <button onClick={() => setUploadPanModalOpen(true)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">Upload</button>
                    )}
                  </div>
                </div>

                {user.kycDetails?.panNumber && (
                  <p className="text-sm mt-2"><strong>PAN No:</strong> {user.kycDetails.panNumber}</p>
                )}

                <div className="mt-3">
                  {user.kycDetails?.panCardUrl && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">PAN Image</p>
                      <a href={`${import.meta.env.VITE_API_BASE_URL}${user.kycDetails.panCardUrl}`} target="_blank" rel="noopener noreferrer">
                        <img src={`${import.meta.env.VITE_API_BASE_URL}${user.kycDetails.panCardUrl}`} alt="PAN Card" className="w-full h-24 object-cover rounded border hover:opacity-80 transition cursor-pointer max-w-[200px]" />
                      </a>
                    </div>
                  )}
                </div>

                {user.kycStatus?.pan?.toLowerCase() === 'submitted' && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleKycAction('pan', 'approve')} disabled={processing} className="flex-1 bg-[#1A365D] hover:bg-opacity-90 text-white py-2 rounded-md text-sm font-medium flex justify-center items-center gap-1 transition">
                      <FaCheckCircle /> Approve
                    </button>
                    <button onClick={() => handleKycAction('pan', 'reject')} disabled={processing} className="flex-1 bg-[#1A365D] hover:bg-opacity-90 text-white py-2 rounded-md text-sm font-medium flex justify-center items-center gap-1 transition">
                      <FaTimesCircle /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>

            {user.kycDetails?.rejectionReason && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                <strong>Last Rejection Reason:</strong> {user.kycDetails.rejectionReason}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <h2 className="text-lg font-bold mb-4">Recent Transactions</h2>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions found.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn._id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-sm capitalize">{txn.type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">{new Date(txn.createdAt).toLocaleString()}</p>
                    </div>
                    <div className={`font-bold ${txn.type === 'cashback_credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.type === 'cashback_credit' ? '+' : '-'}₹{txn.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Reject {rejectData.documentType.toUpperCase()} KYC</h3>
            <textarea
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              rows="3"
              placeholder="Enter rejection reason..."
              value={rejectData.reason}
              onChange={(e) => setRejectData({ ...rejectData, reason: e.target.value })}
            ></textarea>
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setRejectModalOpen(false)} 
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleKycAction(rejectData.documentType, 'reject', rejectData.reason)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
                disabled={!rejectData.reason.trim() || processing}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Edit User Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editData.name} 
                  onChange={(e) => setEditData({...editData, name: e.target.value})} 
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input 
                  type="text" 
                  value={editData.phone} 
                  onChange={(e) => setEditData({...editData, phone: e.target.value})} 
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editData.email} 
                  onChange={(e) => setEditData({...editData, email: e.target.value})} 
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name (Optional)</label>
                <input 
                  type="text" 
                  value={editData.firmName} 
                  onChange={(e) => setEditData({...editData, firmName: e.target.value})} 
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setEditModalOpen(false)} 
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateUserDetails}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                disabled={processing || !editData.name || !editData.phone}
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Aadhar Modal */}
      {uploadAadharModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaIdCard className="text-[#1A365D]" /> Upload Aadhar
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Aadhar Number</label>
                <input 
                  type="text" 
                  value={aadharUploadData.aadharNumber} 
                  onChange={(e) => setAadharUploadData({...aadharUploadData, aadharNumber: e.target.value})} 
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#1A365D] focus:border-transparent outline-none bg-gray-50 transition" 
                  placeholder="Enter 12-digit Aadhar Number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Front Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setAadharUploadData({...aadharUploadData, aadharFront: e.target.files[0]})} 
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Back Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setAadharUploadData({...aadharUploadData, aadharBack: e.target.files[0]})} 
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setUploadAadharModalOpen(false)} 
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUploadKYC("aadhar")}
                className="flex-1 py-2.5 bg-[#1A365D] text-white rounded-xl font-semibold hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={processing || !aadharUploadData.aadharNumber || !aadharUploadData.aadharFront || !aadharUploadData.aadharBack}
              >
                {processing ? 'Uploading...' : 'Submit Aadhar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload PAN Modal */}
      {uploadPanModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaIdCard className="text-[#1A365D]" /> Upload PAN
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">PAN Number</label>
                <input 
                  type="text" 
                  value={panUploadData.panNumber} 
                  onChange={(e) => setPanUploadData({...panUploadData, panNumber: e.target.value.toUpperCase()})} 
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#1A365D] focus:border-transparent outline-none bg-gray-50 transition uppercase" 
                  placeholder="Enter 10-character PAN"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">PAN Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setPanUploadData({...panUploadData, panCard: e.target.files[0]})} 
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setUploadPanModalOpen(false)} 
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUploadKYC("pan")}
                className="flex-1 py-2.5 bg-[#1A365D] text-white rounded-xl font-semibold hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={processing || !panUploadData.panNumber || !panUploadData.panCard}
              >
                {processing ? 'Uploading...' : 'Submit PAN'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserDetails;
