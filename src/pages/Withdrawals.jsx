import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { 
  FaMoneyBillWave, FaCheckCircle, FaTimesCircle, FaClock, FaEye, 
  FaDownload, FaUpload, FaFileExcel, FaCopy, FaCheck, FaSearch, 
  FaSpinner, FaTimes, FaListAlt, FaBuilding 
} from "react-icons/fa";
import api from "../utils/api";
import { exportToExcel } from "../utils/excelExport";

const Withdrawals = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Single Process Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processData, setProcessData] = useState({ action: "approve", transactionNumber: "", adminRemarks: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk UTR Upload Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState("file"); // "file" | "manual"
  const [parsedBulkData, setParsedBulkData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [batchManualEntries, setBatchManualEntries] = useState({});
  const fileInputRef = useRef(null);

  // Copy state
  const [copiedId, setCopiedId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchWithdrawals();
  }, [filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, itemsPerPage, searchTerm]);

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
      toast.error(err.message || "Something went wrong fetching payouts");
    } finally {
      setLoading(false);
    }
  };

  // Summary statistics
  const stats = useMemo(() => {
    const total = withdrawals.length;
    const pending = withdrawals.filter(w => w.status === 'pending').length;
    const processing = withdrawals.filter(w => w.status === 'processing').length;
    const approved = withdrawals.filter(w => w.status === 'approved').length;
    const totalApprovedAmt = withdrawals
      .filter(w => w.status === 'approved')
      .reduce((sum, w) => sum + (w.amount || 0), 0);
    const totalPendingAmt = withdrawals
      .filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + (w.amount || 0), 0);
    return { total, pending, processing, approved, totalApprovedAmt, totalPendingAmt };
  }, [withdrawals]);

  // Filtered withdrawals with search
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      const userName = (w.userId?.name || "").toLowerCase();
      const userPhone = w.userId?.phone || "";
      const bankName = (w.bankSnapshot?.bankName || w.userId?.bankDetails?.bankName || "").toLowerCase();
      const accNo = w.bankSnapshot?.accountNumber || w.userId?.bankDetails?.accountNumber || "";
      const ifsc = (w.bankSnapshot?.ifscCode || w.userId?.bankDetails?.ifscCode || "").toLowerCase();
      const txn = (w.transactionNumber || "").toLowerCase();
      return userName.includes(q) || userPhone.includes(q) || bankName.includes(q) || accNo.includes(q) || ifsc.includes(q) || txn.includes(q);
    });
  }, [withdrawals, searchTerm]);

  // Export to Excel for Bank Transfer / Reports
  const handleExportWithdrawalsExcel = () => {
    const columns = [
      { label: "Withdrawal ID", key: "_id" },
      { label: "User Name", key: (w) => w.userId?.name || "N/A" },
      { label: "Phone Number", key: (w) => w.userId?.phone || "N/A" },
      { label: "Role", key: (w) => w.userId?.role || "N/A" },
      { label: "Requested Amount (₹)", key: "amount" },
      { label: "Account Holder", key: (w) => w.bankSnapshot?.accountHolderName || w.userId?.bankDetails?.accountHolderName || "-" },
      { label: "Account Number", key: (w) => w.bankSnapshot?.accountNumber || w.userId?.bankDetails?.accountNumber || "-" },
      { label: "IFSC Code", key: (w) => w.bankSnapshot?.ifscCode || w.userId?.bankDetails?.ifscCode || "-" },
      { label: "Bank Name", key: (w) => w.bankSnapshot?.bankName || w.userId?.bankDetails?.bankName || "-" },
      { label: "Status", key: "status" },
      { label: "Transaction / UTR Number", key: (w) => w.transactionNumber || "" },
      { label: "Admin Remarks", key: (w) => w.adminRemarks || "" },
      { label: "Requested Date", key: (w) => new Date(w.createdAt).toLocaleString("en-IN") },
    ];
    exportToExcel(filteredWithdrawals, columns, `Bank_Payouts_${filterStatus}`);
  };

  // Download Sample UTR CSV Template
  const handleDownloadUTRTemplate = () => {
    const pendingList = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
    const listToExport = pendingList.length > 0 ? pendingList : withdrawals.slice(0, 5);

    const columns = [
      { label: "Withdrawal ID", key: "_id" },
      { label: "User Name", key: (w) => w.userId?.name || "N/A" },
      { label: "Account Number", key: (w) => w.bankSnapshot?.accountNumber || w.userId?.bankDetails?.accountNumber || "" },
      { label: "IFSC Code", key: (w) => w.bankSnapshot?.ifscCode || w.userId?.bankDetails?.ifscCode || "" },
      { label: "Amount", key: "amount" },
      { label: "Transaction / UTR Number", key: () => "" },
      { label: "Admin Remarks", key: () => "Bank Transfer Completed" },
    ];
    exportToExcel(listToExport, columns, `Bank_UTR_Upload_Template`);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Single Process Modal Handlers
  const handleProcessClick = (withdrawal) => {
    setProcessingId(withdrawal._id);
    setProcessData({ 
      action: "approve", 
      transactionNumber: withdrawal.transactionNumber || "", 
      adminRemarks: withdrawal.adminRemarks || "" 
    });
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

      toast.success(data.message || `Withdrawal ${processData.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setModalOpen(false);
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error processing withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV / Text File Parser for Bulk Bank UTR Upload
  const parseCSVText = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];

    // Parse CSV line handling quoted fields
    const parseLine = (line) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === '\t') && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Find index of essential columns
    const idIdx = headers.findIndex(h => h.includes('withdrawalid') || h === 'id' || h === '_id' || h.includes('payoutid'));
    const utrIdx = headers.findIndex(h => h.includes('utr') || h.includes('transaction') || h.includes('refno') || h.includes('txnid') || h.includes('bankref'));
    const accIdx = headers.findIndex(h => h.includes('account') || h.includes('accno') || h.includes('acnumber'));
    const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('amt') || h.includes('requestedamount'));
    const remarksIdx = headers.findIndex(h => h.includes('remark') || h.includes('note') || h.includes('comment'));

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === 0 || values.every(v => v === "")) continue;

      const rawId = idIdx !== -1 ? values[idIdx]?.replace(/["']/g, '').trim() : "";
      const rawUtr = utrIdx !== -1 ? values[utrIdx]?.replace(/["']/g, '').trim() : "";
      const rawAcc = accIdx !== -1 ? values[accIdx]?.replace(/["']/g, '').trim() : "";
      const rawAmt = amtIdx !== -1 ? values[amtIdx]?.replace(/[^0-9.]/g, '').trim() : "";
      const rawRemarks = remarksIdx !== -1 ? values[remarksIdx]?.replace(/["']/g, '').trim() : "";

      // Match with loaded withdrawals to show live preview
      let matched = null;
      if (rawId && rawId.length === 24) {
        matched = withdrawals.find(w => w._id === rawId);
      }
      if (!matched && rawAcc) {
        matched = withdrawals.find(w => {
          const acc = w.bankSnapshot?.accountNumber || w.userId?.bankDetails?.accountNumber || "";
          return acc && String(acc).trim() === rawAcc;
        });
      }

      parsed.push({
        withdrawalId: rawId || matched?._id || "",
        accountNumber: rawAcc || matched?.bankSnapshot?.accountNumber || matched?.userId?.bankDetails?.accountNumber || "",
        amount: rawAmt || matched?.amount || 0,
        transactionNumber: rawUtr,
        adminRemarks: rawRemarks || "Bank Transfer Completed",
        matchedWithdrawal: matched,
        isValid: Boolean((rawId || rawAcc) && rawUtr),
      });
    }

    return parsed;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsed = parseCSVText(text);
        if (parsed.length === 0) {
          toast.error("No valid transaction rows found in the uploaded file.");
          return;
        }
        setParsedBulkData(parsed);
        toast.success(`Loaded ${parsed.length} rows from ${file.name}`);
      } catch (err) {
        toast.error("Failed to read the file. Please ensure it is a valid CSV/Excel file.");
      }
    };
    reader.readAsText(file);
  };

  // Submit Bulk UTR Upload to Backend API
  const handleSubmitBulkUTRs = async () => {
    const validItems = parsedBulkData.filter(item => item.isValid && item.transactionNumber);
    if (validItems.length === 0) {
      toast.error("No valid rows with UTR/Transaction numbers to submit.");
      return;
    }

    setIsUploadingBulk(true);
    try {
      const payload = validItems.map(item => ({
        withdrawalId: item.withdrawalId,
        accountNumber: item.accountNumber,
        amount: item.amount,
        transactionNumber: item.transactionNumber,
        adminRemarks: item.adminRemarks || "Bank transfer completed via UTR bulk upload"
      }));

      const response = await api.post(`/api/admin/withdrawals/bulk-upload-utr`, { transactions: payload });
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to upload UTR numbers");
      }

      toast.success(data.message || `Successfully processed ${data.updatedCount} payout UTRs!`);
      setBulkModalOpen(false);
      setParsedBulkData([]);
      setFileName("");
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Bulk UTR upload failed");
    } finally {
      setIsUploadingBulk(false);
    }
  };

  // Manual Batch UTR Submit
  const handleBatchManualSubmit = async () => {
    const entries = Object.entries(batchManualEntries)
      .filter(([id, utr]) => utr && utr.trim() !== "")
      .map(([withdrawalId, transactionNumber]) => ({
        withdrawalId,
        transactionNumber: transactionNumber.trim(),
        adminRemarks: "Bank transfer completed via Batch Entry"
      }));

    if (entries.length === 0) {
      toast.error("Please enter at least one UTR number.");
      return;
    }

    setIsUploadingBulk(true);
    try {
      const response = await api.post(`/api/admin/withdrawals/bulk-upload-utr`, { transactions: entries });
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to submit batch UTRs");
      }

      toast.success(`Successfully updated ${data.updatedCount} withdrawal UTRs!`);
      setBulkModalOpen(false);
      setBatchManualEntries({});
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Batch submission failed");
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="px-3 py-1 text-xs rounded-full font-bold bg-green-100 text-green-700 flex items-center gap-1 w-fit"><FaCheckCircle /> Approved / Paid</span>;
      case "processing":
        return <span className="px-3 py-1 text-xs rounded-full font-bold bg-blue-100 text-blue-700 flex items-center gap-1 w-fit"><FaClock /> In-Processing</span>;
      case "rejected":
        return <span className="px-3 py-1 text-xs rounded-full font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit"><FaTimesCircle /> Rejected</span>;
      case "pending":
      default:
        return <span className="px-3 py-1 text-xs rounded-full font-bold bg-amber-100 text-amber-700 flex items-center gap-1 w-fit"><FaClock /> Pending</span>;
    }
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWithdrawals = filteredWithdrawals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage) || 1;

  const pendingOrProcessingWithdrawals = useMemo(() => {
    return withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
  }, [withdrawals]);

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaMoneyBillWave className="text-green-600" />
            Withdrawals & Bank Payouts
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Review payout requests, transfer via bank, and bulk upload Bank Transaction / UTR numbers.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setBulkMode("file");
              setBulkModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-bold bg-purple-600 hover:bg-purple-700 transition-all shadow-sm text-sm cursor-pointer"
          >
            <FaUpload /> Upload Bank UTRs (Excel/CSV)
          </button>

          <button
            onClick={handleExportWithdrawalsExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-bold bg-green-600 hover:bg-green-700 transition-all shadow-sm text-sm cursor-pointer"
          >
            <FaDownload /> Export Payout Sheet
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilterStatus("all")}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === 'all' ? 'ring-2 ring-purple-500' : ''}`}
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Requests</span>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><FaListAlt /></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-purple-700">{stats.total}</p>
        </div>

        <div 
          onClick={() => setFilterStatus("pending")}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === 'pending' ? 'ring-2 ring-amber-500' : ''}`}
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Pending Approval</span>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><FaClock /></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-600">{stats.pending}</p>
          <span className="text-xs text-gray-400">₹{stats.totalPendingAmt} queued</span>
        </div>

        <div 
          onClick={() => setFilterStatus("approved")}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === 'approved' ? 'ring-2 ring-green-500' : ''}`}
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Transferred / Paid</span>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><FaCheckCircle /></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-green-600">{stats.approved}</p>
          <span className="text-xs text-green-700 font-semibold">₹{stats.totalApprovedAmt} paid</span>
        </div>

        <div 
          onClick={() => {
            setBulkMode("manual");
            setBulkModalOpen(true);
          }}
          className="p-4 rounded-xl border shadow-xs cursor-pointer transition-all hover:border-purple-300"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Batch UTR Entry</span>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FaUpload /></div>
          </div>
          <p className="text-sm font-bold mt-2 text-blue-600">Quick Enter UTRs &rarr;</p>
          <span className="text-xs text-gray-400">{pendingOrProcessingWithdrawals.length} awaiting UTR</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        
        {/* Toolbar & Search */}
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border }}>
          
          {/* Status Tabs */}
          <div className="flex space-x-1.5 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "processing", label: "In-Processing" },
              { id: "approved", label: "Approved / Paid" },
              { id: "rejected", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === tab.id ? "bg-white shadow-sm text-green-700" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search user, bank, A/C, UTR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              style={{ borderColor: themeColors.border }}
            />
          </div>

        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                <th className="p-4 font-medium text-xs border-b uppercase" style={{ borderColor: themeColors.border }}>User & Contact</th>
                <th className="p-4 font-medium text-xs border-b uppercase" style={{ borderColor: themeColors.border }}>Bank Account Details</th>
                <th className="p-4 font-medium text-xs border-b uppercase text-right" style={{ borderColor: themeColors.border }}>Amount</th>
                <th className="p-4 font-medium text-xs border-b uppercase" style={{ borderColor: themeColors.border }}>Bank UTR / Txn No.</th>
                <th className="p-4 font-medium text-xs border-b uppercase" style={{ borderColor: themeColors.border }}>Requested Date</th>
                <th className="p-4 font-medium text-xs border-b uppercase" style={{ borderColor: themeColors.border }}>Status</th>
                <th className="p-4 font-medium text-xs border-b uppercase text-center" style={{ borderColor: themeColors.border }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center">
                    <FaSpinner className="animate-spin text-3xl mx-auto text-green-600" />
                  </td>
                </tr>
              ) : currentWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-gray-500">
                    No withdrawal records found matching your criteria.
                  </td>
                </tr>
              ) : (
                currentWithdrawals.map((withdrawal) => {
                  const bank = withdrawal.bankSnapshot || withdrawal.userId?.bankDetails || {};
                  const isPaid = withdrawal.status === "approved";
                  return (
                    <tr key={withdrawal._id} className="hover:bg-gray-50 transition-colors border-b last:border-0" style={{ borderColor: themeColors.border }}>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">{withdrawal.userId?.name || "Unknown User"}</span>
                          <span className="text-xs text-gray-500 font-mono mt-0.5">{withdrawal.userId?.phone || "-"}</span>
                          {withdrawal.userId?.role && (
                            <span className="text-[10px] font-bold uppercase w-fit px-1.5 py-0.5 rounded mt-1 bg-gray-100 text-gray-700">
                              {withdrawal.userId.role}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-gray-800 flex items-center gap-1">
                            <FaBuilding className="text-gray-400 text-[10px]" />
                            {bank.bankName || "Bank Name N/A"}
                          </span>
                          <div className="flex items-center gap-1 text-gray-700 font-mono">
                            <span>A/C:</span>
                            <span className="font-bold select-all">{bank.accountNumber || "N/A"}</span>
                            {bank.accountNumber && (
                              <button 
                                onClick={() => handleCopy(bank.accountNumber, `acc_${withdrawal._id}`)}
                                className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                                title="Copy Account Number"
                              >
                                {copiedId === `acc_${withdrawal._id}` ? <FaCheck className="text-green-600 text-[10px]" /> : <FaCopy className="text-[10px]" />}
                              </button>
                            )}
                          </div>
                          <span className="text-gray-500 font-mono">IFSC: {bank.ifscCode || "-"}</span>
                          {bank.accountHolderName && (
                            <span className="text-gray-400 text-[11px]">Holder: {bank.accountHolderName}</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <span className="text-base font-bold text-green-600">
                          ₹{withdrawal.amount}
                        </span>
                      </td>

                      <td className="p-4">
                        {withdrawal.transactionNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 font-mono text-xs font-bold tracking-wider select-all">
                              {withdrawal.transactionNumber}
                            </span>
                            <button 
                              onClick={() => handleCopy(withdrawal.transactionNumber, `utr_${withdrawal._id}`)}
                              className="p-1 text-gray-400 hover:text-emerald-700 cursor-pointer"
                              title="Copy UTR Number"
                            >
                              {copiedId === `utr_${withdrawal._id}` ? <FaCheck className="text-green-600 text-xs" /> : <FaCopy className="text-xs" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Awaiting Bank UTR</span>
                        )}
                        {withdrawal.adminRemarks && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-1" title={withdrawal.adminRemarks}>
                            {withdrawal.adminRemarks}
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-xs text-gray-600">
                        {new Date(withdrawal.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>

                      <td className="p-4">
                        {getStatusBadge(withdrawal.status)}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleProcessClick(withdrawal)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                            isPaid
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isPaid ? "Update UTR" : "Process / Pay"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredWithdrawals.length > 0 && (
          <div className="p-4 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="p-1 border rounded-md focus:outline-none focus:ring-1 bg-white cursor-pointer"
                style={{ borderColor: themeColors.border }}
              >
                {[10, 20, 30, 50, 100].map((size) => (
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
                className="px-3 py-1 rounded-md text-sm font-medium border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                Previous
              </button>
              
              <span className="text-sm font-medium px-2" style={{ color: themeColors.textSecondary }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 rounded-md text-sm font-medium border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ====================================================
          🚀 BULK BANK UTR UPLOAD & BATCH ENTRY MODAL
         ==================================================== */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FaUpload className="text-purple-600" />
                  Upload Bank Transaction (UTR) Numbers
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update UTRs returned by bank to finalize payouts and notify electricians/retailers automatically.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBulkModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-200 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex border-b bg-gray-100 px-5 pt-3 gap-2">
              <button
                onClick={() => setBulkMode("file")}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  bulkMode === "file"
                    ? "border-purple-600 text-purple-700 bg-white rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Upload Excel / CSV File
              </button>
              <button
                onClick={() => setBulkMode("manual")}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  bulkMode === "manual"
                    ? "border-purple-600 text-purple-700 bg-white rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Quick Batch Form Entry ({pendingOrProcessingWithdrawals.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {bulkMode === "file" ? (
                <>
                  {/* File Upload Drop Area */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50">
                    <div>
                      <h4 className="text-sm font-bold text-purple-900">Upload Bank Response File (.csv / .xlsx)</h4>
                      <p className="text-xs text-purple-700 mt-0.5">
                        File should contain columns: <b>Withdrawal ID</b> (or <b>Account Number</b>) and <b>Transaction / UTR Number</b>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadUTRTemplate}
                        className="px-3 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <FaDownload /> Download Template
                      </button>

                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <FaUpload /> {fileName ? "Change File" : "Choose CSV File"}
                      </button>
                    </div>
                  </div>

                  {fileName && (
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border rounded-lg text-xs text-gray-700">
                      <span>Loaded File: <b>{fileName}</b> ({parsedBulkData.length} rows parsed)</span>
                      <span className="text-green-600 font-bold">
                        {parsedBulkData.filter(p => p.isValid).length} ready to upload
                      </span>
                    </div>
                  )}

                  {/* Parsed Preview Table */}
                  {parsedBulkData.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden shadow-xs">
                      <div className="p-3 bg-gray-50 border-b flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>Preview of Transactions to Approve ({parsedBulkData.length} records)</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 bg-gray-100 text-gray-600">
                            <tr>
                              <th className="p-2.5">User / Matched</th>
                              <th className="p-2.5">Account No</th>
                              <th className="p-2.5 text-right">Amount (₹)</th>
                              <th className="p-2.5">Bank UTR / Txn No</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedBulkData.map((item, idx) => (
                              <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-2.5">
                                  <p className="font-semibold text-gray-800">
                                    {item.matchedWithdrawal?.userId?.name || "Matched via ID/Acc"}
                                  </p>
                                  <span className="text-[10px] text-gray-500 font-mono">{item.withdrawalId || "-"}</span>
                                </td>
                                <td className="p-2.5 font-mono">{item.accountNumber || "-"}</td>
                                <td className="p-2.5 text-right font-bold text-green-600">₹{item.amount}</td>
                                <td className="p-2.5 font-mono font-bold text-purple-700">
                                  {item.transactionNumber ? (
                                    <span className="px-2 py-0.5 bg-purple-50 rounded border border-purple-200">
                                      {item.transactionNumber}
                                    </span>
                                  ) : (
                                    <span className="text-red-500 italic">Missing UTR</span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  {item.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                      <FaCheck /> Ready
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                      <FaTimes /> Incomplete
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 border border-dashed rounded-xl text-gray-400 space-y-2">
                      <FaFileExcel className="text-3xl mx-auto text-gray-300" />
                      <p className="text-xs font-medium">No file selected yet. Download the template or export payout sheet, fill UTR numbers, and upload.</p>
                    </div>
                  )}
                </>
              ) : (
                /* Manual Batch Entry Form */
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>Enter bank UTR / Ref numbers for all pending payouts below:</span>
                    <span className="font-bold text-purple-700">{pendingOrProcessingWithdrawals.length} pending payouts</span>
                  </div>

                  {pendingOrProcessingWithdrawals.length === 0 ? (
                    <div className="text-center p-8 border rounded-xl text-gray-400">
                      No pending or processing withdrawals to update!
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-gray-100 text-gray-600">
                          <tr>
                            <th className="p-2.5">User</th>
                            <th className="p-2.5">Bank & A/C</th>
                            <th className="p-2.5 text-right">Amount (₹)</th>
                            <th className="p-2.5">Enter Bank UTR / Txn No</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingOrProcessingWithdrawals.map((w) => {
                            const bank = w.bankSnapshot || w.userId?.bankDetails || {};
                            return (
                              <tr key={w._id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-2.5 font-bold text-gray-800">
                                  {w.userId?.name}
                                  <div className="text-[10px] text-gray-500 font-normal">{w.userId?.phone}</div>
                                </td>
                                <td className="p-2.5 font-mono">
                                  <div>{bank.bankName}</div>
                                  <div className="text-gray-500 font-bold">{bank.accountNumber}</div>
                                </td>
                                <td className="p-2.5 text-right font-bold text-green-600">
                                  ₹{w.amount}
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. UTR12345678"
                                    value={batchManualEntries[w._id] || ""}
                                    onChange={(e) => setBatchManualEntries({
                                      ...batchManualEntries,
                                      [w._id]: e.target.value
                                    })}
                                    className="w-full border rounded px-2 py-1 font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition cursor-pointer"
              >
                Cancel
              </button>

              {bulkMode === "file" ? (
                <button
                  type="button"
                  onClick={handleSubmitBulkUTRs}
                  disabled={isUploadingBulk || parsedBulkData.filter(p => p.isValid).length === 0}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isUploadingBulk ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  Upload & Approve All ({parsedBulkData.filter(p => p.isValid).length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBatchManualSubmit}
                  disabled={isUploadingBulk || Object.values(batchManualEntries).filter(v => v.trim()).length === 0}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isUploadingBulk ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  Submit All Filled UTRs
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ====================================================
          🔍 INDIVIDUAL PROCESS / COMPLETE MODAL
         ==================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Process / Complete Payout</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter bank transaction details & update status.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={submitProcess} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Action</label>
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
                    <span className="text-sm font-bold text-green-700">Approve & Mark Paid</span>
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
                    <span className="text-sm font-bold text-red-700">Reject</span>
                  </label>
                </div>
              </div>

              {processData.action === "approve" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank UTR / Transaction Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded-lg p-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. UTR1234567890 / TXN89238472"
                    value={processData.transactionNumber}
                    onChange={(e) => setProcessData({ ...processData, transactionNumber: e.target.value })}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">This number will be sent to the user in their SMS / Push notification.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Remarks (Optional)
                </label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder={processData.action === "approve" ? "e.g. Successfully transferred to bank account" : "e.g. Invalid account details"}
                  value={processData.adminRemarks}
                  onChange={(e) => setProcessData({ ...processData, adminRemarks: e.target.value })}
                ></textarea>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)} 
                  className="flex-1 py-2.5 bg-gray-100 text-gray-800 rounded-xl font-bold hover:bg-gray-200 transition cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={`flex-1 py-2.5 text-white rounded-xl font-bold transition disabled:opacity-50 shadow-sm cursor-pointer ${
                    processData.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : `Confirm ${processData.action === 'approve' ? 'Payment' : 'Rejection'}`}
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
