import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaGift, FaRupeeSign, FaBox, FaListAlt, FaSearch } from "react-icons/fa";
import api from "../utils/api";

const Cashback = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState("ledger");
  const [loading, setLoading] = useState(true);

  // States
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (activeTab === "ledger") {
      fetchTransactions();
    } else {
      fetchSummary();
    }
  }, [activeTab]);

  // Reset pagination on tab, search or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/cashback-transactions`);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch transactions");
      }

      setTransactions(data.transactions || []);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/cashback-summary`);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch cashback summary");
      }

      setSummary(data.summary || []);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((txn) =>
    txn.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    txn.userId?.phone?.includes(searchQuery)
  );

  // Determine which list to paginate based on active tab
  const currentList = activeTab === "ledger" ? filteredTransactions : summary;

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = currentList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentList.length / itemsPerPage) || 1;

  return (
    <div className="p-6 w-full space-y-6" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaGift className="text-purple-500" />
            Cashback & Rewards
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Monitor cashback credited to electricians and overall product scan performance.
          </p>
        </div>
      </div>

      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border }}>
          
          {/* Tabs */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("ledger")}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
                activeTab === "ledger" ? "bg-white shadow-sm text-purple-600" : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FaListAlt /> Transactions Ledger
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
                activeTab === "summary" ? "bg-white shadow-sm text-purple-600" : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FaBox /> Product Summary
            </button>
          </div>

          {/* Search (Only for Ledger) */}
          {activeTab === "ledger" && (
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FaSearch />
              </div>
              <input
                type="text"
                placeholder="Search user by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 p-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
            </div>
          ) : activeTab === "ledger" ? (
            // Ledger Table
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                  <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>User</th>
                  <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Details</th>
                  <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Amount Credited</th>
                  <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">No cashback transactions found.</td>
                  </tr>
                ) : (
                  currentItems.map((txn) => (
                    <tr key={txn._id} className="hover:bg-gray-50 transition-colors border-b last:border-0" style={{ borderColor: themeColors.border }}>
                      <td className="p-4">
                        <p className="font-semibold">{txn.userId?.name || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{txn.userId?.phone || ""}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-gray-800">{txn.description || "QR Scan Reward"}</p>
                        {txn.referenceId && <p className="text-xs text-gray-400">Ref: {txn.referenceId}</p>}
                      </td>
                      <td className="p-4 font-bold text-green-600 flex items-center gap-1">
                        <FaRupeeSign className="text-sm" />{txn.amount}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(txn.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            // Summary Table
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary }}>
                  <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Product Name</th>
                  <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>SKU / Category</th>
                  <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Total Scans</th>
                  <th className="p-4 font-medium text-sm border-b" style={{ borderColor: themeColors.border }}>Total Cashback Given</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">No scan data available yet.</td>
                  </tr>
                ) : (
                  currentItems.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-50 transition-colors border-b last:border-0" style={{ borderColor: themeColors.border }}>
                      <td className="p-4 font-semibold text-gray-800">
                        {item.name || "Unknown Product"}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-gray-700">{item.sku || "N/A"}</p>
                        <p className="text-xs text-gray-500">{item.category || "Uncategorized"}</p>
                      </td>
                      <td className="p-4 font-bold text-blue-600">
                        {item.totalScans}
                      </td>
                      <td className="p-4 font-bold text-green-600 flex items-center gap-1">
                        <FaRupeeSign className="text-sm" />{item.totalCashbackPaid}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && currentList.length > 0 && (
          <div className="p-4 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
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
              
              <span className="text-sm font-medium px-2">
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
    </div>
  );
};

export default Cashback;
