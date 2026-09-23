import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { 
  FaBolt, FaStore, FaClock, FaRupeeSign, FaSpinner, 
  FaArrowRight, FaIdCard, FaMoneyBillWave, FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";
import { toast } from "sonner";
import api from "../utils/api";

const Dashboard = () => {
  const { themeColors, theme } = useTheme();
  const { currentFont } = useFont();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalElectricians: 0,
    totalRetailers: 0,
    totalActiveElectricians: 0,
    totalActiveRetailers: 0,
    pendingWithdrawals: 0,
    pendingKYC: 0,
    totalCashbackPaid: 0,
  });

  // Pending lists states
  const [activePendingTab, setActivePendingTab] = useState("payouts"); // "payouts" | "kyc"
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loadingPendingLists, setLoadingPendingLists] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    fetchPendingLists();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/dashboard`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setStats(data.stats);
      } else {
        toast.error(data.message || "Failed to fetch dashboard data");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingLists = async () => {
    setLoadingPendingLists(true);
    try {
      // 1. Fetch pending withdrawals
      const wRes = await api.get(`/api/admin/withdrawals?status=pending`);
      if (wRes.data?.success) {
        setPendingPayouts(wRes.data.withdrawals || []);
      }

      // 2. Fetch pending KYC users
      const uRes = await api.get(`/api/admin/users`);
      if (uRes.data?.success) {
        const allUsers = uRes.data.users || [];
        const pendingKycUsers = allUsers.filter(u => 
          (u.kycStatus?.aadhar && u.kycStatus?.aadhar !== 'approved') || 
          (u.kycStatus?.pan && u.kycStatus?.pan !== 'approved')
        );
        setPendingUsers(pendingKycUsers);
      }
    } catch (err) {
      console.error("Error fetching pending lists:", err);
    } finally {
      setLoadingPendingLists(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  const totalPendingActions = stats.pendingWithdrawals + stats.pendingKYC;

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: themeColors.text }}>Admin Dashboard</h1>
          <p className="mt-1 text-sm" style={{ color: themeColors.textSecondary }}>
            Welcome back, {user?.name || 'Admin'}. Review and clear pending actions below.
          </p>
        </div>

        {totalPendingActions > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold animate-pulse">
            <FaExclamationTriangle className="text-amber-600" />
            <span>{totalPendingActions} Pending Actions Requiring Your Review</span>
          </div>
        )}
      </div>

      {/* Summary KPI Cards - Clickable to open pending views */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Electricians */}
        <div 
          onClick={() => navigate('/users?role=electrician')}
          className="p-5 rounded-2xl shadow-xs border flex items-center justify-between transition-all hover:shadow-md cursor-pointer hover:border-orange-300 group" 
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 text-xl group-hover:scale-105 transition-transform">
              <FaBolt />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Electricians</p>
              <h3 className="text-2xl font-bold mt-0.5" style={{ color: themeColors.text }}>{stats.totalElectricians}</h3>
              <p className="text-xs font-medium text-emerald-600">{stats.totalActiveElectricians} Active</p>
            </div>
          </div>
          <FaArrowRight className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all text-sm" />
        </div>

        {/* Card 2: Retailers */}
        <div 
          onClick={() => navigate('/users?role=retailer')}
          className="p-5 rounded-2xl shadow-xs border flex items-center justify-between transition-all hover:shadow-md cursor-pointer hover:border-purple-300 group" 
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-xl group-hover:scale-105 transition-transform">
              <FaStore />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Retailers</p>
              <h3 className="text-2xl font-bold mt-0.5" style={{ color: themeColors.text }}>{stats.totalRetailers}</h3>
              <p className="text-xs font-medium text-emerald-600">{stats.totalActiveRetailers} Active</p>
            </div>
          </div>
          <FaArrowRight className="text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all text-sm" />
        </div>

        {/* Card 3: Pending Actions (Highlight) */}
        <div 
          onClick={() => {
            setActivePendingTab("payouts");
          }}
          className={`p-5 rounded-2xl shadow-xs border flex items-center justify-between transition-all hover:shadow-md cursor-pointer group ${
            totalPendingActions > 0 ? "ring-2 ring-amber-500 bg-amber-50/30" : ""
          }`}
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 text-xl group-hover:scale-105 transition-transform">
              <FaClock />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-amber-700">Pending Actions</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{totalPendingActions}</h3>
              <p className="text-xs font-medium text-amber-800">
                {stats.pendingWithdrawals} Payouts, {stats.pendingKYC} KYCs
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-600 group-hover:underline">Review &rarr;</span>
        </div>

        {/* Card 4: Total Cashback Paid */}
        <div 
          onClick={() => navigate('/reports/payouts')}
          className="p-5 rounded-2xl shadow-xs border flex items-center justify-between transition-all hover:shadow-md cursor-pointer hover:border-emerald-300 group" 
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl group-hover:scale-105 transition-transform">
              <FaRupeeSign />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Cashback Paid</p>
              <h3 className="text-2xl font-bold mt-0.5" style={{ color: themeColors.text }}>₹{stats.totalCashbackPaid.toLocaleString("en-IN")}</h3>
              <p className="text-xs font-medium text-gray-500">Lifetime Paid</p>
            </div>
          </div>
          <FaArrowRight className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all text-sm" />
        </div>

      </div>

      {/* ======================================================== */}
      {/* PENDING COMMAND CENTER - Directly Open & Manage Pending Lists */}
      {/* ======================================================== */}
      <div 
        className="rounded-2xl border shadow-sm overflow-hidden" 
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        {/* Navigation Tabs Header */}
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePendingTab("payouts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                activePendingTab === "payouts"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white border text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FaMoneyBillWave />
              <span>Pending Transfers (Payouts)</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activePendingTab === "payouts" ? "bg-amber-700 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {pendingPayouts.length}
              </span>
            </button>

            <button
              onClick={() => setActivePendingTab("kyc")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                activePendingTab === "kyc"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FaIdCard />
              <span>Pending KYC Users</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activePendingTab === "kyc" ? "bg-blue-800 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {pendingUsers.length}
              </span>
            </button>
          </div>

          <div>
            {activePendingTab === "payouts" ? (
              <button
                onClick={() => navigate('/withdrawals?filter=pending')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open Full Payouts Screen <FaArrowRight className="text-[10px]" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/users?filter=pending')}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open Full Users Screen <FaArrowRight className="text-[10px]" />
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Pending Payouts Table */}
        {activePendingTab === "payouts" && (
          <div className="overflow-x-auto">
            {loadingPendingLists ? (
              <div className="p-12 text-center text-gray-500">
                <FaSpinner className="animate-spin text-2xl mx-auto text-amber-600 mb-2" />
                <p className="text-sm">Loading pending payouts...</p>
              </div>
            ) : pendingPayouts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaCheckCircle className="text-2xl" />
                </div>
                <h4 className="font-bold text-gray-800 text-base">All Caught Up!</h4>
                <p className="text-sm text-gray-500 mt-1">There are no pending payouts waiting for bank transfer.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">User</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">Role</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">Bank Account Details</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase text-right">Amount</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">Queued Date</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">Status</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayouts.slice(0, 8).map((w) => {
                    const bank = w.bankSnapshot || w.userId?.bankDetails || {};
                    return (
                      <tr key={w._id} className="hover:bg-gray-50/80 transition-colors border-b last:border-0 text-sm">
                        <td className="p-3.5">
                          <p className="font-bold text-gray-900">{w.userId?.name || "Unknown User"}</p>
                          <p className="text-xs text-gray-500 font-mono">{w.userId?.phone || "-"}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase bg-gray-100 text-gray-700">
                            {w.userId?.role || "electrician"}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-gray-600">
                          <p className="font-semibold text-gray-800">{bank.bankName || "Bank Name Pending"}</p>
                          <p className="font-mono mt-0.5">A/C: {bank.accountNumber || "N/A"}</p>
                          <p className="font-mono text-[11px] text-gray-500">IFSC: {bank.ifscCode || "N/A"}</p>
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-600 text-base">
                          ₹{w.amount}
                        </td>
                        <td className="p-3.5 text-xs text-gray-500">
                          {new Date(w.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                            <FaClock /> Pending Transfer
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => navigate('/withdrawals?filter=pending')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer"
                          >
                            Process Transfer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Pending KYC Users Table */}
        {activePendingTab === "kyc" && (
          <div className="overflow-x-auto">
            {loadingPendingLists ? (
              <div className="p-12 text-center text-gray-500">
                <FaSpinner className="animate-spin text-2xl mx-auto text-blue-600 mb-2" />
                <p className="text-sm">Loading pending KYC users...</p>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaCheckCircle className="text-2xl" />
                </div>
                <h4 className="font-bold text-gray-800 text-base">All KYCs Verified!</h4>
                <p className="text-sm text-gray-500 mt-1">There are no users with pending Aadhaar or PAN verifications.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">User Details</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">Role</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">Aadhaar Status</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">PAN Status</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase">Registration Date</th>
                    <th className="p-3.5 font-semibold text-xs border-b uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.slice(0, 8).map((u) => {
                    const aadharSt = u.kycStatus?.aadhar || "pending";
                    const panSt = u.kycStatus?.pan || "pending";
                    return (
                      <tr key={u._id} className="hover:bg-gray-50/80 transition-colors border-b last:border-0 text-sm">
                        <td className="p-3.5">
                          <p className="font-bold text-gray-900">{u.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500 font-mono">{u.phone || "-"}</p>
                          {u.firmName && <p className="text-[11px] text-gray-400">{u.firmName}</p>}
                        </td>
                        <td className="p-3.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase bg-gray-100 text-gray-700">
                            {u.role || "electrician"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            aadharSt === "approved" ? "bg-green-100 text-green-700" :
                            aadharSt === "submitted" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            Aadhaar: {aadharSt}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            panSt === "approved" ? "bg-green-100 text-green-700" :
                            panSt === "submitted" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            PAN: {panSt}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => navigate(`/users/${u._id}`)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer"
                          >
                            Review KYC
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
