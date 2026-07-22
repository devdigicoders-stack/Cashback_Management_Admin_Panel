import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { FaBolt, FaStore, FaClock, FaRupeeSign, FaSpinner } from "react-icons/fa";
import { toast } from "sonner";

const Dashboard = () => {
  const { themeColors, theme } = useTheme();
  const { currentFont } = useFont();
  const { token, user } = useAuth();

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

  useEffect(() => {
    fetchDashboardStats();
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

  // Recharts: Donut Chart Data
  const usersDonutData = [
    { name: 'Electricians', value: stats.totalElectricians, color: '#f97316' }, // Orange
    { name: 'Retailers', value: stats.totalRetailers, color: '#8b5cf6' }       // Purple
  ];

  // Recharts: Bar Chart Data
  const activityBarData = [
    {
      name: 'Electricians',
      Total: stats.totalElectricians,
      Active: stats.totalActiveElectricians,
      'Pending Tasks': 0
    },
    {
      name: 'Retailers',
      Total: stats.totalRetailers,
      Active: stats.totalActiveRetailers,
      'Pending Tasks': 0
    },
    {
      name: 'Pending Actions',
      Total: 0,
      Active: 0,
      'Pending Tasks': stats.pendingWithdrawals + stats.pendingKYC
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-8" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: themeColors.text }}>Dashboard</h1>
        <p className="mt-1 text-base" style={{ color: themeColors.textSecondary }}>
          Welcome back, {user?.name || 'Admin'}. Here is your system's live overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Electricians */}
        <div className="p-6 rounded-2xl shadow-sm border flex items-center gap-4 transition hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-2xl">
            <FaBolt />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: themeColors.textSecondary }}>Total Electricians</p>
            <h3 className="text-2xl font-bold" style={{ color: themeColors.text }}>{stats.totalElectricians}</h3>
            <p className="text-xs font-medium text-green-500 mt-1">{stats.totalActiveElectricians} Active</p>
          </div>
        </div>

        {/* Card 2: Retailers */}
        <div className="p-6 rounded-2xl shadow-sm border flex items-center gap-4 transition hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-2xl">
            <FaStore />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: themeColors.textSecondary }}>Total Retailers</p>
            <h3 className="text-2xl font-bold" style={{ color: themeColors.text }}>{stats.totalRetailers}</h3>
            <p className="text-xs font-medium text-green-500 mt-1">{stats.totalActiveRetailers} Active</p>
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div className="p-6 rounded-2xl shadow-sm border flex items-center gap-4 transition hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-2xl">
            <FaClock />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: themeColors.textSecondary }}>Pending Actions</p>
            <h3 className="text-2xl font-bold" style={{ color: themeColors.text }}>{stats.pendingWithdrawals + stats.pendingKYC}</h3>
            <p className="text-xs font-medium text-red-500 mt-1">
              {stats.pendingWithdrawals} Payouts, {stats.pendingKYC} KYCs
            </p>
          </div>
        </div>

        {/* Card 4: Total Cashback Paid */}
        <div className="p-6 rounded-2xl shadow-sm border flex items-center gap-4 transition hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-500 text-2xl">
            <FaRupeeSign />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: themeColors.textSecondary }}>Total Cashback Paid</p>
            <h3 className="text-2xl font-bold" style={{ color: themeColors.text }}>₹{stats.totalCashbackPaid.toLocaleString()}</h3>
            <p className="text-xs font-medium mt-1" style={{ color: themeColors.textSecondary }}>Lifetime</p>
          </div>
        </div>

      </div>

      {/* Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="p-6 rounded-2xl border shadow-sm flex flex-col items-center" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: themeColors.text }}>Users Distribution</h2>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usersDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={true}
                >
                  {usersDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl border shadow-sm flex flex-col items-center" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: themeColors.text }}>System Activity & Pending Tasks</h2>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activityBarData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                <XAxis dataKey="name" stroke={themeColors.textSecondary} />
                <YAxis stroke={themeColors.textSecondary} />
                <RechartsTooltip cursor={{fill: 'transparent'}} />
                <Legend />
                <Bar dataKey="Total" fill={theme === 'dark' ? '#334155' : '#cbd5e1'} radius={[5, 5, 0, 0]} />
                <Bar dataKey="Active" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Pending Tasks" fill="#ef4444" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
