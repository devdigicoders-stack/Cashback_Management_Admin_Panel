import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaBullhorn, FaPlus, FaEdit, FaTrash, FaImage, FaCalendarAlt, FaTimes } from "react-icons/fa";
import api from "../utils/api";

const Offers = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const initialFormState = {
    title: "",
    description: "",
    bannerUrl: "",
    validUntil: ""
  };
  const [formData, setFormData] = useState(initialFormState);

  // Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchOffers();
  }, []);

  // Reset pagination on items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/offers`);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch offers");
      }

      setOffers(data.offers || []);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (offer = null) => {
    if (offer) {
      setEditId(offer._id);
      // Format date for datetime-local input
      const dateObj = new Date(offer.validUntil);
      const formattedDate = dateObj.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      setFormData({
        title: offer.title,
        description: offer.description,
        bannerUrl: offer.bannerUrl || "",
        validUntil: formattedDate
      });
    } else {
      setEditId(null);
      setFormData(initialFormState);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditId(null);
    setFormData(initialFormState);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editId 
        ? `/api/admin/offers/${editId}`
        : `/api/admin/offers`;
      
      let response;
      if (editId) {
        response = await api.put(url, formData);
      } else {
        response = await api.post(url, formData);
      }

      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to save offer");
      }

      toast.success(`Offer ${editId ? 'updated' : 'created'} successfully!`);
      handleCloseModal();
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error saving offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (offer) => {
    setOfferToDelete(offer);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!offerToDelete) return;
    setIsSubmitting(true);

    try {
      const response = await api.delete(`/api/admin/offers/${offerToDelete._id}`);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to delete offer");
      }

      toast.success("Offer deleted successfully!");
      setDeleteModalOpen(false);
      setOfferToDelete(null);
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error deleting offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOfferValid = (validUntilStr) => {
    if (!validUntilStr) return false;
    return new Date(validUntilStr) > new Date();
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOffers = offers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(offers.length / itemsPerPage) || 1;

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaBullhorn className="text-pink-500" />
            Offers & Schemes
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Manage promotional offers and schemes visible to retailers.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow"
          style={{ backgroundColor: themeColors.primary }}
        >
          <FaPlus /> Add New Offer
        </button>
      </div>

      {/* Grid of Offers */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
        </div>
      ) : currentOffers.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center">
          <FaBullhorn className="text-4xl text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-700">No Offers Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mt-1">You haven't created any promotional offers yet. Click "Add New Offer" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentOffers.map((offer) => {
            const valid = isOfferValid(offer.validUntil);
            return (
              <div key={offer._id} className="rounded-xl shadow-sm border overflow-hidden flex flex-col transition-all hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                
                {/* Banner Image */}
                <div className="h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden group border-b" style={{ borderColor: themeColors.border }}>
                  {offer.bannerUrl ? (
                    <img src={offer.bannerUrl} alt={offer.title} className="w-full h-full object-cover" />
                  ) : (
                    <FaImage className="text-4xl text-gray-300" />
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {valid ? (
                      <span className="px-2.5 py-1 bg-green-500 text-white text-[10px] font-bold uppercase rounded-full shadow-sm">Active</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold uppercase rounded-full shadow-sm">Expired</span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 line-clamp-1" title={offer.title}>{offer.title}</h3>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-3 flex-1">{offer.description}</p>
                  
                  <div className="mt-4 flex items-center text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <FaCalendarAlt className="mr-2 text-gray-400" />
                    Valid Until: <span className="ml-1 font-medium text-gray-700">{new Date(offer.validUntil).toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex border-t" style={{ borderColor: themeColors.border }}>
                  <button 
                    onClick={() => handleOpenModal(offer)}
                    className="flex-1 py-3 flex justify-center items-center gap-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
                  >
                    <FaEdit /> Edit
                  </button>
                  <div className="w-px bg-gray-200"></div>
                  <button 
                    onClick={() => confirmDelete(offer)}
                    className="flex-1 py-3 flex justify-center items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && offers.length > 0 && (
        <div className="p-4 border-t mt-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}>
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {editId ? <><FaEdit className="text-blue-500"/> Edit Offer</> : <><FaBullhorn className="text-pink-500"/> Add New Offer</>}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes />
              </button>
            </div>
            
            <form id="offerForm" onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Diwali Dhamaka 500 Bonus"
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Details of the scheme..."
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image URL</label>
                <input
                  type="url"
                  name="bannerUrl"
                  value={formData.bannerUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Optional. Provide a direct link to an image.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                <input
                  type="datetime-local"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </form>

            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={handleCloseModal} 
                className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="offerForm"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : editId ? "Update Offer" : "Create Offer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && offerToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              <FaTrash />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Offer?</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete the offer <strong>"{offerToDelete.title}"</strong>? This action cannot be undone.</p>
            
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

export default Offers;
