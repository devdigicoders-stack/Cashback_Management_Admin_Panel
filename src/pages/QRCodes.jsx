import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { 
  FaQrcode, FaBoxOpen, FaLayerGroup, FaBolt, FaCheckCircle, FaSpinner, 
  FaTimes, FaPlus, FaEye, FaDownload, FaPrint, FaClock, FaCheckDouble, 
  FaRupeeSign, FaCopy, FaCheck 
} from "react-icons/fa";
import api from "../utils/api";
import { exportToExcel } from "../utils/excelExport";

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

  // Modal state for Single QR Card Preview & Download
  const [previewQR, setPreviewQR] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

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

  // QR Statistics Summary
  const qrStats = useMemo(() => {
    const total = qrcodes.length;
    const used = qrcodes.filter(qr => qr.status === 'scanned').length;
    const unused = total - used;
    const totalCashback = qrcodes.reduce((sum, qr) => sum + (qr.cashbackAmountCredited || 0), 0);
    return { total, used, unused, totalCashback };
  }, [qrcodes]);

  const downloadCSVForGroup = (groupQRs, groupName) => {
    if (!groupQRs || groupQRs.length === 0) {
      toast.error("No QR codes to download.");
      return;
    }

    const columns = [
      { label: "QR Code Data", key: "code" },
      { label: "Product Name", key: (qr) => qr.productId?.name || "N/A" },
      { label: "Product SKU", key: (qr) => qr.productId?.sku || "N/A" },
      { label: "QR Type", key: (qr) => (qr.qrType === 'retailer' ? 'Retailer' : 'Electrician') },
      { label: "Status", key: (qr) => (qr.status === 'scanned' ? 'Used (Scanned)' : 'Unused (Generated)') },
      { label: "Scanned By", key: (qr) => qr.scannedBy?.name || "-" },
      { label: "Scanned Timestamp", key: (qr) => (qr.scannedAt ? new Date(qr.scannedAt).toLocaleString("en-IN") : "-") },
      { label: "Cashback Amount Credited (₹)", key: (qr) => qr.cashbackAmountCredited || 0 },
      { label: "Generated Date", key: (qr) => new Date(qr.createdAt).toLocaleString("en-IN") },
    ];

    exportToExcel(groupQRs, columns, `QRCodes_${groupName}`);
  };

  const handleDownloadGlobalCSV = () => {
    downloadCSVForGroup(qrcodes, "Report_All");
  };

  const generateQRCardDataUrl = (code, productName = "Product", sku = "", qrType = "Electrician", shortCode = "") => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 760;
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card outer border
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

      // Top banner
      const isRetailer = qrType.toLowerCase() === "retailer";
      ctx.fillStyle = isRetailer ? "#EA580C" : "#7C3AED";
      ctx.fillRect(16, 16, canvas.width - 32, 65);

      // Header Text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${qrType.toUpperCase()} CASHBACK QR`, canvas.width / 2, 56);

      // Product details
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(productName, canvas.width / 2, 122);

      if (sku) {
        ctx.fillStyle = "#64748B";
        ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText(`SKU: ${sku}`, canvas.width / 2, 150);
      }

      // Load QR Image
      const qrImg = new Image();
      qrImg.crossOrigin = "Anonymous";
      qrImg.onload = () => {
        // Draw QR Image
        const qrSize = 330;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 175;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Code Box Container
        const boxY = 530;
        const boxHeight = 135;
        const boxWidth = canvas.width - 80;
        const boxX = 40;

        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        ctx.strokeStyle = "#94A3B8";
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        // Code Label
        ctx.fillStyle = "#475569";
        ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText("SHORT CODE TO TYPE IN APP (IF CAMERA FAILS):", canvas.width / 2, boxY + 32);

        // Bold Mono Short Code
        const displayCode = shortCode || (code ? code.split('-').pop().slice(0, 8).toUpperCase() : code);
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 32px 'Courier New', Courier, monospace";
        ctx.fillText(displayCode, canvas.width / 2, boxY + 76);

        // App Instructions
        ctx.fillStyle = "#64748B";
        ctx.font = "italic 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText("Scan with Cashback App or enter short code manually", canvas.width / 2, boxY + 110);

        // Footer Note
        ctx.fillStyle = "#94A3B8";
        ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText("Official Cashback Loyalty System", canvas.width / 2, canvas.height - 30);

        resolve(canvas.toDataURL("image/png"));
      };

      qrImg.onerror = () => {
        resolve(null);
      };

      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(code)}`;
    });
  };

  const handleDownloadSingleQRCard = async (qr, productName, sku) => {
    setIsDownloadingImage(true);
    try {
      const type = qr.qrType === 'retailer' ? 'Retailer' : 'Electrician';
      const dataUrl = await generateQRCardDataUrl(qr.code, productName, sku, type, qr.shortCode);
      if (!dataUrl) {
        toast.error("Failed to generate QR card image.");
        return;
      }
      const link = document.createElement('a');
      link.download = `QR_${qr.code}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded QR image with code: ${qr.code}`);
    } catch (err) {
      toast.error("Error downloading QR image.");
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Copied code: ${code}`);
    setTimeout(() => setCopiedCode(false), 2000);
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
      shortCode: qr.shortCode || (qr.code ? qr.code.split('-').pop().slice(0, 8).toUpperCase() : ''),
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
          }
          .header h2 { margin: 0 0 6px 0; color: #0f172a; }
          .header p { margin: 0; color: #64748b; font-size: 14px; }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            justify-items: center;
          }
          .qr-item {
            text-align: center;
            border: 2px solid #cbd5e1;
            padding: 12px;
            border-radius: 10px;
            page-break-inside: avoid;
            background: #ffffff;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .qr-badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            border-radius: 4px;
            margin-bottom: 6px;
            background: #f1f5f9;
            color: #475569;
          }
          .qr-product {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 160px;
          }
          .qr-image {
            width: 130px;
            height: 130px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-code-box {
            margin-top: 8px;
            background: #f8fafc;
            border: 1.5px solid #94a3b8;
            border-radius: 6px;
            padding: 4px 8px;
            width: 92%;
            box-sizing: border-box;
          }
          .qr-code-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .qr-code-text {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.8px;
            word-break: break-all;
            margin-top: 2px;
          }
          @media print {
            body { padding: 10px; }
            .header { margin-bottom: 15px; }
            .qr-grid { gap: 10px; grid-template-columns: repeat(4, 1fr); }
            .qr-item { border: 1.5px solid #64748b; }
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
          qrCodesData.forEach((data, index) => {
            const item = document.createElement('div');
            item.className = 'qr-item';
            
            const badge = document.createElement('div');
            badge.className = 'qr-badge';
            badge.innerText = data.qrType + ' Cashback';
            item.appendChild(badge);

            const prod = document.createElement('div');
            prod.className = 'qr-product';
            prod.innerText = data.productName;
            item.appendChild(prod);

            const qrDiv = document.createElement('div');
            qrDiv.className = 'qr-image';
            qrDiv.id = 'qr-canvas-' + index;
            item.appendChild(qrDiv);
            
            const codeBox = document.createElement('div');
            codeBox.className = 'qr-code-box';
            codeBox.innerHTML = '<div class="qr-code-label">Short Code (Type in app):</div><div class="qr-code-text">' + (data.shortCode || data.code) + '</div>';
            item.appendChild(codeBox);

            grid.appendChild(item);
            
            new QRCode(qrDiv, {
              text: data.code,
              width: 130,
              height: 130,
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
            QR Code Management & Used/Unused Reports
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Generate product QR codes, track used vs unused status, and export Excel reports.
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

      {/* QR Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilterStatus("")}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === '' ? 'ring-2 ring-purple-500' : ''}`}
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total QRs</span>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><FaQrcode /></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-purple-700">{qrStats.total}</p>
        </div>

        <div 
          onClick={() => setFilterStatus("scanned")}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === 'scanned' ? 'ring-2 ring-green-500' : ''}`}
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Used (Scanned)</span>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><FaCheckDouble /></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-green-600">{qrStats.used}</p>
        </div>

        <div 
          onClick={() => setFilterStatus("generated")}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === 'generated' ? 'ring-2 ring-blue-500' : ''}`}
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Unused (Generated)</span>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FaClock /></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-600">{qrStats.unused}</p>
        </div>

        <div className="p-4 rounded-xl border shadow-xs" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Cashback Paid</span>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><FaRupeeSign /></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-600">₹ {qrStats.totalCashback}</p>
        </div>
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
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded border text-gray-700 select-all">
                              {qr.code}
                            </span>
                            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Short Code: {qr.shortCode || (qr.code ? qr.code.split('-').pop().slice(0, 8).toUpperCase() : '-')}
                            </span>
                          </div>
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
                          <div className="inline-flex items-center gap-1.5">
                            <button 
                              onClick={() => setPreviewQR({ ...qr, productName: selectedProductGroup.product?.name || 'Product', sku: selectedProductGroup.product?.sku || '' })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition shadow-xs text-xs font-semibold"
                              title="View QR Card with Code"
                            >
                              <FaEye /> View Card
                            </button>
                            <button 
                              onClick={() => handleDownloadSingleQRCard(qr, selectedProductGroup.product?.name, selectedProductGroup.product?.sku)}
                              disabled={isDownloadingImage}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition shadow-xs text-xs font-medium"
                              title="Download PNG Picture (with Code)"
                            >
                              <FaDownload />
                            </button>
                          </div>
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

      {/* Single QR Card Preview & Download Modal */}
      {previewQR && (
        <div className="fixed inset-0 flex items-center justify-center z-60 p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <FaQrcode className="text-purple-600 text-lg" />
                <h3 className="font-bold text-gray-800">QR Code Picture & Details</h3>
              </div>
              <button 
                onClick={() => setPreviewQR(null)} 
                className="text-gray-400 hover:text-gray-600 transition p-1 text-lg rounded-full hover:bg-gray-200"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Content - Printable QR Card Preview */}
            <div className="p-6 flex flex-col items-center">
              <div className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-5 bg-white shadow-sm flex flex-col items-center text-center">
                
                {/* Badge */}
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-2 ${previewQR.qrType === 'retailer' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                  {previewQR.qrType === 'retailer' ? 'Retailer' : 'Electrician'} Cashback QR
                </span>

                {/* Product Name & SKU */}
                <h4 className="font-bold text-gray-900 text-lg leading-snug">{previewQR.productName}</h4>
                {previewQR.sku && <p className="text-xs text-gray-500 font-medium">SKU: {previewQR.sku}</p>}

                {/* QR Image */}
                <div className="my-4 p-2 bg-white rounded-xl border border-gray-100 shadow-inner flex items-center justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(previewQR.code)}`}
                    alt={previewQR.code}
                    className="w-52 h-52 object-contain"
                  />
                </div>

                {/* Prominent Short Code Box */}
                <div className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Short Code to Type in App:
                  </span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="font-mono font-black text-2xl text-purple-700 tracking-widest select-all">
                      {previewQR.shortCode || (previewQR.code ? previewQR.code.split('-').pop().slice(0, 8).toUpperCase() : previewQR.code)}
                    </span>
                    <button
                      onClick={() => handleCopyCode(previewQR.shortCode || previewQR.code)}
                      className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-md transition border shadow-xs text-xs"
                      title="Copy Short Code"
                    >
                      {copiedCode ? <FaCheck className="text-green-600" /> : <FaCopy />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 italic">
                    (Simple 6-character code to easily enter in mobile app)
                  </span>
                </div>

              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  handlePrintSheet([previewQR], previewQR.productName, previewQR.sku);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition shadow-xs"
              >
                <FaPrint /> Print Card
              </button>

              <button
                onClick={() => handleDownloadSingleQRCard(previewQR, previewQR.productName, previewQR.sku)}
                disabled={isDownloadingImage}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50"
              >
                {isDownloadingImage ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                Download Picture (PNG)
              </button>
            </div>

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

