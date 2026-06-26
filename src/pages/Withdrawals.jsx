import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaMoneyBillWave, FaCheckCircle, FaTimesCircle, FaClock, FaEye } from "react-icons/fa";
import api from "../utils/api";

const Withdrawals = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processData, setProcessData] = useState({ action: "approve", adminRemarks: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchWithdrawals();
  }, [filterStatus]);

  // Reset pagination on filter or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, itemsPerPage]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/withdrawals`;
      if (filterStatus !== "all") {
        url += `?status=${filterStatus}`;
      }

      const response = await api.get(url);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch withdrawals");
      }

      setWithdrawals(data.withdrawals || []);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessClick = (id) => {
    setProcessingId(id);
    setProcessData({ action: "approve", adminRemarks: "" });
    setModalOpen(true);
  };

  const submitProcess = async (e) => {
    e.preventDefault();
    if (!processingId) return;

    setIsSubmitting(true);
    try {
      const response = await api.put(`/api/admin/withdrawals/${processingId}/process`, processData);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to process withdrawal");
      }

      toast.success(`Withdrawal ${processData.action}d successfully`);
      setModalOpen(false);
      fetchWithdrawals(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error processing withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="px-3 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit"><FaCheckCircle /> Approved</span>;
      case "rejected":
        return <span className="px-3 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1 w-fit"><FaTimesCircle /> Rejected</span>;
      case "pending":
      default:
        return <span className="px-3 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit"><FaClock /> Pending</span>;
    }
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWithdrawals = withdrawals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(withdrawals.length / itemsPerPage) || 1;

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaMoneyBillWave className="text-green-500" />
            Withdrawals & Payouts
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Manage payout requests from Electricians and Retailers.
          </p>
        </div>
      </div>

      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border }}>
          
          {/* Tabs */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
            {["all", "pending", "approved", "rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all whitespace-nowrap ${
                  filterStatus === status ? "bg-white shadow-sm text-green-600" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>User</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Amount</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Date</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Status</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                  </td>
                </tr>
              ) : currentWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                currentWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="hover:bg-gray-50 transition-colors border-b last:border-0" style={{ borderColor: themeColors.border }}>
                    <td className="p-4">
                      <p className="font-semibold">{withdrawal.userId?.name || "Unknown User"}</p>
                      <p className="text-xs text-gray-500">{withdrawal.userId?.phone || ""}</p>
                      {withdrawal.userId?.role && (
                         <span className="text-[10px] uppercase bg-gray-200 text-gray-700 px-1 py-0.5 rounded">{withdrawal.userId.role}</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-green-600">
                      ₹{withdrawal.amount}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(withdrawal.status)}
                    </td>
                    <td className="p-4 text-center">
                      {withdrawal.status === "pending" ? (
                        <button
                          onClick={() => handleProcessClick(withdrawal._id)}
                          className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                        >
                          Process
                        </button>
                      ) : (
                         <span className="text-xs text-gray-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && withdrawals.length > 0 && (
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

      {/* Process Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-5 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Process Withdrawal</h3>
              <p className="text-xs text-gray-500 mt-1">Review and update the status of this request.</p>
            </div>
            
            <form onSubmit={submitProcess} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="action" 
                      value="approve" 
                      checked={processData.action === "approve"} 
                      onChange={(e) => setProcessData({...processData, action: e.target.value})}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-green-700">Approve</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="action" 
                      value="reject" 
                      checked={processData.action === "reject"} 
                      onChange={(e) => setProcessData({...processData, action: e.target.value})}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-red-700">Reject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Remarks (Optional)
                </label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder={processData.action === "approve" ? "e.g., Transaction ID: TXN12345" : "e.g., Invalid bank details"}
                  value={processData.adminRemarks}
                  onChange={(e) => setProcessData({ ...processData, adminRemarks: e.target.value })}
                ></textarea>
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)} 
                  className="flex-1 py-2.5 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={`flex-1 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50 shadow-sm ${processData.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : `Confirm ${processData.action === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Withdrawals;
