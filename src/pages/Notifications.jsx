import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaBell, FaPaperPlane, FaUsers, FaBolt, FaStore, FaEdit, FaTrash, FaTimes, FaPlus } from "react-icons/fa";
import api from "../utils/api";

const Notifications = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal State for Compose
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    targetRole: "all",
    title: "",
    message: "",
  });

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/api/admin/notifications`);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch notification history");
      }
      setHistory(data.history || []);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to load notifications.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const setTargetRole = (role) => {
    setFormData({ ...formData, targetRole: role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error("Please provide both a title and a message.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/api/admin/notifications/bulk`, formData);
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.message || "Failed to send notifications");
      }

      toast.success(data.message || "Notifications sent successfully!");
      
      // Reset form and close modal
      setFormData({
        targetRole: "all",
        title: "",
        message: "",
      });
      setModalOpen(false);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to send notification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (item) => {
    setNotificationToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!notificationToDelete) return;
    setIsSubmitting(true);

    try {
      const response = await api.delete(`/api/admin/notifications/bulk`, {
        data: {
          title: notificationToDelete.title,
          message: notificationToDelete.message
        }
      });
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to delete notification broadcast");
      }

      toast.success("Broadcast deleted successfully!");
      setDeleteModalOpen(false);
      setNotificationToDelete(null);
      fetchHistory(); // Refresh history
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete broadcast.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHistory = history.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(history.length / itemsPerPage) || 1;

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header & Generate Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaBell className="text-yellow-500" />
            Push Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Broadcast messages to your users and view your sending history.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow"
          style={{ backgroundColor: themeColors.primary }}
        >
          <FaPlus /> Create Notification
        </button>
      </div>

      <div className="rounded-xl shadow-sm border overflow-hidden flex flex-col" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        {/* Table Header */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
          <h3 className="font-bold" style={{ color: themeColors.text }}>Sent History</h3>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Title & Message</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Recipients</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Sent Date</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                  </td>
                </tr>
              ) : currentHistory.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-gray-500">
                    No notifications have been sent yet.
                  </td>
                </tr>
              ) : (
                currentHistory.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors border-b last:border-0" style={{ borderColor: themeColors.border }}>
                    <td className="p-4">
                      <p className="font-bold text-gray-800 text-base">{item.title}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.message}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                        <FaUsers /> {item.recipientsCount} Users
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-medium">
                      {new Date(item.sentAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => confirmDelete(item)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition shadow-sm"
                        title="Delete Broadcast"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loadingHistory && history.length > 0 && (
          <div className="p-4 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}>
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
              
              <span className="text-sm font-medium px-2" style={{ color: themeColors.text }}>
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

      {/* Compose Notification Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <FaEdit className="text-blue-500" /> Compose Notification
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Target Audience Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-800">1. Select Target Audience</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option: All */}
                  <div 
                    onClick={() => setTargetRole("all")}
                    className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-all ${
                      formData.targetRole === "all" 
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <FaUsers className="text-2xl" />
                    <span className="font-semibold text-xs">Everyone</span>
                  </div>

                  {/* Option: Electrician */}
                  <div 
                    onClick={() => setTargetRole("electrician")}
                    className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-all ${
                      formData.targetRole === "electrician" 
                        ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" 
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <FaBolt className="text-2xl" />
                    <span className="font-semibold text-xs">Electricians Only</span>
                  </div>

                  {/* Option: Retailer */}
                  <div 
                    onClick={() => setTargetRole("retailer")}
                    className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-all ${
                      formData.targetRole === "retailer" 
                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm" 
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <FaStore className="text-2xl" />
                    <span className="font-semibold text-xs">Retailers Only</span>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-800">2. Compose Message</label>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notification Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Happy Diwali! Special Offers Inside 🎁"
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Message Body *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Write your detailed message here. This will be sent as a push notification."
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    required
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {formData.message.length} characters
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-lg font-bold transition disabled:opacity-50 shadow hover:shadow-lg active:scale-95"
                  style={{ backgroundColor: themeColors.primary }}
                  disabled={isSubmitting || !formData.title.trim() || !formData.message.trim()}
                >
                  <FaPaperPlane /> 
                  {isSubmitting ? "Sending Notifications..." : "Send Notification Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && notificationToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-[70] p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              <FaTrash />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Broadcast?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete the notification broadcast <strong>"{notificationToDelete.title}"</strong>? It will be removed from all users' accounts.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModalOpen(false)} 
                className="flex-1 py-2.5 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Notifications;
