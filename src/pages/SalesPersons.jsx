import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FaUserTie,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaUsers,
  FaBolt,
  FaStore,
  FaIdCard,
  FaWallet,
  FaQrcode,
  FaTimes,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaExchangeAlt,
  FaDownload,
} from "react-icons/fa";
import api from "../utils/api";
import Swal from "sweetalert2";
import { exportToExcel } from "../utils/excelExport";

const SalesPersons = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [salesPersons, setSalesPersons] = useState([]);
  const [summary, setSummary] = useState({
    totalSalesPersons: 0,
    activeSalesPersons: 0,
    totalElectriciansOnboarded: 0,
    totalRetailersOnboarded: 0,
    totalCashbackGenerated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Add / Edit Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    code: "",
    phone: "",
    email: "",
    city: "",
    area: "",
    notes: "",
  });
  const [processing, setProcessing] = useState(false);

  // Drill-down Modal States
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);
  const [drillDownUsers, setDrillDownUsers] = useState([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [drillDownSearch, setDrillDownSearch] = useState("");
  const [drillDownRole, setDrillDownRole] = useState("all");
  const [drillDownKyc, setDrillDownKyc] = useState("all");
  const [drillDownPage, setDrillDownPage] = useState(1);
  const [drillDownTotal, setDrillDownTotal] = useState(0);

  useEffect(() => {
    fetchSalesPersons();
  }, [filterStatus]);

  const fetchSalesPersons = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/sales-persons`;
      if (filterStatus !== "all") {
        url += `?isActive=${filterStatus === "active"}`;
      }
      const response = await api.get(url);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch sales persons");
      }
      setSalesPersons(data.salesPersons || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      toast.error(err.message || "Something went wrong fetching sales persons");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormData({
      id: "",
      name: "",
      code: "",
      phone: "",
      email: "",
      city: "",
      area: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (sp) => {
    setIsEditing(true);
    setFormData({
      id: sp._id,
      name: sp.name || "",
      code: sp.code || "",
      phone: sp.phone || "",
      email: sp.email || "",
      city: sp.city || "",
      area: sp.area || "",
      notes: sp.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and Sales Code are required");
      return;
    }

    setProcessing(true);
    try {
      let response;
      if (isEditing) {
        response = await api.put(`/api/admin/sales-persons/${formData.id}`, formData);
      } else {
        response = await api.post(`/api/admin/sales-persons`, formData);
      }

      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Operation failed");
      }

      toast.success(isEditing ? "Sales Person updated successfully" : "Sales Person created successfully");
      setModalOpen(false);
      fetchSalesPersons();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (sp) => {
    const newStatus = !sp.isActive;
    const result = await Swal.fire({
      title: "Confirm Status Change",
      text: `Do you want to mark ${sp.name} (${sp.code}) as ${newStatus ? "Active" : "Inactive"}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: themeColors.primary,
      cancelButtonColor: "#d33",
      confirmButtonText: `Yes, make ${newStatus ? "Active" : "Inactive"}`,
    });

    if (!result.isConfirmed) return;

    setProcessing(true);
    try {
      const response = await api.put(`/api/admin/sales-persons/${sp._id}/status`, {
        isActive: newStatus,
      });
      const data = response.data;
      if (!data.success) throw new Error(data.message || "Failed to update status");
      toast.success(data.message || "Status updated successfully");
      fetchSalesPersons();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (sp) => {
    const result = await Swal.fire({
      title: "Delete Sales Person?",
      text: `Are you sure you want to delete ${sp.name} (${sp.code})? Any registered users will be unlinked.`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Delete",
    });

    if (!result.isConfirmed) return;

    setProcessing(true);
    try {
      const response = await api.delete(`/api/admin/sales-persons/${sp._id}`);
      const data = response.data;
      if (!data.success) throw new Error(data.message || "Failed to delete");
      toast.success(data.message || "Sales person deleted successfully");
      fetchSalesPersons();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Drill Down Logic
  const handleOpenDrillDown = (sp) => {
    setSelectedSalesPerson(sp);
    setDrillDownSearch("");
    setDrillDownRole("all");
    setDrillDownKyc("all");
    setDrillDownPage(1);
    setDrillDownOpen(true);
    fetchDrillDownUsers(sp._id, 1, "", "all", "all");
  };

  const fetchDrillDownUsers = async (salesPersonId, page = 1, search = "", role = "all", kyc = "all") => {
    setDrillDownLoading(true);
    try {
      let url = `/api/admin/sales-persons/${salesPersonId}/users?page=${page}&limit=20`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (role !== "all") url += `&role=${role}`;
      if (kyc !== "all") url += `&kycStatus=${kyc}`;

      const response = await api.get(url);
      const data = response.data;
      if (!data.success) throw new Error(data.message || "Failed to fetch onboarded users");
      setDrillDownUsers(data.users || []);
      setDrillDownTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setDrillDownLoading(false);
    }
  };

  const filteredSalesPersons = salesPersons.filter((sp) => {
    const q = searchQuery.toLowerCase();
    return (
      sp.name?.toLowerCase().includes(q) ||
      sp.code?.toLowerCase().includes(q) ||
      sp.phone?.includes(q) ||
      sp.city?.toLowerCase().includes(q) ||
      sp.area?.toLowerCase().includes(q)
    );
  });

  const getKycBadge = (kycStatus) => {
    const aadhar = kycStatus?.aadhar || "pending";
    const pan = kycStatus?.pan || "pending";
    const isApproved = aadhar === "approved" || pan === "approved";
    const isSubmitted = aadhar === "submitted" || pan === "submitted";

    if (isApproved) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
          <FaCheckCircle className="text-xs" /> KYC Approved
        </span>
      );
    }
    if (isSubmitted) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
          <FaExchangeAlt className="text-xs" /> Under Review
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
        <FaTimesCircle className="text-xs" /> Pending
      </span>
    );
  };

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaUserTie className="text-blue-500" />
            Sales Persons & Referral Tracking
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Manage your on-ground sales team, generate unique referral codes, and view complete drill-down onboarding reports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportSalesPersonsExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition-all duration-200 text-sm"
          >
            <FaDownload /> Export Excel
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200"
            style={{ backgroundColor: themeColors.primary }}
          >
            <FaPlus /> Add Sales Person
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="p-5 rounded-2xl border shadow-sm flex items-center justify-between"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: themeColors.textSecondary }}>
              Total Sales Team
            </p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{summary.totalSalesPersons}</p>
            <p className="text-xs text-gray-500 mt-1">{summary.activeSalesPersons} active members</p>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 text-2xl">
            <FaUserTie />
          </div>
        </div>

        <div
          className="p-5 rounded-2xl border shadow-sm flex items-center justify-between"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: themeColors.textSecondary }}>
              Onboarded Users
            </p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{summary.totalOnboardedUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Total created via codes</p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 text-2xl">
            <FaUsers />
          </div>
        </div>

        <div
          className="p-5 rounded-2xl border shadow-sm flex items-center justify-between"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: themeColors.textSecondary }}>
              Electricians Onboarded
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{summary.totalElectricians}</p>
            <p className="text-xs text-gray-500 mt-1">Directly referred</p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600 text-2xl">
            <FaBolt />
          </div>
        </div>

        <div
          className="p-5 rounded-2xl border shadow-sm flex items-center justify-between"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: themeColors.textSecondary }}>
              Retailers Onboarded
            </p>
            <p className="text-2xl font-bold mt-1 text-purple-600">{summary.totalRetailers}</p>
            <p className="text-xs text-gray-500 mt-1">Directly referred</p>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600 text-2xl">
            <FaStore />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        className="rounded-2xl shadow-sm border overflow-hidden"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        {/* Toolbar */}
        <div
          className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: themeColors.border }}
        >
          {/* Status Tabs */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
            {[
              { id: "all", label: "All Team" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  filterStatus === tab.id ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Search by name, code, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
            />
          </div>
        </div>

        {/* Sales Persons Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider border-b" style={{ borderColor: themeColors.border }}>
                  Sales Code
                </th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider border-b" style={{ borderColor: themeColors.border }}>
                  Sales Person Info
                </th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider border-b" style={{ borderColor: themeColors.border }}>
                  Location / Contact
                </th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider border-b text-center" style={{ borderColor: themeColors.border }}>
                  Total Accounts Created
                </th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider border-b text-center" style={{ borderColor: themeColors.border }}>
                  Status
                </th>
                <th className="p-4 font-semibold text-xs uppercase tracking-wider border-b text-center" style={{ borderColor: themeColors.border }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                  </td>
                </tr>
              ) : filteredSalesPersons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-gray-500">
                    No sales persons found. Click "+ Add Sales Person" to add your first on-ground agent.
                  </td>
                </tr>
              ) : (
                filteredSalesPersons.map((sp) => (
                  <tr
                    key={sp._id}
                    className="hover:bg-gray-50/60 transition-colors border-b last:border-0"
                    style={{ borderColor: themeColors.border }}
                  >
                    {/* Code */}
                    <td className="p-4 font-mono font-bold">
                      <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-sm tracking-wide">
                        {sp.code}
                      </span>
                    </td>

                    {/* Sales Person Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                          {sp.name ? sp.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{sp.name}</p>
                          <p className="text-xs text-gray-400">Added: {new Date(sp.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact / Location */}
                    <td className="p-4 text-xs space-y-1">
                      {sp.phone && (
                        <p className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <FaPhoneAlt className="text-gray-400 text-[10px]" /> {sp.phone}
                        </p>
                      )}
                      {sp.email && (
                        <p className="flex items-center gap-1.5 text-gray-500">
                          <FaEnvelope className="text-gray-400 text-[10px]" /> {sp.email}
                        </p>
                      )}
                      {(sp.city || sp.area) && (
                        <p className="flex items-center gap-1.5 text-gray-500">
                          <FaMapMarkerAlt className="text-gray-400 text-[10px]" /> {[sp.area, sp.city].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </td>

                    {/* Accounts Created & Breakdown */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenDrillDown(sp)}
                        className="inline-flex flex-col items-center p-2 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer group"
                        title="Click to view all onboarded users"
                      >
                        <span className="text-lg font-black text-blue-600 group-hover:scale-110 transition-transform">
                          {sp.totalUsers || 0}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold">
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            ⚡ {sp.electriciansCount || 0} Elec
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            🏪 {sp.retailersCount || 0} Ret
                          </span>
                        </div>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(sp)}
                        className={`px-3 py-1 text-xs rounded-full font-bold cursor-pointer transition-all ${
                          sp.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {sp.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Drill Down Button */}
                        <button
                          onClick={() => handleOpenDrillDown(sp)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          title="View Created Accounts"
                        >
                          <FaEye /> Drill Down
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(sp)}
                          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer"
                          title="Edit Sales Person"
                        >
                          <FaEdit />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(sp)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                          title="Delete Sales Person"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Sales Person Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl border p-6 overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <div className="flex justify-between items-center border-b pb-4 mb-5" style={{ borderColor: themeColors.border }}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaUserTie className="text-blue-500" />
                {isEditing ? "Edit Sales Person" : "Add New Sales Person"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer p-1"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textSecondary }}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textSecondary }}>
                    Sales Referral Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SP1001 or RAJESH"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm uppercase font-mono font-bold focus:outline-none focus:ring-2"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textSecondary }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textSecondary }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textSecondary }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textSecondary }}>
                    Area / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Andheri East"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.textSecondary }}>
                  Internal Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Optional internal remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border text-sm font-semibold hover:bg-gray-100 transition-all cursor-pointer"
                  style={{ borderColor: themeColors.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {processing ? "Saving..." : isEditing ? "Update Sales Person" : "Create Sales Person"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drill Down Modal: View Onboarded Users */}
      {drillDownOpen && selectedSalesPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            {/* Header */}
            <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold">{selectedSalesPerson.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white font-mono text-xs font-bold border border-white/30">
                    CODE: {selectedSalesPerson.code}
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-1">
                  Onboarded Users Drill-down ({drillDownTotal} Total Accounts Created)
                </p>
              </div>
              <button
                onClick={() => setDrillDownOpen(false)}
                className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 text-xl cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-3 bg-gray-50/50" style={{ borderColor: themeColors.border }}>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Role Filter */}
                <select
                  value={drillDownRole}
                  onChange={(e) => {
                    setDrillDownRole(e.target.value);
                    setDrillDownPage(1);
                    fetchDrillDownUsers(selectedSalesPerson._id, 1, drillDownSearch, e.target.value, drillDownKyc);
                  }}
                  className="px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All Roles</option>
                  <option value="electrician">Electricians</option>
                  <option value="retailer">Retailers</option>
                </select>

                {/* KYC Filter */}
                <select
                  value={drillDownKyc}
                  onChange={(e) => {
                    setDrillDownKyc(e.target.value);
                    setDrillDownPage(1);
                    fetchDrillDownUsers(selectedSalesPerson._id, 1, drillDownSearch, drillDownRole, e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                >
                  <option value="all">All KYC Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="submitted">Submitted / Review</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FaSearch />
                </div>
                <input
                  type="text"
                  placeholder="Search user name, phone..."
                  value={drillDownSearch}
                  onChange={(e) => {
                    setDrillDownSearch(e.target.value);
                    fetchDrillDownUsers(selectedSalesPerson._id, 1, e.target.value, drillDownRole, drillDownKyc);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none bg-white"
                  style={{ borderColor: themeColors.border }}
                />
              </div>
            </div>

            {/* Users List Table */}
            <div className="overflow-y-auto flex-1 p-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                  <tr>
                    <th className="p-3.5 font-semibold text-xs border-b" style={{ borderColor: themeColors.border }}>User Details</th>
                    <th className="p-3.5 font-semibold text-xs border-b" style={{ borderColor: themeColors.border }}>Mobile Number</th>
                    <th className="p-3.5 font-semibold text-xs border-b" style={{ borderColor: themeColors.border }}>Role</th>
                    <th className="p-3.5 font-semibold text-xs border-b" style={{ borderColor: themeColors.border }}>KYC Status</th>
                    <th className="p-3.5 font-semibold text-xs border-b text-right" style={{ borderColor: themeColors.border }}>Wallet Balance</th>
                    <th className="p-3.5 font-semibold text-xs border-b text-center" style={{ borderColor: themeColors.border }}>Scans</th>
                    <th className="p-3.5 font-semibold text-xs border-b" style={{ borderColor: themeColors.border }}>Created At</th>
                    <th className="p-3.5 font-semibold text-xs border-b text-center" style={{ borderColor: themeColors.border }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {drillDownLoading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
                      </td>
                    </tr>
                  ) : drillDownUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-gray-500">
                        No users registered under this sales person yet.
                      </td>
                    </tr>
                  ) : (
                    drillDownUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 border-b last:border-0" style={{ borderColor: themeColors.border }}>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-gray-900">{user.name}</p>
                              {user.firmName && <p className="text-[11px] text-gray-500">{user.firmName}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-xs">{user.phone}</td>
                        <td className="p-3.5">
                          {user.role === "electrician" ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                              ⚡ Electrician
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
                              🏪 Retailer
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">{getKycBadge(user.kycStatus)}</td>
                        <td className="p-3.5 text-right font-bold text-xs text-emerald-600">
                          ₹{user.walletBalance || 0}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-xs text-blue-600">
                          {user.totalScans || 0}
                        </td>
                        <td className="p-3.5 text-xs text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setDrillDownOpen(false);
                              navigate(`/users/${user._id}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-between items-center bg-gray-50" style={{ borderColor: themeColors.border }}>
              <span className="text-xs text-gray-500">
                Showing {drillDownUsers.length} of {drillDownTotal} registered accounts
              </span>
              <button
                onClick={() => setDrillDownOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPersons;
