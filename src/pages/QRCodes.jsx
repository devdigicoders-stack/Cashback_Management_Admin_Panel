import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaQrcode, FaBoxOpen, FaLayerGroup, FaBolt, FaCheckCircle, FaSpinner, FaTimes, FaPlus } from "react-icons/fa";
import api from "../utils/api";

const QRCodes = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [qrcodes, setQrcodes] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal state for Generating
  const [modalOpen, setModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form State
  const [formData, setFormData] = useState({
    productId: "",
    count: 10,
  });

  // Filters State
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProduct, setFilterProduct] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchQRCodes();
    setCurrentPage(1);
  }, [filterStatus, filterProduct]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/api/admin/products`);
      const data = response.data;
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchQRCodes = async () => {
    setLoadingCodes(true);
    try {
      let query = "";
      if (filterStatus) query += `status=${filterStatus}&`;
      if (filterProduct) query += `productId=${filterProduct}`;

      const response = await api.get(`/api/admin/qrcodes?${query}`);
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch QR codes");
      }

      setQrcodes(data.qrcodes || []);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Something went wrong.");
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.productId || formData.count <= 0) {
      toast.error("Please select a product and valid quantity.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post(`/api/admin/qrcodes/generate`, {
        productId: formData.productId,
        count: Number(formData.count)
      });
      
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to generate QR codes");
      }

      toast.success(data.message || `Successfully generated ${formData.count} codes!`);
      
      setFormData({ ...formData, count: 10 });
      setModalOpen(false);
      fetchQRCodes();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to generate.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCSV = () => {
    if (qrcodes.length === 0) {
      toast.error("No QR codes to download.");
      return;
    }

    const headers = ["QR Code Data", "Product Name", "Product SKU", "Status", "Scanned By", "Date Generated"];
    const rows = qrcodes.map(qr => [
      qr.code,
      qr.productId ? `"${qr.productId.name}"` : "N/A",
      qr.productId ? qr.productId.sku : "N/A",
      qr.status,
      qr.scannedBy ? `"${qr.scannedBy.name}"` : "-",
      new Date(qr.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `QRCodes_Export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentQRCodes = qrcodes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(qrcodes.length / itemsPerPage) || 1;

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaQrcode className="text-purple-600" />
            QR Code Generator
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Bulk generate unique QR codes for your products to print on packaging.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow"
          style={{ backgroundColor: themeColors.primary }}
        >
          <FaPlus /> Generate Codes
        </button>
      </div>

      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between" style={{ borderColor: themeColors.border }}>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadCSV}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm"
            >
              ⬇ Download CSV
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full sm:w-auto border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 bg-transparent transition-all"
              style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
            >
              <option value="" style={{ backgroundColor: themeColors.background, color: themeColors.text }}>All Products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id} style={{ backgroundColor: themeColors.background, color: themeColors.text }}>{p.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 bg-transparent transition-all"
              style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
            >
              <option value="" style={{ backgroundColor: themeColors.background, color: themeColors.text }}>All Statuses</option>
              <option value="generated" style={{ backgroundColor: themeColors.background, color: themeColors.text }}>Generated (Unscanned)</option>
              <option value="scanned" style={{ backgroundColor: themeColors.background, color: themeColors.text }}>Scanned (Used)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>QR Code Data</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Product</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Status</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Scanned By</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Date Generated</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Image</th>
              </tr>
            </thead>
            <tbody>
              {loadingCodes ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center">
                    <FaSpinner className="animate-spin text-2xl mx-auto" style={{ color: themeColors.primary }} />
                  </td>
                </tr>
              ) : currentQRCodes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    No QR codes found matching criteria.
                  </td>
                </tr>
              ) : (
                currentQRCodes.map((qr) => (
                  <tr key={qr._id} className="hover:bg-gray-50 transition border-b last:border-0" style={{ borderColor: themeColors.border }}>
                    <td className="p-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded border text-gray-700 select-all">
                        {qr.code}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-700">
                      {qr.productId ? qr.productId.name : "N/A"}
                    </td>
                    <td className="p-4">
                      {qr.status === 'scanned' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-green-100 text-green-700 rounded-full">
                          <FaCheckCircle /> Scanned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                          Generated
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {qr.scannedBy ? qr.scannedBy.name : "-"}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(qr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <a 
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr.code)}`} 
                        download={`QR_${qr.code}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block p-2 bg-gray-100 text-gray-600 rounded hover:bg-purple-100 hover:text-purple-600 transition shadow-sm"
                        title="View & Download QR Image"
                      >
                        <FaQrcode className="text-lg" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loadingCodes && qrcodes.length > 0 && (
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

      {/* Generate Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <FaLayerGroup className="text-blue-500" /> Generate QR Codes
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleGenerate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2 text-gray-700">
                  <FaBoxOpen className="text-gray-400"/> Select Product
                </label>
                {loadingProducts ? (
                  <div className="animate-pulse h-10 bg-gray-100 rounded-lg w-full"></div>
                ) : (
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    required
                  >
                    <option value="" disabled>-- Choose a product --</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (SKU: {p.sku})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Quantity to Generate
                </label>
                <input
                  type="number"
                  name="count"
                  value={formData.count}
                  onChange={handleInputChange}
                  min="1"
                  max="10000"
                  className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs mt-1 text-gray-500">Maximum 10,000 at a time.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGenerating || !formData.productId}
                  className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-lg font-bold transition shadow hover:shadow-lg disabled:opacity-50 active:scale-95"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {isGenerating ? <FaSpinner className="animate-spin" /> : <FaBolt />}
                  {isGenerating ? "Generating..." : "Generate Codes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default QRCodes;
