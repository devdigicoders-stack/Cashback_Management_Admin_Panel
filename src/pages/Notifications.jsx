import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaBell, FaPaperPlane, FaUsers, FaBolt, FaStore, FaHistory, FaEdit, FaTrash, FaTimes } from "react-icons/fa";

const Notifications = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState("compose");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/notifications`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch notification history");
      }

      setHistory(data.history || []);
    } catch (err) {
      toast.error(err.message);
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/notifications/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send notifications");
      }

      toast.success(data.message || "Notifications sent successfully!");
      
      // Reset form
      setFormData({
        targetRole: "all",
        title: "",
        message: "",
      });
      // Optionally switch to history tab to see it
      setActiveTab("history");
    } catch (err) {
      toast.error(err.message);
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/notifications/bulk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: notificationToDelete.title,
          message: notificationToDelete.message
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete notification broadcast");
      }

      toast.success("Broadcast deleted successfully!");
      setDeleteModalOpen(false);
      setNotificationToDelete(null);
      fetchHistory(); // Refresh history
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
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
      </div>

      <div className="rounded-xl shadow-md border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: themeColors.border }}>
          <button
            onClick={() => setActiveTab("compose")}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "compose" ? "border-b-2 text-blue-600" : "text-gray-500 hover:bg-gray-50"
            }`}
            style={{ borderBottomColor: activeTab === "compose" ? themeColors.primary : "transparent" }}
          >
            <FaEdit /> Compose Message
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "history" ? "border-b-2 text-blue-600" : "text-gray-500 hover:bg-gray-50"
            }`}
            style={{ borderBottomColor: activeTab === "history" ? themeColors.primary : "transparent" }}
          >
            <FaHistory /> Sent History
          </button>
        </div>

        {/* Tab Content: Compose */}
        {activeTab === "compose" && (
          <form onSubmit={handleSubmit} className="animate-in fade-in duration-300">
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Target Audience Selection */}
              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-800">1. Select Target Audience</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Option: All */}
                  <div 
                    onClick={() => setTargetRole("all")}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                      formData.targetRole === "all" 
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <FaUsers className="text-3xl" />
                    <span className="font-semibold text-sm">Everyone</span>
                  </div>

                  {/* Option: Electrician */}
                  <div 
                    onClick={() => setTargetRole("electrician")}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                      formData.targetRole === "electrician" 
                        ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" 
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <FaBolt className="text-3xl" />
                    <span className="font-semibold text-sm">Electricians Only</span>
                  </div>

                  {/* Option: Retailer */}
                  <div 
                    onClick={() => setTargetRole("retailer")}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                      formData.targetRole === "retailer" 
                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm" 
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <FaStore className="text-3xl" />
                    <span className="font-semibold text-sm">Retailers Only</span>
                  </div>
                </div>
              </div>

              <hr style={{ borderColor: themeColors.border }} />

              {/* Message Content */}
              <div className="space-y-5">
                <label className="block text-base font-semibold text-gray-800">2. Compose Message</label>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notification Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Happy Diwali! Special Offers Inside 🎁"
                    className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Body *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Write your detailed message here. This will be sent as a push notification."
                    className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="5"
                    required
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    {formData.message.length} characters
                  </p>
                </div>
              </div>

            </div>

            <div className="p-6 md:px-8 border-t bg-gray-50" style={{ borderColor: themeColors.border }}>
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                disabled={isSubmitting || !formData.title.trim() || !formData.message.trim()}
              >
                <FaPaperPlane /> 
                {isSubmitting ? "Sending Notifications..." : "Send Notification Now"}
              </button>
            </div>
          </form>
        )}

        {/* Tab Content: History */}
        {activeTab === "history" && (
          <div className="overflow-x-auto animate-in fade-in duration-300">
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
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-gray-500">
                      No notifications have been sent yet.
                    </td>
                  </tr>
                ) : (
                  history.map((item, index) => (
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
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && notificationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
