import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FaUserTie, FaBolt, FaStore, FaEye, FaSearch, FaEdit, FaTrash, FaPowerOff } from "react-icons/fa";
import api from "../utils/api";
import Swal from "sweetalert2";

const Users = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Actions states
  const [processing, setProcessing] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ id: "", name: "", email: "", phone: "", firmName: "" });

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  // Reset to first page when search or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/users`;
      if (filterRole !== "all") {
        url += `?role=${filterRole}`;
      }

      const response = await api.get(url);
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch users");
      }

      setUsers(data.users || []);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserDetails = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${editData.id}`, {
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
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/status`, {
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
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to completely delete ${userName}? This action cannot be undone.`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });
    
    if (!result.isConfirmed) return;

    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}`, {
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
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery)
  );

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

  const getRoleBadge = (role) => {
    if (role === "electrician") {
      return (
        <span className="px-3 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
          <FaBolt /> Electrician
        </span>
      );
    }
    if (role === "retailer") {
      return (
        <span className="px-3 py-1 text-xs rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-1 w-fit">
          <FaStore /> Retailer
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-700 w-fit">
        {role}
      </span>
    );
  };

  const getKycBadge = (status) => {
    const aadhar = status?.aadhar || "pending";
    const pan = status?.pan || "pending";
    
    // Simplistic aggregated status logic
    let combined = "Pending";
    let colorClass = "bg-yellow-100 text-yellow-700";

    if (aadhar === "approved" && pan === "approved") {
      combined = "Verified";
      colorClass = "bg-green-100 text-green-700";
    } else if (aadhar === "rejected" || pan === "rejected") {
      combined = "Rejected";
      colorClass = "bg-red-100 text-red-700";
    } else if (aadhar === "submitted" || pan === "submitted") {
      combined = "Under Review";
      colorClass = "bg-blue-100 text-blue-700";
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-md font-medium ${colorClass}`}>
        {combined}
      </span>
    );
  };

  return (
    // Changed max-w-7xl mx-auto to w-full
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaUserTie className="text-blue-500" />
            User Management
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Manage Electricians and Retailers, and verify their KYC documents.
          </p>
        </div>
      </div>

      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border }}>
          
          {/* Tabs */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            {["all", "electrician", "retailer"].map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${
                  filterRole === role ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {role === "all" ? "All Users" : role}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 p-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>User Info</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Phone</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Role</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Status</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>KYC Status</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                  </td>
                </tr>
              ) : currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors border-b last:border-0" style={{ borderColor: themeColors.border }}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden">
                          {user.profileImage ? (
                            <img 
                              src={`${import.meta.env.VITE_API_BASE_URL}${user.profileImage}`} 
                              alt={user.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                          ) : (
                            user.name ? user.name.charAt(0).toUpperCase() : 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium">{user.phone}</td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">
                      {user.isActive ? (
                        <span className="px-2 py-1 text-xs rounded-md font-medium bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-md font-medium bg-red-100 text-red-700">Inactive</span>
                      )}
                    </td>
                    <td className="p-4">{getKycBadge(user.kycStatus)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/users/${user._id}`)}
                          className="p-2 rounded-lg text-white transition-colors bg-blue-600 hover:bg-blue-700 shadow-sm"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => {
                            setEditData({ id: user._id, name: user.name, email: user.email || "", phone: user.phone, firmName: user.firmName || "" });
                            setEditModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-white transition-colors bg-gray-600 hover:bg-gray-700 shadow-sm"
                          title="Edit User"
                        >
                          <FaEdit />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user._id, user.name)}
                          disabled={processing}
                          className="p-2 rounded-lg text-white transition-colors bg-red-600 hover:bg-red-700 shadow-sm"
                          title="Delete User"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredUsers.length > 0 && (
          <div className="p-4 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="p-1 border rounded-md focus:outline-none focus:ring-1"
                style={{ borderColor: themeColors.border }}
              >
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="px-3 py-1 rounded-md text-sm font-medium border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                Previous
              </button>
              
              <span className="text-sm font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 rounded-md text-sm font-medium border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Edit User Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
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

    </div>
  );
};

export default Users;
