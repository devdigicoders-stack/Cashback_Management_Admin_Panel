import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  FaFileAlt,
  FaMoneyBillWave,
  FaUsers,
  FaQrcode,
  FaDownload,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaSpinner,
  FaCalendarAlt,
  FaFilter,
  FaUniversity,
  FaCheckDouble,
  FaExchangeAlt,
  FaBolt,
  FaStore,
  FaEye,
  FaReceipt,
  FaRedo,
  FaBoxOpen,
} from "react-icons/fa";
import api from "../utils/api";
import { exportToExcel } from "../utils/excelExport";

const Reports = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Active Main Tab: 'payouts' | 'users' | 'qrcodes'
  const [activeTab, setActiveTab] = useState(() => {
    const p = window.location.pathname.toLowerCase();
    const s = new URLSearchParams(window.location.search).get("tab");
    if (p.includes("/users") || s === "users") return "users";
    if (p.includes("/qrcodes") || s === "qrcodes") return "qrcodes";
    return "payouts";
  });

  useEffect(() => {
    const p = location.pathname.toLowerCase();
    const s = new URLSearchParams(location.search).get("tab");
    if (p.includes("/users") || s === "users") {
      setActiveTab("users");
    } else if (p.includes("/qrcodes") || s === "qrcodes") {
      setActiveTab("qrcodes");
    } else if (p.includes("/payouts") || s === "payouts") {
      setActiveTab("payouts");
    }
  }, [location]);

  // ==========================================
  // TAB 1: PAYOUTS & RTGS REPORT STATES
  // ==========================================
  const [withdrawals, setWithdrawals] = useState([]);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [payoutSummary, setPayoutSummary] = useState({
    totalCount: 0,
    totalAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    processingCount: 0,
    processingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    rejectedCount: 0,
    rejectedAmount: 0,
  });

  // Payout Filters - Default to 'pending'
  const [payoutStatus, setPayoutStatus] = useState("pending");
  const [payoutStartDate, setPayoutStartDate] = useState("");
  const [payoutEndDate, setPayoutEndDate] = useState("");
  const [payoutSearch, setPayoutSearch] = useState("");
  const [payoutDatePreset, setPayoutDatePreset] = useState("all");

  // Selection for RTGS / Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Complete Payment Modal State (Enter UTR)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedWithdrawalForPay, setSelectedWithdrawalForPay] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    action: "approve",
    transactionNumber: "",
    adminRemarks: "",
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedWithdrawalForReject, setSelectedWithdrawalForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  // Pagination for Payouts
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutItemsPerPage, setPayoutItemsPerPage] = useState(15);

  // ==========================================
  // TAB 2: USERS REPORT STATES
  // ==========================================
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userKycFilter, setUserKycFilter] = useState("all");
  const [userStartDate, setUserStartDate] = useState("");
  const [userEndDate, setUserEndDate] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userDatePreset, setUserDatePreset] = useState("all");

  // Pagination for Users
  const [userPage, setUserPage] = useState(1);
  const [userItemsPerPage, setUserItemsPerPage] = useState(15);

  // ==========================================
  // TAB 3: QR CODES REPORT STATES
  // ==========================================
  const [qrcodes, setQrcodes] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSummary, setQrSummary] = useState({
    totalCount: 0,
    scannedCount: 0,
    generatedCount: 0,
    totalCashbackDisbursed: 0,
  });

  const [qrStatusFilter, setQrStatusFilter] = useState("all");
  const [qrProductFilter, setQrProductFilter] = useState("all");
  const [qrTypeFilter, setQrTypeFilter] = useState("all");
  const [qrStartDate, setQrStartDate] = useState("");
  const [qrEndDate, setQrEndDate] = useState("");
  const [qrSearch, setQrSearch] = useState("");
  const [qrDatePreset, setQrDatePreset] = useState("all");

  // Pagination for QR Codes
  const [qrPage, setQrPage] = useState(1);
  const [qrItemsPerPage, setQrItemsPerPage] = useState(15);

  // Fetch Payouts on filter changes
  useEffect(() => {
    if (activeTab === "payouts") {
      fetchPayouts();
    }
  }, [payoutStatus, payoutStartDate, payoutEndDate, activeTab]);

  // Fetch Users when switching to users tab
  useEffect(() => {
    if (activeTab === "users" && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  // Fetch QR codes & products when switching to qrcodes tab
  useEffect(() => {
    if (activeTab === "qrcodes") {
      if (productsList.length === 0) fetchProducts();
      fetchQRCodes();
    }
  }, [activeTab, qrStatusFilter, qrProductFilter, qrTypeFilter, qrStartDate, qrEndDate]);

  // Handle Preset Date Range for Payouts
  const handlePayoutPresetChange = (preset) => {
    setPayoutDatePreset(preset);
    const now = new Date();
    if (preset === "all") {
      setPayoutStartDate("");
      setPayoutEndDate("");
    } else if (preset === "today") {
      const todayStr = now.toISOString().slice(0, 10);
      setPayoutStartDate(todayStr);
      setPayoutEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setPayoutStartDate(yStr);
      setPayoutEndDate(yStr);
    } else if (preset === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setPayoutStartDate(d.toISOString().slice(0, 10));
      setPayoutEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setPayoutStartDate(firstDay.toISOString().slice(0, 10));
      setPayoutEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "lastMonth") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setPayoutStartDate(firstDayLastMonth.toISOString().slice(0, 10));
      setPayoutEndDate(lastDayLastMonth.toISOString().slice(0, 10));
    }
  };

  // Handle Preset Date Range for Users
  const handleUserPresetChange = (preset) => {
    setUserDatePreset(preset);
    const now = new Date();
    if (preset === "all") {
      setUserStartDate("");
      setUserEndDate("");
    } else if (preset === "today") {
      const todayStr = now.toISOString().slice(0, 10);
      setUserStartDate(todayStr);
      setUserEndDate(todayStr);
    } else if (preset === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setUserStartDate(d.toISOString().slice(0, 10));
      setUserEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setUserStartDate(firstDay.toISOString().slice(0, 10));
      setUserEndDate(now.toISOString().slice(0, 10));
    }
  };

  // Handle Preset Date Range for QR Codes
  const handleQRPresetChange = (preset) => {
    setQrDatePreset(preset);
    const now = new Date();
    if (preset === "all") {
      setQrStartDate("");
      setQrEndDate("");
    } else if (preset === "today") {
      const todayStr = now.toISOString().slice(0, 10);
      setQrStartDate(todayStr);
      setQrEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setQrStartDate(y.toISOString().slice(0, 10));
      setQrEndDate(y.toISOString().slice(0, 10));
    } else if (preset === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setQrStartDate(d.toISOString().slice(0, 10));
      setQrEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setQrStartDate(firstDay.toISOString().slice(0, 10));
      setQrEndDate(now.toISOString().slice(0, 10));
    }
  };

  // ==========================================
  // API FETCH FUNCTIONS
  // ==========================================
  const fetchPayouts = async () => {
    setPayoutLoading(true);
    try {
      let queryParams = [];
      if (payoutStatus !== "all") queryParams.push(`status=${payoutStatus}`);
      if (payoutStartDate) queryParams.push(`startDate=${payoutStartDate}`);
      if (payoutEndDate) queryParams.push(`endDate=${payoutEndDate}`);

      const url = `/api/admin/withdrawals${queryParams.length > 0 ? `?${queryParams.join("&")}` : ""}`;
      const response = await api.get(url);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch payout requests");
      }
      setWithdrawals(data.withdrawals || []);
      if (data.summary) {
        setPayoutSummary(data.summary);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error fetching payout reports");
    } finally {
      setPayoutLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await api.get(`/api/admin/users`);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch users");
      }
      setUsers(data.users || []);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error fetching users");
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/api/admin/products`);
      if (response.data.success) {
        setProductsList(response.data.products || []);
      }
    } catch (err) {
      console.error("Failed to load products for filter", err);
    }
  };

  const fetchQRCodes = async () => {
    setQrLoading(true);
    try {
      let queryParams = [];
      if (qrStatusFilter !== "all") queryParams.push(`status=${qrStatusFilter}`);
      if (qrProductFilter !== "all") queryParams.push(`productId=${qrProductFilter}`);
      if (qrTypeFilter !== "all") queryParams.push(`qrType=${qrTypeFilter}`);
      if (qrStartDate) queryParams.push(`startDate=${qrStartDate}`);
      if (qrEndDate) queryParams.push(`endDate=${qrEndDate}`);

      const url = `/api/admin/qrcodes${queryParams.length > 0 ? `?${queryParams.join("&")}` : ""}`;
      const response = await api.get(url);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch QR codes");
      }
      setQrcodes(data.qrcodes || []);
      if (data.summary) {
        setQrSummary(data.summary);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error fetching QR reports");
    } finally {
      setQrLoading(false);
    }
  };

  // ==========================================
  // PAYOUTS FILTERING & CLIENT SEARCH
  // ==========================================
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      if (!payoutSearch.trim()) return true;
      const q = payoutSearch.toLowerCase();
      const userName = w.userId?.name?.toLowerCase() || "";
      const userPhone = w.userId?.phone || "";
      const bankName = (w.bankSnapshot?.bankName || w.userId?.bankDetails?.bankName || "").toLowerCase();
      const accHolder = (w.bankSnapshot?.accountHolderName || w.userId?.bankDetails?.accountHolderName || "").toLowerCase();
      const accNo = w.bankSnapshot?.accountNumber || w.userId?.bankDetails?.accountNumber || "";
      const ifsc = (w.bankSnapshot?.ifscCode || w.userId?.bankDetails?.ifscCode || "").toLowerCase();
      const txnNo = (w.transactionNumber || "").toLowerCase();

      return (
        userName.includes(q) ||
        userPhone.includes(q) ||
        bankName.includes(q) ||
        accHolder.includes(q) ||
        accNo.includes(q) ||
        ifsc.includes(q) ||
        txnNo.includes(q)
      );
    });
  }, [withdrawals, payoutSearch]);

  // Paginated Payouts
  const paginatedWithdrawals = useMemo(() => {
    const start = (payoutPage - 1) * payoutItemsPerPage;
    return filteredWithdrawals.slice(start, start + payoutItemsPerPage);
  }, [filteredWithdrawals, payoutPage, payoutItemsPerPage]);

  const totalPayoutPages = Math.ceil(filteredWithdrawals.length / payoutItemsPerPage) || 1;

  // ==========================================
  // USERS FILTERING & CLIENT SEARCH
  // ==========================================
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role
      if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;

      // Status
      if (userStatusFilter === "active" && !u.isActive) return false;
      if (userStatusFilter === "inactive" && u.isActive) return false;

      // KYC
      if (userKycFilter !== "all") {
        const aadhar = u.kycStatus?.aadhar || "pending";
        const pan = u.kycStatus?.pan || "pending";
        if (userKycFilter === "approved" && !(aadhar === "approved" || pan === "approved")) return false;
        if (userKycFilter === "submitted" && !(aadhar === "submitted" || pan === "submitted")) return false;
        if (userKycFilter === "pending" && (aadhar === "approved" || pan === "approved")) return false;
      }

      // Date Range
      if (userStartDate) {
        const uDate = new Date(u.createdAt);
        const start = new Date(userStartDate);
        start.setHours(0, 0, 0, 0);
        if (uDate < start) return false;
      }
      if (userEndDate) {
        const uDate = new Date(u.createdAt);
        const end = new Date(userEndDate);
        end.setHours(23, 59, 59, 999);
        if (uDate > end) return false;
      }

      // Search Query
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        const name = u.name?.toLowerCase() || "";
        const phone = u.phone || "";
        const firm = u.firmName?.toLowerCase() || "";
        const salesCode = (u.salesCode || u.salesPerson?.code || "").toLowerCase();
        const salesName = (u.salesPerson?.name || "").toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          firm.includes(q) ||
          salesCode.includes(q) ||
          salesName.includes(q)
        );
      }

      return true;
    });
  }, [users, userRoleFilter, userStatusFilter, userKycFilter, userStartDate, userEndDate, userSearch]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userItemsPerPage;
    return filteredUsers.slice(start, start + userItemsPerPage);
  }, [filteredUsers, userPage, userItemsPerPage]);

  const totalUserPages = Math.ceil(filteredUsers.length / userItemsPerPage) || 1;

  // ==========================================
  // QR CODES FILTERING & CLIENT SEARCH
  // ==========================================
  const filteredQRCodes = useMemo(() => {
    return qrcodes.filter((qr) => {
      if (!qrSearch.trim()) return true;
      const q = qrSearch.toLowerCase();
      const code = qr.code?.toLowerCase() || "";
      const prodName = qr.productId?.name?.toLowerCase() || "";
      const prodSku = qr.productId?.sku?.toLowerCase() || "";
      const scannedName = qr.scannedBy?.name?.toLowerCase() || "";
      const scannedPhone = qr.scannedBy?.phone || "";

      return (
        code.includes(q) ||
        prodName.includes(q) ||
        prodSku.includes(q) ||
        scannedName.includes(q) ||
        scannedPhone.includes(q)
      );
    });
  }, [qrcodes, qrSearch]);

  const paginatedQRCodes = useMemo(() => {
    const start = (qrPage - 1) * qrItemsPerPage;
    return filteredQRCodes.slice(start, start + qrItemsPerPage);
  }, [filteredQRCodes, qrPage, qrItemsPerPage]);

  const totalQRPages = Math.ceil(filteredQRCodes.length / qrItemsPerPage) || 1;

  // ==========================================
  // SELECTION HANDLERS FOR PAYOUTS
  // ==========================================
  const handleSelectAllPayouts = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredWithdrawals.map((w) => w._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectPayout = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ==========================================
  // RTGS DOWNLOAD & AUTO-PROCESSING WORKFLOW
  // ==========================================
  const handleDownloadRTGS = async () => {
    let itemsToProcess = [];
    if (selectedIds.length > 0) {
      itemsToProcess = filteredWithdrawals.filter((w) => selectedIds.includes(w._id));
    } else {
      itemsToProcess = filteredWithdrawals.filter((w) => w.status === "pending");
    }

    if (itemsToProcess.length === 0) {
      toast.warning("No pending payout requests selected for RTGS transfer.");
      return;
    }

    const pendingOnly = itemsToProcess.filter((w) => w.status === "pending");
    const totalAmt = itemsToProcess.reduce((sum, w) => sum + (w.amount || 0), 0);

    const result = await Swal.fire({
      title: "Download for Bank RTGS / NEFT?",
      html: `
        <div class="text-left text-sm space-y-2">
          <p>You are downloading <b>${itemsToProcess.length}</b> payout request(s) totaling <b>₹${totalAmt.toLocaleString("en-IN")}</b>.</p>
          <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs">
            ℹ️ <b>Important Workflow Note:</b><br/>
            All <b>${pendingOnly.length}</b> pending request(s) will automatically be marked as <b>"In-Processing"</b> in the Admin Panel and in the User Mobile App.
          </div>
        </div>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Download & Mark Processing",
    });

    if (!result.isConfirmed) return;

    try {
      if (pendingOnly.length > 0) {
        const pendingIds = pendingOnly.map((w) => w._id);
        const res = await api.post(`/api/admin/withdrawals/bulk-processing`, {
          withdrawalIds: pendingIds,
        });
        if (!res.data.success) {
          throw new Error(res.data.message || "Failed to update status to processing");
        }
        toast.success(`${pendingOnly.length} payouts marked as In-Processing!`);
      }

      const rtgsColumns = [
        { label: "Sr No", key: (w, idx) => idx + 1 },
        {
          label: "Beneficiary Account Number",
          key: (w) => w.bankSnapshot?.accountNumber || w.userId?.bankDetails?.accountNumber || "-",
        },
        {
          label: "Beneficiary Name",
          key: (w) => w.bankSnapshot?.accountHolderName || w.userId?.bankDetails?.accountHolderName || w.userId?.name || "-",
        },
        {
          label: "IFSC Code",
          key: (w) => w.bankSnapshot?.ifscCode || w.userId?.bankDetails?.ifscCode || "-",
        },
        {
          label: "Bank Name",
          key: (w) => w.bankSnapshot?.bankName || w.userId?.bankDetails?.bankName || "-",
        },
        { label: "Amount (INR)", key: "amount" },
        { label: "Payment Type", key: (w) => (w.amount >= 200000 ? "RTGS" : "NEFT") },
        { label: "Sender Narration / Remarks", key: () => "Loyalty Cashback Payout" },
        { label: "Beneficiary Mobile", key: (w) => w.userId?.phone || "-" },
        { label: "User Role", key: (w) => w.userId?.role || "-" },
        { label: "Request Reference ID", key: "_id" },
        { label: "Request Date", key: (w) => new Date(w.createdAt).toLocaleDateString("en-IN") },
      ];

      const dateTag = new Date().toISOString().slice(0, 10);
      exportToExcel(itemsToProcess, rtgsColumns, `Bank_RTGS_NEFT_Payout_${dateTag}`);

      setSelectedIds([]);
      fetchPayouts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error processing RTGS download");
    }
  };

  // ==========================================
  // EXPORT ALL FILTERED PAYOUTS EXCEL
  // ==========================================
  const handleExportAllPayoutsExcel = () => {
    if (filteredWithdrawals.length === 0) {
      toast.error("No payout data available to export");
      return;
    }

    const columns = [
      { label: "Request ID", key: "_id" },
      { label: "User Name", key: (w) => w.userId?.name || "N/A" },
      { label: "Phone Number", key: (w) => w.userId?.phone || "N/A" },
      { label: "Role", key: (w) => w.userId?.role || "N/A" },
      { label: "Firm / Shop Name", key: (w) => w.userId?.firmName || "-" },
      { label: "Requested Amount (₹)", key: "amount" },
      { label: "Status", key: "status" },
      {
        label: "Account Holder Name",
        key: (w) => w.bankSnapshot?.accountHolderName || w.userId?.bankDetails?.accountHolderName || "-",
      },
      {
        label: "Bank Account Number",
        key: (w) => w.bankSnapshot?.accountNumber || w.userId?.bankDetails?.accountNumber || "-",
      },
      {
        label: "IFSC Code",
        key: (w) => w.bankSnapshot?.ifscCode || w.userId?.bankDetails?.ifscCode || "-",
      },
      {
        label: "Bank Name",
        key: (w) => w.bankSnapshot?.bankName || w.userId?.bankDetails?.bankName || "-",
      },
      { label: "Transaction / UTR Number", key: (w) => w.transactionNumber || "-" },
      { label: "Admin Remarks", key: (w) => w.adminRemarks || "-" },
      { label: "Requested Date", key: (w) => new Date(w.createdAt).toLocaleString("en-IN") },
      {
        label: "Processed Date",
        key: (w) => (w.processedAt ? new Date(w.processedAt).toLocaleString("en-IN") : "-"),
      },
    ];

    exportToExcel(filteredWithdrawals, columns, `All_Payout_Requests_${payoutStatus}`);
  };

  // ==========================================
  // EXPORT USERS MASTER EXCEL
  // ==========================================
  const handleExportUsersExcel = () => {
    if (filteredUsers.length === 0) {
      toast.error("No users found to export");
      return;
    }

    const columns = [
      { label: "User ID", key: "_id" },
      { label: "User Name", key: "name" },
      { label: "Mobile Number", key: "phone" },
      { label: "Email", key: (u) => u.email || "-" },
      { label: "Role", key: "role" },
      { label: "Firm / Shop Name", key: (u) => u.firmName || "-" },
      { label: "Account Status", key: (u) => (u.isActive ? "Active" : "Inactive") },
      { label: "Aadhaar KYC Status", key: (u) => u.kycStatus?.aadhar || "pending" },
      { label: "Aadhaar Number", key: (u) => u.kycDetails?.aadharNumber || "-" },
      { label: "PAN KYC Status", key: (u) => u.kycStatus?.pan || "pending" },
      { label: "PAN Number", key: (u) => u.kycDetails?.panNumber || "-" },
      { label: "Bank Name", key: (u) => u.bankDetails?.bankName || "-" },
      { label: "Account Holder Name", key: (u) => u.bankDetails?.accountHolderName || "-" },
      { label: "Account Number", key: (u) => u.bankDetails?.accountNumber || "-" },
      { label: "IFSC Code", key: (u) => u.bankDetails?.ifscCode || "-" },
      { label: "Sales Code", key: (u) => u.salesCode || u.salesPerson?.code || "-" },
      { label: "Onboarded By Sales Person", key: (u) => u.salesPerson?.name || "Direct Signup" },
      { label: "Registration Date", key: (u) => new Date(u.createdAt).toLocaleDateString("en-IN") },
    ];

    exportToExcel(filteredUsers, columns, `Users_Master_Report_${userRoleFilter}`);
  };

  // ==========================================
  // EXPORT QR CODES EXCEL
  // ==========================================
  const handleExportQRExcel = () => {
    if (filteredQRCodes.length === 0) {
      toast.error("No QR code records available to export");
      return;
    }

    const columns = [
      { label: "QR Code Token", key: "code" },
      { label: "Product Name", key: (qr) => qr.productId?.name || "N/A" },
      { label: "SKU", key: (qr) => qr.productId?.sku || "-" },
      { label: "Category", key: (qr) => qr.productId?.category || "-" },
      { label: "QR Type", key: "qrType" },
      { label: "Status", key: (qr) => (qr.status === "scanned" ? "Scanned (Used)" : "Generated (Available)") },
      { label: "Cashback Amount Credited (₹)", key: (qr) => qr.cashbackAmountCredited || qr.productId?.cashbackAmount || 0 },
      { label: "Scanned By User", key: (qr) => qr.scannedBy?.name || "-" },
      { label: "Scanned By Phone", key: (qr) => qr.scannedBy?.phone || "-" },
      { label: "Generated Date", key: (qr) => new Date(qr.createdAt).toLocaleDateString("en-IN") },
      { label: "Scanned Date", key: (qr) => (qr.scannedAt ? new Date(qr.scannedAt).toLocaleString("en-IN") : "-") },
    ];

    exportToExcel(filteredQRCodes, columns, `QR_Codes_Report_${qrStatusFilter}`);
  };

  // ==========================================
  // PAYMENT COMPLETION / UTR WORKFLOW
  // ==========================================
  const handleOpenCompletePaymentModal = (withdrawal) => {
    setSelectedWithdrawalForPay(withdrawal);
    setPaymentFormData({
      action: "approve",
      transactionNumber: withdrawal.transactionNumber || "",
      adminRemarks: "",
    });
    setPaymentModalOpen(true);
  };

  const handleCompletePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWithdrawalForPay) return;

    if (!paymentFormData.transactionNumber.trim()) {
      toast.error("Please enter the Bank UTR / Transaction Reference Number");
      return;
    }

    setSubmittingPayment(true);
    try {
      const response = await api.put(`/api/admin/withdrawals/${selectedWithdrawalForPay._id}/process`, {
        action: "approve",
        transactionNumber: paymentFormData.transactionNumber.trim(),
        adminRemarks: paymentFormData.adminRemarks || "Payment completed via Bank Transfer",
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to complete payment");
      }

      toast.success("Payment marked as Completed & UTR recorded!");
      setPaymentModalOpen(false);
      fetchPayouts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error submitting payment completion");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ==========================================
  // REJECT WORKFLOW
  // ==========================================
  const handleOpenRejectModal = (withdrawal) => {
    setSelectedWithdrawalForReject(withdrawal);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWithdrawalForReject) return;

    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setSubmittingReject(true);
    try {
      const response = await api.put(`/api/admin/withdrawals/${selectedWithdrawalForReject._id}/process`, {
        action: "reject",
        adminRemarks: rejectReason.trim(),
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to reject request");
      }

      toast.success("Payout request rejected successfully");
      setRejectModalOpen(false);
      fetchPayouts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error rejecting request");
    } finally {
      setSubmittingReject(false);
    }
  };

  // Helper Badge Renderers
  const getPayoutStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <FaClock className="text-xs" /> Pending
          </span>
        );
      case "processing":
        return (
          <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1 animate-pulse">
            <FaSpinner className="text-xs animate-spin" /> In-Processing (RTGS)
          </span>
        );
      case "approved":
        return (
          <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <FaCheckCircle className="text-xs" /> Paid & Completed
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1">
            <FaTimesCircle className="text-xs" /> Rejected
          </span>
        );
      default:
        return <span className="px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaFileAlt className="text-blue-600" />
            Comprehensive Reports & Analytics Center
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Download RTGS bank payout files, track in-process payments, generate QR usage analytics, and export full user records.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("payouts")}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "payouts"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FaMoneyBillWave /> Payouts & RTGS
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FaUsers /> User Master Report
          </button>
          <button
            onClick={() => setActiveTab("qrcodes")}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "qrcodes"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FaQrcode /> QR Codes Report
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PAYOUT REQUESTS & RTGS BANKING REPORT                              */}
      {/* ========================================================================= */}
      {activeTab === "payouts" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div
              className="p-4 rounded-2xl border shadow-xs"
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-gray-500">Total Requests</p>
              <p className="text-xl font-bold text-gray-900 mt-1">₹{payoutSummary.totalAmount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-500 mt-0.5">{payoutSummary.totalCount} requests total</p>
            </div>

            <div
              onClick={() => setPayoutStatus("pending")}
              className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
                payoutStatus === "pending" ? "ring-2 ring-amber-500 bg-amber-50/40" : ""
              }`}
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-amber-600">Pending Transfer</p>
              <p className="text-xl font-bold text-amber-600 mt-1">₹{payoutSummary.pendingAmount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-amber-700 mt-0.5">{payoutSummary.pendingCount} pending requests</p>
            </div>

            <div
              onClick={() => setPayoutStatus("processing")}
              className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
                payoutStatus === "processing" ? "ring-2 ring-blue-500 bg-blue-50/40" : ""
              }`}
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-blue-600">In-Process (RTGS)</p>
              <p className="text-xl font-bold text-blue-600 mt-1">₹{payoutSummary.processingAmount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-blue-700 mt-0.5">{payoutSummary.processingCount} in bank process</p>
            </div>

            <div
              onClick={() => setPayoutStatus("approved")}
              className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
                payoutStatus === "approved" ? "ring-2 ring-emerald-500 bg-emerald-50/40" : ""
              }`}
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-emerald-600">Paid & Completed</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">₹{payoutSummary.approvedAmount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-emerald-700 mt-0.5">{payoutSummary.approvedCount} successfully paid</p>
            </div>

            <div
              onClick={() => setPayoutStatus("rejected")}
              className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
                payoutStatus === "rejected" ? "ring-2 ring-red-500 bg-red-50/40" : ""
              }`}
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-red-600">Rejected</p>
              <p className="text-xl font-bold text-red-600 mt-1">₹{payoutSummary.rejectedAmount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-red-700 mt-0.5">{payoutSummary.rejectedCount} rejected requests</p>
            </div>
          </div>

          {/* Action Toolbar & Filters */}
          <div
            className="p-5 rounded-2xl border shadow-xs space-y-4"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4" style={{ borderColor: themeColors.border }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-500">Status:</span>
                {[
                  { id: "pending", label: "Pending" },
                  { id: "processing", label: "In-Processing" },
                  { id: "approved", label: "Paid / Completed" },
                  { id: "rejected", label: "Rejected" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setPayoutStatus(tab.id);
                      setPayoutPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      payoutStatus === tab.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                <button
                  onClick={handleDownloadRTGS}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
                  title="Download selected rows (or all pending) formatted for RTGS bank transfer and mark them as processing"
                >
                  <FaUniversity /> Download for RTGS / Bank ({selectedIds.length > 0 ? selectedIds.length : "All Pending"})
                </button>

                <button
                  onClick={handleExportAllPayoutsExcel}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition-all cursor-pointer"
                  title="Export current filtered payouts list to Excel"
                >
                  <FaDownload /> Export Excel Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 flex items-center gap-2">
                <FaCalendarAlt className="text-gray-400 text-sm" />
                <select
                  value={payoutDatePreset}
                  onChange={(e) => handlePayoutPresetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">Date Preset: All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                </select>
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <input
                  type="date"
                  value={payoutStartDate}
                  onChange={(e) => {
                    setPayoutStartDate(e.target.value);
                    setPayoutDatePreset("custom");
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                  title="Start Date"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={payoutEndDate}
                  onChange={(e) => {
                    setPayoutEndDate(e.target.value);
                    setPayoutDatePreset("custom");
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                  title="End Date"
                />
              </div>

              <div className="md:col-span-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FaSearch className="text-xs" />
                </div>
                <input
                  type="text"
                  placeholder="Search user, mobile, bank account, IFSC, UTR..."
                  value={payoutSearch}
                  onChange={(e) => setPayoutSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                />
              </div>
            </div>
          </div>

          {/* Payouts Table */}
          <div
            className="rounded-2xl border shadow-xs overflow-hidden"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                    <th className="p-3.5 border-b text-center w-10" style={{ borderColor: themeColors.border }}>
                      <input
                        type="checkbox"
                        onChange={handleSelectAllPayouts}
                        checked={
                          filteredWithdrawals.length > 0 &&
                          selectedIds.length === filteredWithdrawals.length
                        }
                        className="rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      User Details
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Bank Account Details (Snapshot)
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider text-right" style={{ borderColor: themeColors.border }}>
                      Amount (₹)
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider text-center" style={{ borderColor: themeColors.border }}>
                      Status
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Transaction / UTR No.
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Dates
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider text-center" style={{ borderColor: themeColors.border }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutLoading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                      </td>
                    </tr>
                  ) : paginatedWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-gray-500">
                        No payout requests found matching your current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedWithdrawals.map((w) => {
                      const isSelected = selectedIds.includes(w._id);
                      const bank = w.bankSnapshot || w.userId?.bankDetails || {};
                      return (
                        <tr
                          key={w._id}
                          className={`hover:bg-gray-50/80 border-b last:border-0 transition-colors ${
                            isSelected ? "bg-blue-50/40" : ""
                          }`}
                          style={{ borderColor: themeColors.border }}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectPayout(w._id)}
                              className="rounded cursor-pointer"
                            />
                          </td>

                          <td className="p-3.5">
                            <p className="font-bold text-gray-900">{w.userId?.name || "Unknown User"}</p>
                            <p className="text-gray-500 font-mono text-[11px]">{w.userId?.phone || "N/A"}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {w.userId?.role === "electrician" ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  ⚡ Electrician
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                  🏪 Retailer
                                </span>
                              )}
                              {w.userId?.firmName && (
                                <span className="text-[10px] text-gray-500 truncate max-w-[120px]" title={w.userId.firmName}>
                                  {w.userId.firmName}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-gray-800 flex items-center gap-1">
                                <FaUniversity className="text-gray-400 text-[10px]" />
                                {bank.bankName || "Bank N/A"}
                              </p>
                              <p className="font-mono text-gray-700 font-medium">
                                A/C: <span className="font-bold">{bank.accountNumber || "N/A"}</span>
                              </p>
                              <p className="text-gray-500 text-[11px]">
                                IFSC: <span className="font-mono font-semibold">{bank.ifscCode || "N/A"}</span> | Name: {bank.accountHolderName || "-"}
                              </p>
                            </div>
                          </td>

                          <td className="p-3.5 text-right font-bold text-sm text-emerald-600 font-mono">
                            ₹{w.amount?.toLocaleString("en-IN")}
                          </td>

                          <td className="p-3.5 text-center">
                            {getPayoutStatusBadge(w.status)}
                          </td>

                          <td className="p-3.5">
                            {w.transactionNumber ? (
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {w.transactionNumber}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px] italic">-</span>
                            )}
                            {w.adminRemarks && (
                              <p className="text-[10px] text-gray-500 mt-0.5 italic truncate max-w-[150px]" title={w.adminRemarks}>
                                {w.adminRemarks}
                              </p>
                            )}
                          </td>

                          <td className="p-3.5 text-gray-500 text-[11px]">
                            <p>Req: {new Date(w.createdAt).toLocaleDateString("en-IN")}</p>
                            {w.processedAt && (
                              <p className="text-gray-400 text-[10px]">
                                Done: {new Date(w.processedAt).toLocaleDateString("en-IN")}
                              </p>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {(w.status === "pending" || w.status === "processing") && (
                                <button
                                  onClick={() => handleOpenCompletePaymentModal(w)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer flex items-center gap-1"
                                  title="Enter Bank UTR / Transaction number to finalize payment"
                                >
                                  <FaReceipt /> Pay & Complete
                                </button>
                              )}

                              {(w.status === "pending" || w.status === "processing") && (
                                <button
                                  onClick={() => handleOpenRejectModal(w)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs transition-all cursor-pointer"
                                  title="Reject Payout Request"
                                >
                                  <FaTimesCircle />
                                </button>
                              )}

                              {w.status === "approved" && (
                                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                  <FaCheckCircle /> Paid
                                </span>
                              )}

                              {w.status === "rejected" && (
                                <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                                  <FaTimesCircle /> Rejected
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50" style={{ borderColor: themeColors.border }}>
              <div className="text-xs text-gray-500">
                Showing <span className="font-semibold">{paginatedWithdrawals.length}</span> of <span className="font-semibold">{filteredWithdrawals.length}</span> filtered payout requests ({selectedIds.length} selected)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={payoutPage === 1}
                  onClick={() => setPayoutPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  Previous
                </button>
                <span className="text-xs text-gray-600 font-semibold">
                  Page {payoutPage} of {totalPayoutPages}
                </span>
                <button
                  disabled={payoutPage >= totalPayoutPages}
                  onClick={() => setPayoutPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USERS MASTER REPORT                                                */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div
            className="p-5 rounded-2xl border shadow-xs space-y-4"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4" style={{ borderColor: themeColors.border }}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <FaUsers className="text-blue-600" /> User Master Directory & Analytics
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Export complete list of registered electricians and retailers with KYC, bank details, and onboarding metadata.
                </p>
              </div>

              <button
                onClick={handleExportUsersExcel}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition-all cursor-pointer"
              >
                <FaDownload /> Export Users Excel Report ({filteredUsers.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">User Role</label>
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All Roles</option>
                  <option value="electrician">Electricians</option>
                  <option value="retailer">Retailers</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Account Status</label>
                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">KYC Status</label>
                <select
                  value={userKycFilter}
                  onChange={(e) => {
                    setUserKycFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All KYC Status</option>
                  <option value="approved">Approved</option>
                  <option value="submitted">Submitted / In Review</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Reg Date Preset</label>
                <select
                  value={userDatePreset}
                  onChange={(e) => handleUserPresetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Search User</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaSearch className="text-xs" />
                  </div>
                  <input
                    type="text"
                    placeholder="Name, phone, firm, code..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none bg-white"
                    style={{ borderColor: themeColors.border }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div
            className="rounded-2xl border shadow-xs overflow-hidden"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      User Details
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Contact & Firm
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Role & Status
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Bank Account Info
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      KYC Status
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Onboarded By
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Registered Date
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider text-center" style={{ borderColor: themeColors.border }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                      </td>
                    </tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-gray-500">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr
                        key={u._id}
                        className="hover:bg-gray-50 border-b last:border-0 transition-colors"
                        style={{ borderColor: themeColors.border }}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{u.name}</p>
                              {u.email && <p className="text-[10px] text-gray-400">{u.email}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <p className="font-mono font-medium text-gray-800">{u.phone}</p>
                          {u.firmName && (
                            <p className="text-[11px] text-gray-500 font-semibold">{u.firmName}</p>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            {u.role === "electrician" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 w-fit">
                                ⚡ Electrician
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 w-fit">
                                🏪 Retailer
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 text-[10px] rounded font-semibold w-fit ${
                                u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                              }`}
                            >
                              {u.isActive ? "● Active" : "● Inactive"}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5 text-[11px]">
                          {u.bankDetails?.accountNumber ? (
                            <div>
                              <p className="font-semibold text-gray-800">{u.bankDetails.bankName || "Bank"}</p>
                              <p className="font-mono text-gray-600">A/C: {u.bankDetails.accountNumber}</p>
                              <p className="text-gray-400 text-[10px]">IFSC: {u.bankDetails.ifscCode}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not Added</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="space-y-1 text-[10px]">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Aadhaar:</span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  u.kycStatus?.aadhar === "approved"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : u.kycStatus?.aadhar === "submitted"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {u.kycStatus?.aadhar || "pending"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">PAN:</span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  u.kycStatus?.pan === "approved"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : u.kycStatus?.pan === "submitted"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {u.kycStatus?.pan || "pending"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-[11px]">
                          {u.salesPerson ? (
                            <div>
                              <p className="font-bold text-blue-600">{u.salesPerson.name}</p>
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono text-[10px]">
                                {u.salesPerson.code}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Direct Signup</span>
                          )}
                        </td>

                        <td className="p-3.5 text-gray-500 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString("en-IN")}
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => navigate(`/users/${u._id}`)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs cursor-pointer transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50" style={{ borderColor: themeColors.border }}>
              <div className="text-xs text-gray-500">
                Showing <span className="font-semibold">{paginatedUsers.length}</span> of <span className="font-semibold">{filteredUsers.length}</span> filtered users
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={userPage === 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  Previous
                </button>
                <span className="text-xs text-gray-600 font-semibold">
                  Page {userPage} of {totalUserPages}
                </span>
                <button
                  disabled={userPage >= totalUserPages}
                  onClick={() => setUserPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QR CODES & SCANS REPORT                                            */}
      {/* ========================================================================= */}
      {activeTab === "qrcodes" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-2xl border shadow-xs"
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-gray-500">Total QR Codes</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{qrSummary.totalCount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Generated in System</p>
            </div>

            <div
              onClick={() => setQrStatusFilter("scanned")}
              className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
                qrStatusFilter === "scanned" ? "ring-2 ring-emerald-500 bg-emerald-50/40" : ""
              }`}
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-emerald-600">Scanned & Used</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{qrSummary.scannedCount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-emerald-700 mt-0.5">Claimed by Users</p>
            </div>

            <div
              onClick={() => setQrStatusFilter("generated")}
              className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
                qrStatusFilter === "generated" ? "ring-2 ring-blue-500 bg-blue-50/40" : ""
              }`}
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-blue-600">Available / Unscanned</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{qrSummary.generatedCount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-blue-700 mt-0.5">Ready to be scanned</p>
            </div>

            <div
              className="p-4 rounded-2xl border shadow-xs"
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <p className="text-xs font-semibold uppercase text-purple-600">Total Cashback Disbursed</p>
              <p className="text-xl font-bold text-purple-600 mt-1">₹{qrSummary.totalCashbackDisbursed.toLocaleString("en-IN")}</p>
              <p className="text-xs text-purple-700 mt-0.5">Paid via QR Scans</p>
            </div>
          </div>

          {/* Action Toolbar & Filters */}
          <div
            className="p-5 rounded-2xl border shadow-xs space-y-4"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4" style={{ borderColor: themeColors.border }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-500">Status:</span>
                {[
                  { id: "all", label: "All QRs" },
                  { id: "scanned", label: "Scanned / Used" },
                  { id: "generated", label: "Available / Unscanned" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setQrStatusFilter(tab.id);
                      setQrPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      qrStatusFilter === tab.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Export QR Report Button */}
              <button
                onClick={handleExportQRExcel}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition-all cursor-pointer"
              >
                <FaDownload /> Export QR Codes Excel Report ({filteredQRCodes.length})
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Product Filter */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Product</label>
                <select
                  value={qrProductFilter}
                  onChange={(e) => {
                    setQrProductFilter(e.target.value);
                    setQrPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All Products</option>
                  {productsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* QR Type Filter */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Target Role</label>
                <select
                  value={qrTypeFilter}
                  onChange={(e) => {
                    setQrTypeFilter(e.target.value);
                    setQrPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All Target Roles</option>
                  <option value="electrician">Electrician</option>
                  <option value="retailer">Retailer</option>
                </select>
              </div>

              {/* Date Presets */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Date Preset</label>
                <select
                  value={qrDatePreset}
                  onChange={(e) => handleQRPresetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                </select>
              </div>

              {/* Custom Date Range */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Custom Date Range</label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={qrStartDate}
                    onChange={(e) => {
                      setQrStartDate(e.target.value);
                      setQrDatePreset("custom");
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white"
                    style={{ borderColor: themeColors.border }}
                    title="Start Date"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="date"
                    value={qrEndDate}
                    onChange={(e) => {
                      setQrEndDate(e.target.value);
                      setQrDatePreset("custom");
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white"
                    style={{ borderColor: themeColors.border }}
                    title="End Date"
                  />
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Search QR / Scanner</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaSearch className="text-xs" />
                  </div>
                  <input
                    type="text"
                    placeholder="QR token, Product, Scanner..."
                    value={qrSearch}
                    onChange={(e) => setQrSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none bg-white"
                    style={{ borderColor: themeColors.border }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* QR Codes Table */}
          <div
            className="rounded-2xl border shadow-xs overflow-hidden"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      QR Unique Token
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Product Info
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider text-center" style={{ borderColor: themeColors.border }}>
                      Target Role
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider text-right" style={{ borderColor: themeColors.border }}>
                      Cashback Value
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider text-center" style={{ borderColor: themeColors.border }}>
                      Status
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Scanned By User
                    </th>
                    <th className="p-3.5 border-b font-semibold uppercase tracking-wider" style={{ borderColor: themeColors.border }}>
                      Dates
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {qrLoading ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                      </td>
                    </tr>
                  ) : paginatedQRCodes.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center text-gray-500">
                        No QR codes found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedQRCodes.map((qr) => (
                      <tr
                        key={qr._id}
                        className="hover:bg-gray-50 border-b last:border-0 transition-colors"
                        style={{ borderColor: themeColors.border }}
                      >
                        {/* Token */}
                        <td className="p-3.5">
                          <span className="font-mono font-bold px-2 py-1 rounded bg-gray-100 text-gray-800 border border-gray-200 text-xs">
                            {qr.code}
                          </span>
                        </td>

                        {/* Product */}
                        <td className="p-3.5">
                          <p className="font-bold text-gray-900">{qr.productId?.name || "Product Deleted"}</p>
                          <p className="text-[11px] text-gray-500 font-mono">SKU: {qr.productId?.sku || "-"}</p>
                        </td>

                        {/* QR Type */}
                        <td className="p-3.5 text-center">
                          {qr.qrType === "electrician" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              ⚡ Electrician
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              🏪 Retailer
                            </span>
                          )}
                        </td>

                        {/* Cashback Value */}
                        <td className="p-3.5 text-right font-bold text-emerald-600 font-mono text-sm">
                          ₹{qr.cashbackAmountCredited || qr.productId?.cashbackAmount || 0}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 text-center">
                          {qr.status === "scanned" ? (
                            <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <FaCheckCircle className="text-xs" /> Scanned (Used)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                              <FaClock className="text-xs" /> Available (Unused)
                            </span>
                          )}
                        </td>

                        {/* Scanned By */}
                        <td className="p-3.5 text-[11px]">
                          {qr.scannedBy ? (
                            <div>
                              <p className="font-bold text-gray-900">{qr.scannedBy.name}</p>
                              <p className="text-gray-500 font-mono text-[10px]">{qr.scannedBy.phone}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="p-3.5 text-gray-500 text-[11px]">
                          <p>Gen: {new Date(qr.createdAt).toLocaleDateString("en-IN")}</p>
                          {qr.scannedAt && (
                            <p className="text-emerald-700 font-medium text-[10px]">
                              Scan: {new Date(qr.scannedAt).toLocaleDateString("en-IN")}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* QR Table Footer */}
            <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50" style={{ borderColor: themeColors.border }}>
              <div className="text-xs text-gray-500">
                Showing <span className="font-semibold">{paginatedQRCodes.length}</span> of <span className="font-semibold">{filteredQRCodes.length}</span> filtered QR codes
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={qrPage === 1}
                  onClick={() => setQrPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  Previous
                </button>
                <span className="text-xs text-gray-600 font-semibold">
                  Page {qrPage} of {totalQRPages}
                </span>
                <button
                  disabled={qrPage >= totalQRPages}
                  onClick={() => setQrPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPLETE PAYMENT & RECORD UTR                                       */}
      {/* ========================================================================= */}
      {paymentModalOpen && selectedWithdrawalForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl border p-6 overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex justify-between items-center border-b pb-3 mb-4" style={{ borderColor: themeColors.border }}>
              <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                <FaReceipt /> Complete Payment (Enter UTR)
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border mb-4 text-xs space-y-1.5" style={{ borderColor: themeColors.border }}>
              <div className="flex justify-between">
                <span className="text-gray-500">Beneficiary:</span>
                <span className="font-bold text-gray-900">{selectedWithdrawalForPay.userId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-emerald-600 text-sm">₹{selectedWithdrawalForPay.amount?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bank & Account:</span>
                <span className="font-medium text-gray-800">
                  {selectedWithdrawalForPay.bankSnapshot?.bankName} - {selectedWithdrawalForPay.bankSnapshot?.accountNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IFSC Code:</span>
                <span className="font-mono font-bold text-gray-800">{selectedWithdrawalForPay.bankSnapshot?.ifscCode}</span>
              </div>
            </div>

            <form onSubmit={handleCompletePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Bank UTR / Transaction Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR1234567890 / TXN89238472"
                  value={paymentFormData.transactionNumber}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, transactionNumber: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  style={{ borderColor: themeColors.border }}
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  This UTR / Reference number will be sent to the user via notification and saved in their transaction statement.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Admin Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Successfully transferred via ICICI Corporate Banking"
                  value={paymentFormData.adminRemarks}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, adminRemarks: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingPayment ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  Confirm Payment Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT PAYOUT REQUEST                                              */}
      {/* ========================================================================= */}
      {rejectModalOpen && selectedWithdrawalForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl border p-6 overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex justify-between items-center border-b pb-3 mb-4" style={{ borderColor: themeColors.border }}>
              <h3 className="text-lg font-bold flex items-center gap-2 text-red-600">
                <FaTimesCircle /> Reject Payout Request
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <p className="text-xs text-gray-600">
                Are you sure you want to reject the withdrawal request of <b>₹{selectedWithdrawalForReject.amount}</b> for <b>{selectedWithdrawalForReject.userId?.name}</b>?
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. Bank Account Number invalid / IFSC mismatch / KYC verification required"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingReject ? <FaSpinner className="animate-spin" /> : <FaTimesCircle />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
