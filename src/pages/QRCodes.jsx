import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaQrcode, FaBoxOpen, FaLayerGroup, FaBolt, FaCheckCircle, FaSpinner, FaTimes, FaPlus, FaEye, FaDownload, FaPrint } from "react-icons/fa";
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
  
  // Modal state for Details
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedProductGroup, setSelectedProductGroup] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal Pagination states
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(10);

  // Form State
  const [formData, setFormData] = useState({
    productId: "",
    count: 10,
    qrType: "electrician"
  });

  // Filters State
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterModalType, setFilterModalType] = useState("all");

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
  
  useEffect(() => {
    setModalCurrentPage(1);
  }, [modalItemsPerPage, selectedProductGroup]);

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
        count: Number(formData.count),
        qrType: formData.qrType
      });
      
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to generate QR codes");
      }

      toast.success(data.message || `Successfully generated ${formData.count} codes!`);
      
      setFormData({ ...formData, count: 10, qrType: "electrician" });
      setModalOpen(false);
      fetchQRCodes();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to generate.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSVForGroup = (groupQRs, groupName) => {
    if (!groupQRs || groupQRs.length === 0) {
      toast.error("No QR codes to download.");
      return;
    }

    const headers = ["QR Code Data", "Product Name", "Product SKU", "Status", "Scanned By", "Date Generated"];
    const rows = groupQRs.map(qr => [
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
    link.setAttribute("download", `${groupName.replace(/\s+/g, '_')}_QRCodes_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadGlobalCSV = () => {
    downloadCSVForGroup(qrcodes, "All");
  };

  const handlePrintSheet = (groupQRs, groupName, sku) => {
    if (!groupQRs || groupQRs.length === 0) {
      toast.error("No QR codes available to print.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the sheet.");
      return;
    }

    // Pass data to the print window to render client-side
    const qrDataList = groupQRs.map(qr => ({
      code: qr.code,
      qrType: qr.qrType === 'retailer' ? 'Retailer' : 'Electrician',
      productName: groupName
    }));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - ${groupName} (${sku})</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 20px;
            justify-items: center;
          }
          .qr-item {
            text-align: center;
            border: 1px dashed #ccc;
            padding: 10px;
            border-radius: 8px;
            page-break-inside: avoid;
          }
          .qr-image {
            width: 120px;
            height: 120px;
            margin: 0 auto 5px auto;
          }
          .qr-text {
            font-size: 11px;
            color: #333;
            word-break: break-all;
            margin-top: 5px;
            line-height: 1.4;
          }
          @media print {
            body { padding: 0; }
            .header { margin-bottom: 20px; }
            .qr-grid {
              gap: 10px;
            }
            .qr-item {
              border: 1px solid #ddd;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Product: ${groupName}</h2>
          <p>SKU: ${sku} | Total QRs: ${groupQRs.length}</p>
        </div>
        <div class="qr-grid" id="qr-grid">
          <!-- JS will render QRs here instantly -->
        </div>
        <script>
          const qrCodesData = ${JSON.stringify(qrDataList)};
          const grid = document.getElementById('qr-grid');
          
          // Render each QR code using client-side library
          qrCodesData.forEach(data => {
            const item = document.createElement('div');
            item.className = 'qr-item';
            
            const qrDiv = document.createElement('div');
            qrDiv.className = 'qr-image';
            
            const textDiv = document.createElement('div');
            textDiv.className = 'qr-text';
            textDiv.innerHTML = data.code;
            
            item.appendChild(qrDiv);
            item.appendChild(textDiv);
            grid.appendChild(item);
            
            new QRCode(qrDiv, {
              text: data.code,
              width: 120,
              height: 120,
              colorDark : "#000000",
              colorLight : "#ffffff",
              correctLevel : QRCode.CorrectLevel.M
            });
          });

          // Wait for canvases to render (almost instant), then print
          setTimeout(() => {
            window.print();
          }, 1000);
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const groupedQRCodes = useMemo(() => {
    const groups = qrcodes.reduce((acc, qr) => {
      const prodId = qr.productId?._id || 'unknown';
      if (!acc[prodId]) {
        acc[prodId] = {
          product: qr.productId,
          total: 0,
          scanned: 0,
          generated: 0,
          retailerCount: 0,
          electricianCount: 0,
          retailerScanned: 0,
          electricianScanned: 0,
          qrcodes: []
        };
      }
      acc[prodId].total += 1;
      
      if (qr.status === 'scanned') {
        acc[prodId].scanned += 1;
        if (qr.qrType === 'retailer') acc[prodId].retailerScanned += 1;
        else acc[prodId].electricianScanned += 1;
      } else {
        acc[prodId].generated += 1;
      }
      
      if (qr.qrType === 'retailer') acc[prodId].retailerCount += 1;
      else acc[prodId].electricianCount += 1;

      acc[prodId].qrcodes.push(qr);
      return acc;
    }, {});
    return Object.values(groups);
  }, [qrcodes]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroupedQRCodes = groupedQRCodes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(groupedQRCodes.length / itemsPerPage) || 1;
  
  // Modal pagination calculations
  const filteredModalQRCodes = selectedProductGroup ? selectedProductGroup.qrcodes.filter(qr => filterModalType === "all" || qr.qrType === filterModalType) : [];
  const modalIndexOfLastItem = modalCurrentPage * modalItemsPerPage;
  const modalIndexOfFirstItem = modalIndexOfLastItem - modalItemsPerPage;
  const currentModalQRCodes = filteredModalQRCodes.slice(modalIndexOfFirstItem, modalIndexOfLastItem);
  const modalTotalPages = Math.ceil(filteredModalQRCodes.length / modalItemsPerPage) || 1;

  const handleViewDetails = (group) => {
    setSelectedProductGroup(group);
    setFilterModalType("all");
    setModalCurrentPage(1);
    setDetailsModalOpen(true);
  };

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
              onClick={handleDownloadGlobalCSV}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm flex items-center gap-2"
            >
              <FaDownload /> Download All CSV
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

        {/* Main Table (Grouped by Product) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Product Name</th>
                <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>SKU</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Total QRs</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Elec. (Gen)</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Retailer (Gen)</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Elec. (Used)</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Retailer (Used)</th>
                <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingCodes ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center">
                    <FaSpinner className="animate-spin text-2xl mx-auto" style={{ color: themeColors.primary }} />
                  </td>
                </tr>
              ) : currentGroupedQRCodes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    No QR codes found matching criteria.
                  </td>
                </tr>
              ) : (
                currentGroupedQRCodes.map((group) => (
                  <tr key={group.product?._id || 'unknown'} className="hover:bg-gray-50 transition border-b last:border-0" style={{ borderColor: themeColors.border }}>
                    <td className="p-4 font-medium text-sm text-gray-800">
                      {group.product?.name || "Unknown Product"}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {group.product?.sku || "N/A"}
                    </td>
                    <td className="p-4 text-center font-bold text-gray-700">
                      {group.total}
                    </td>
                    <td className="p-4 text-center text-purple-600 font-medium">
                      {group.electricianCount}
                    </td>
                    <td className="p-4 text-center text-orange-600 font-medium">
                      {group.retailerCount}
                    </td>
                    <td className="p-4 text-center text-purple-800 font-medium bg-purple-50">
                      {group.electricianScanned}
                    </td>
                    <td className="p-4 text-center text-orange-800 font-medium bg-orange-50">
                      {group.retailerScanned}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleViewDetails(group)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-sm text-white"
                        style={{ backgroundColor: '#1A365D' }}
                      >
                        <FaEye /> View QRs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loadingCodes && groupedQRCodes.length > 0 && (
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
              <span>products</span>
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

      {/* Details Modal */}
      {detailsModalOpen && selectedProductGroup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                  <FaQrcode className="text-purple-600" /> 
                  QR Codes for {selectedProductGroup.product?.name || "Unknown Product"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {selectedProductGroup.total} total QR codes (SKU: {selectedProductGroup.product?.sku || "N/A"})
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <select
                  value={filterModalType}
                  onChange={(e) => setFilterModalType(e.target.value)}
                  className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All Types</option>
                  <option value="electrician">Electrician Only</option>
                  <option value="retailer">Retailer Only</option>
                </select>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePrintSheet(filteredModalQRCodes, selectedProductGroup.product?.name || "Product", selectedProductGroup.product?.sku || "N/A")}
                    className="px-4 py-2 text-white rounded-lg text-sm font-bold transition shadow-sm flex items-center gap-2"
                    style={{ backgroundColor: '#1A365D' }}
                  >
                    <FaPrint /> Print Filtered
                  </button>
                  <button 
                    onClick={() => downloadCSVForGroup(filteredModalQRCodes, selectedProductGroup.product?.name || "Product")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm flex items-center gap-2"
                  >
                    <FaDownload /> Download CSV
                  </button>
                  <button onClick={() => setDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition text-xl p-1 ml-2">
                    <FaTimes />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Body (Table) */}
            <div className="overflow-y-auto flex-1 p-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 shadow-sm z-10">
                  <tr style={{ color: themeColors.textSecondary }}>
                    <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>QR Code Data</th>
                    <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Type</th>
                    <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Status</th>
                    <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Scanned By & Time</th>
                    <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Date & Time Generated</th>
                    <th className="p-4 font-medium text-sm border-b text-center" style={{ borderColor: themeColors.border }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentModalQRCodes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        No QR codes found for this product.
                      </td>
                    </tr>
                  ) : (
                    currentModalQRCodes.map((qr) => (
                      <tr key={qr._id} className="hover:bg-gray-50 transition border-b last:border-0" style={{ borderColor: themeColors.border }}>
                        <td className="p-4">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded border text-gray-700 select-all">
                            {qr.code}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${qr.qrType === 'retailer' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                            {qr.qrType === 'retailer' ? 'Retailer' : 'Electrician'}
                          </span>
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
                          {qr.scannedBy ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800">{qr.scannedBy.name}</span>
                              {qr.scannedAt && <span className="text-xs text-gray-500 mt-0.5">{new Date(qr.scannedAt).toLocaleString('en-IN')}</span>}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {new Date(qr.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-center">
                          <a 
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr.code)}`} 
                            download={`QR_${qr.code}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-purple-100 hover:text-purple-700 transition shadow-sm text-xs font-medium"
                            title="View & Download QR Image"
                          >
                            <FaQrcode /> View Image
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Pagination */}
            {selectedProductGroup.qrcodes.length > 0 && (
              <div className="p-4 border-t flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 shrink-0" style={{ borderColor: themeColors.border }}>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Show</span>
                  <select
                    value={modalItemsPerPage}
                    onChange={(e) => setModalItemsPerPage(Number(e.target.value))}
                    className="p-1 border rounded-md focus:outline-none focus:ring-1"
                    style={{ borderColor: themeColors.border }}
                  >
                    {[10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span>entries</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={modalCurrentPage === 1}
                    onClick={() => setModalCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="px-3 py-1 rounded-md text-sm font-medium border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    style={{ borderColor: themeColors.border }}
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm font-medium px-2 text-gray-700">
                    Page {modalCurrentPage} of {modalTotalPages}
                  </span>

                  <button
                    disabled={modalCurrentPage === modalTotalPages || modalTotalPages === 0}
                    onClick={() => setModalCurrentPage((prev) => Math.min(prev + 1, modalTotalPages))}
                    className="px-3 py-1 rounded-md text-sm font-medium border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    style={{ borderColor: themeColors.border }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                    className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
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
                  className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  required
                />
                <p className="text-xs mt-1 text-gray-500">Maximum 10,000 at a time.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  QR Type (For Whom?)
                </label>
                <select
                  name="qrType"
                  value={formData.qrType}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                  required
                >
                  <option value="electrician">Electrician Cashback</option>
                  <option value="retailer">Retailer Cashback</option>
                </select>
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
