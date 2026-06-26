import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaHeadset, FaClock, FaSpinner, FaCheckCircle, FaReply } from "react-icons/fa";
import api from "../utils/api";

const ServiceRequests = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [processData, setProcessData] = useState({ status: "in-progress", adminRemarks: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchRequests();
  }, []);

  // Reset pagination on filter or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, itemsPerPage]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/service-requests`);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch service requests");
      }

      setRequests(data.requests || []);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessClick = (request) => {
    setActiveRequest(request);
    setProcessData({ 
      status: request.status === "pending" ? "in-progress" : request.status, 
      adminRemarks: request.adminRemarks || "" 
    });
    setModalOpen(true);
  };

  const submitProcess = async (e) => {
    e.preventDefault();
    if (!activeRequest) return;

    setIsSubmitting(true);
    try {
      const response = await api.put(`/api/admin/service-requests/${activeRequest._id}`, processData);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to update service request");
      }

      toast.success("Service request updated successfully");
      setModalOpen(false);
      fetchRequests(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error updating request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = filterStatus === "all" 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;

  const getStatusBadge = (status) => {
    switch (status) {
      case "resolved":
        return <span className="px-3 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit"><FaCheckCircle /> Resolved</span>;
      case "in-progress":
        return <span className="px-3 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-700 flex items-center gap-1 w-fit"><FaSpinner className="animate-spin" /> In Progress</span>;
      case "pending":
      default:
        return <span className="px-3 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit"><FaClock /> Pending</span>;
    }
  };

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaHeadset className="text-blue-500" />
            Help & Support
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Manage complaints and support tickets raised by users.
          </p>
        </div>
      </div>

      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border }}>
          
          {/* Tabs */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
            {["all", "pending", "in-progress", "resolved"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all whitespace-nowrap ${
                  filterStatus === status ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Ticket / Subject</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>User Info</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Date Raised</th>
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
              ) : currentRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No service requests found.
                  </td>
                </tr>
              ) : (
                currentRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50 transition-colors border-b last:border-0" style={{ borderColor: themeColors.border }}>
                    <td className="p-4">
                      <p className="font-semibold text-gray-800">{request.title || "No Subject"}</p>
                      {request.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xs">{request.description}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{request.userId?.name || "Unknown User"}</p>
                      <p className="text-xs text-gray-500">{request.userId?.phone || ""}</p>
                      {request.userId?.role && (
                         <span className="text-[10px] uppercase bg-gray-200 text-gray-700 px-1 py-0.5 rounded">{request.userId.role}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(request.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleProcessClick(request)}
                        className={`px-4 py-2 rounded-lg text-white transition-colors text-sm font-medium shadow-sm inline-flex items-center gap-2 ${request.status === 'resolved' ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        <FaReply /> {request.status === 'resolved' ? 'View' : 'Reply'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredRequests.length > 0 && (
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

      {/* Process/Reply Modal */}
      {modalOpen && activeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Support Ticket</h3>
              <p className="text-xs text-gray-500 mt-1">Ticket ID: {activeRequest._id}</p>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Ticket Details */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-1">{activeRequest.title || "No Subject"}</h4>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{activeRequest.description || "No detailed description provided."}</p>
              </div>

              {/* Form */}
              <form id="processForm" onSubmit={submitProcess} className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                  <select 
                    value={processData.status}
                    onChange={(e) => setProcessData({...processData, status: e.target.value})}
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Reply / Admin Remarks
                  </label>
                  <textarea
                    className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    placeholder="Type your response to the user here. This will be sent as a notification."
                    value={processData.adminRemarks}
                    onChange={(e) => setProcessData({ ...processData, adminRemarks: e.target.value })}
                  ></textarea>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-5 border-t bg-gray-50 flex gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setModalOpen(false)} 
                className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="processForm"
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Update & Reply"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ServiceRequests;
