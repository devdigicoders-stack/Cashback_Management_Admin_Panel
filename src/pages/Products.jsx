import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaBoxOpen, FaPlus, FaEdit, FaSearch, FaTimes, FaRupeeSign, FaTrash, FaPowerOff, FaDownload, FaFileUpload, FaLayerGroup, FaCheckSquare, FaSquare } from "react-icons/fa";
import api from "../utils/api";
import { exportToExcel } from "../utils/excelExport";

const Products = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Selection states for Bulk Action
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Single Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Edit Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState({
    updateCashback: false,
    electricianAmount: 0,
    retailerAmount: 0,
    updateStatus: false,
    isActive: true,
  });

  // Bulk Import Modal State
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form State
  const initialFormState = {
    name: "",
    sku: "",
    barcode: "",
    size: "",
    category: "",
    description: "",
    electricianAmount: 0,
    retailerAmount: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Reset pagination on items per page or search change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedProductIds([]);
  }, [itemsPerPage, searchQuery]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/products`);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch products");
      }

      setProducts(data.products || []);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditId(product._id);
      setFormData({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || "",
        size: product.size || "",
        category: product.category,
        description: product.description || "",
        electricianAmount: product.cashbackConfig?.electricianAmount || 0,
        retailerAmount: product.cashbackConfig?.retailerAmount || 0,
        isActive: product.isActive,
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
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editId
        ? `/api/admin/products/${editId}`
        : `/api/admin/products`;

      const payload = {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        size: formData.size,
        category: formData.category,
        description: formData.description,
        cashbackConfig: {
          electricianAmount: Number(formData.electricianAmount),
          retailerAmount: Number(formData.retailerAmount),
        },
        isActive: formData.isActive,
      };

      let response;
      if (editId) {
        response = await api.put(url, payload);
      } else {
        response = await api.post(url, payload);
      }

      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to save product");
      }

      toast.success(`Product ${editId ? "updated" : "added"} successfully!`);
      handleCloseModal();
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error saving product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleStatus = async (product) => {
    try {
      const url = `/api/admin/products/${product._id}`;
      const payload = {
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        cashbackConfig: product.cashbackConfig,
        isActive: !product.isActive,
      };
      const response = await api.put(url, payload);
      if (response.data.success) {
        toast.success(`Product ${payload.isActive ? "activated" : "deactivated"} successfully!`);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error toggling product status");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone and may affect old scan records.")) {
      try {
        const response = await api.delete(`/api/admin/products/${id}`);
        if (response.data.success) {
          toast.success("Product deleted successfully!");
          fetchProducts();
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Error deleting product");
      }
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProductIds(currentProducts.map((p) => p._id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Update Submit
  const handleBulkUpdateSubmit = async (e) => {
    e.preventDefault();
    if (selectedProductIds.length === 0) {
      toast.error("No products selected");
      return;
    }

    const updateData = {};
    if (bulkData.updateCashback) {
      updateData.electricianAmount = Number(bulkData.electricianAmount);
      updateData.retailerAmount = Number(bulkData.retailerAmount);
    }
    if (bulkData.updateStatus) {
      updateData.isActive = Boolean(bulkData.isActive);
    }

    if (Object.keys(updateData).length === 0) {
      toast.error("Please select at least one field option to update");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.put(`/api/admin/products/bulk-update`, {
        productIds: selectedProductIds,
        updateData,
      });

      if (response.data.success) {
        toast.success(response.data.message || "Products updated in bulk successfully!");
        setBulkModalOpen(false);
        setSelectedProductIds([]);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to perform bulk update");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Import Submit (CSV / Text import)
  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    if (!bulkImportText.trim()) {
      toast.error("Please paste CSV data or structured product text");
      return;
    }

    setIsSubmitting(true);
    try {
      const lines = bulkImportText.trim().split("\n");
      const parsedProducts = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.toLowerCase().startsWith("name,sku")) continue; // Skip header

        // Name, SKU, Barcode, Category, Size, ElecAmount, RetAmount, Description
        const parts = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
        if (parts.length >= 4) {
          parsedProducts.push({
            name: parts[0],
            sku: parts[1],
            barcode: parts[2],
            category: parts[3],
            size: parts[4] || "",
            electricianAmount: Number(parts[5]) || 0,
            retailerAmount: Number(parts[6]) || 0,
            description: parts[7] || "",
          });
        }
      }

      if (parsedProducts.length === 0) {
        toast.error("No valid product rows parsed. Format: Name, SKU, Barcode, Category, Size, ElecAmount, RetAmount");
        setIsSubmitting(false);
        return;
      }

      const response = await api.post(`/api/admin/products/bulk`, {
        products: parsedProducts,
      });

      if (response.data.success) {
        toast.success(response.data.message || `Bulk import finished successfully`);
        setBulkImportModalOpen(false);
        setBulkImportText("");
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed bulk product import");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportProductsExcel = () => {
    const columns = [
      { label: "Product Name", key: "name" },
      { label: "SKU", key: "sku" },
      { label: "Barcode", key: (p) => p.barcode || "-" },
      { label: "Category", key: "category" },
      { label: "Size", key: (p) => p.size || "-" },
      { label: "Electrician Cashback (₹)", key: (p) => p.cashbackConfig?.electricianAmount || 0 },
      { label: "Retailer Cashback (₹)", key: (p) => p.cashbackConfig?.retailerAmount || 0 },
      { label: "Status", key: (p) => (p.isActive ? "Active" : "Inactive") },
      { label: "Created Date", key: (p) => new Date(p.createdAt).toLocaleDateString("en-IN") },
    ];
    exportToExcel(filteredProducts, columns, "Products_Report");
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

  const isAllSelected = currentProducts.length > 0 && currentProducts.every((p) => selectedProductIds.includes(p._id));

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaBoxOpen className="text-orange-500" />
            Products Management & Bulk Updates
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Add, update cashback rewards, bulk edit selected products, or import multiple items at once.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportProductsExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-white font-bold bg-green-600 hover:bg-green-700 transition-all shadow-sm text-sm"
          >
            <FaDownload /> Export Excel
          </button>
          <button
            onClick={() => setBulkImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-white font-bold bg-purple-600 hover:bg-purple-700 transition-all shadow-sm text-sm"
          >
            <FaFileUpload /> Bulk Import
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold transition-all shadow-sm text-sm"
            style={{ backgroundColor: themeColors.primary }}
          >
            <FaPlus /> Add Product
          </button>
        </div>
      </div>

      {/* Bulk Action Floating Bar when items are selected */}
      {selectedProductIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
            <FaCheckSquare className="text-blue-600 text-lg" />
            <span>{selectedProductIds.length} product(s) selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition shadow-sm flex items-center gap-1.5"
            >
              <FaLayerGroup /> Bulk Edit Selected
            </button>
            <button
              onClick={() => setSelectedProductIds([])}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300 transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border }}>
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Search by name, SKU or Barcode..."
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
                <th className="p-4 border-b w-10 text-center" style={{ borderColor: themeColors.border }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Product Name</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>SKU</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Barcode</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Size</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Category</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Cashback (Elec / Ret)</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Status</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                  </td>
                </tr>
              ) : currentProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => {
                  const isSelected = selectedProductIds.includes(product._id);
                  return (
                    <tr 
                      key={product._id} 
                      className={`hover:bg-gray-50 transition-colors border-b last:border-0 ${isSelected ? 'bg-blue-50/50' : ''}`} 
                      style={{ borderColor: themeColors.border }}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(product._id)}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-800">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
                        )}
                      </td>
                      <td className="p-4 font-mono text-sm text-gray-600">{product.sku}</td>
                      <td className="p-4 font-mono text-sm text-gray-600">{product.barcode || "-"}</td>
                      <td className="p-4 text-sm text-gray-700">{product.size || "-"}</td>
                      <td className="p-4 text-sm text-gray-700">{product.category}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="flex items-center gap-1 text-blue-600 font-medium"><FaRupeeSign className="text-xs"/> {product.cashbackConfig?.electricianAmount || 0} <span className="text-gray-400 text-xs">(Elec)</span></span>
                          <span className="flex items-center gap-1 text-purple-600 font-medium"><FaRupeeSign className="text-xs"/> {product.cashbackConfig?.retailerAmount || 0} <span className="text-gray-400 text-xs">(Ret)</span></span>
                        </div>
                      </td>
                      <td className="p-4">
                        {product.isActive ? (
                          <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700">Inactive</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition shadow-sm"
                            title="Edit Product"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(product)}
                            className={`p-2 rounded-lg transition shadow-sm ${product.isActive ? "bg-orange-50 text-orange-600 hover:bg-orange-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                            title={product.isActive ? "Deactivate Product" : "Activate Product"}
                          >
                            <FaPowerOff />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition shadow-sm"
                            title="Delete Product"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredProducts.length > 0 && (
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

      </div>

      {/* Bulk Update Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaLayerGroup className="text-blue-600" /> Bulk Update ({selectedProductIds.length} Products)
              </h3>
              <button onClick={() => setBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleBulkUpdateSubmit} className="p-5 space-y-4">
              
              {/* Cashback Update Section */}
              <div className="bg-blue-50 p-3.5 rounded-lg border border-blue-100 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="updateCashback"
                    checked={bulkData.updateCashback}
                    onChange={(e) => setBulkData({ ...bulkData, updateCashback: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="updateCashback" className="text-sm font-semibold text-blue-900 cursor-pointer">
                    Update Cashback Amounts
                  </label>
                </div>

                {bulkData.updateCashback && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Electrician (₹)</label>
                      <input
                        type="number"
                        value={bulkData.electricianAmount}
                        onChange={(e) => setBulkData({ ...bulkData, electricianAmount: e.target.value })}
                        min="0"
                        className="w-full border rounded-lg p-2 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Retailer (₹)</label>
                      <input
                        type="number"
                        value={bulkData.retailerAmount}
                        onChange={(e) => setBulkData({ ...bulkData, retailerAmount: e.target.value })}
                        min="0"
                        className="w-full border rounded-lg p-2 text-sm bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Update Section */}
              <div className="bg-gray-50 p-3.5 rounded-lg border space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="updateStatus"
                    checked={bulkData.updateStatus}
                    onChange={(e) => setBulkData({ ...bulkData, updateStatus: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="updateStatus" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Update Active/Inactive Status
                  </label>
                </div>

                {bulkData.updateStatus && (
                  <select
                    value={bulkData.isActive ? "active" : "inactive"}
                    onChange={(e) => setBulkData({ ...bulkData, isActive: e.target.value === "active" })}
                    className="w-full border rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="active">Mark as Active</option>
                    <option value="inactive">Mark as Inactive</option>
                  </select>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Apply Bulk Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkImportModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaFileUpload className="text-purple-600" /> Bulk Import Products (CSV Format)
              </h3>
              <button onClick={() => setBulkImportModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-gray-600">
                Paste comma-separated (CSV) product rows in the box below. Header line is optional.
                <br />
                <strong>Format:</strong> <code>Name, SKU, Barcode, Category, Size, ElectricianAmount, RetailerAmount, Description</code>
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg border font-mono text-xs text-gray-700">
                Copper Wire 4mm, CW-400, BAR-400, Cables, 4mm, 50, 20, High quality copper cable
                <br />
                Switch Board 8 Modular, SB-8M, BAR-8M, Switches, 8M, 30, 10, Modular switch plate
              </div>

              <textarea
                rows="8"
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                placeholder="Paste CSV content here..."
                className="w-full border rounded-lg p-3 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                required
              ></textarea>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkImportModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Importing..." : "Start Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {editId ? <><FaEdit className="text-blue-500"/> Edit Product</> : <><FaBoxOpen className="text-orange-500"/> Add New Product</>}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes />
              </button>
            </div>
            
            <form id="productForm" onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Copper Wire 5mm"
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Stock Keeping Unit) *</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g., CW-500"
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (Unique ID) *</label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                    placeholder="e.g., BAR-001"
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="e.g., Cables & Wires"
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <input
                    type="text"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    placeholder="e.g., XL, 5mm, 100g"
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional details about the product..."
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                ></textarea>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2"><FaRupeeSign /> Cashback Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Electrician Amount (₹)</label>
                    <input
                      type="number"
                      name="electricianAmount"
                      value={formData.electricianAmount}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retailer Amount (₹)</label>
                    <input
                      type="number"
                      name="retailerAmount"
                      value={formData.retailerAmount}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  When a QR code associated with this product is scanned, the user will receive the amount specified above based on their role.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Product is Active (Available for QR scanning)
                </label>
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
                form="productForm"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : editId ? "Update Product" : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
