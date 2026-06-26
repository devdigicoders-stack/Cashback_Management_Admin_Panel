import React, { useState, useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { FaBolt, FaStore, FaClock, FaRupeeSign, FaSpinner } from "react-icons/fa";
import { toast } from "sonner";

const Dashboard = () => {
  const { themeColors } = useTheme();
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

  // Highcharts: Donut Chart for Users Distribution
  const usersDonutOptions = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      style: { fontFamily: currentFont.family }
    },
    title: {
      text: "Users Distribution",
      style: { color: themeColors.text, fontWeight: "bold" }
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> ({point.y} users)'
    },
    plotOptions: {
      pie: {
        innerSize: '60%', // Makes it a donut chart
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.y}',
          style: { color: themeColors.text }
        }
      }
    },
    series: [{
      name: 'Users',
      colorByPoint: true,
      data: [
        { name: 'Electricians', y: stats.totalElectricians, color: '#f97316' }, // Orange
        { name: 'Retailers', y: stats.totalRetailers, color: '#8b5cf6' }       // Purple
      ]
    }],
    credits: { enabled: false }
  };

  // Highcharts: Column Chart for System Activity
  const activityColumnOptions = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      style: { fontFamily: currentFont.family }
    },
    title: {
      text: "System Activity & Pending Tasks",
      style: { color: themeColors.text, fontWeight: "bold" }
    },
    xAxis: {
      categories: ['Electricians', 'Retailers', 'Pending Actions'],
      labels: { style: { color: themeColors.textSecondary } }
    },
    yAxis: {
      min: 0,
      title: {
        text: 'Count',
        style: { color: themeColors.textSecondary }
      },
      labels: { style: { color: themeColors.textSecondary } },
      gridLineColor: themeColors.border
    },
    tooltip: {
      shared: true
    },
    plotOptions: {
      column: {
        borderRadius: 5,
        dataLabels: { enabled: true }
      }
    },
    series: [
      {
        name: 'Total',
        data: [stats.totalElectricians, stats.totalRetailers, null],
        color: '#e2e8f0' // Gray
      },
      {
        name: 'Active',
        data: [stats.totalActiveElectricians, stats.totalActiveRetailers, null],
        color: '#3b82f6' // Blue
      },
      {
        name: 'Pending Tasks',
        data: [null, null, stats.pendingWithdrawals + stats.pendingKYC],
        color: '#ef4444' // Red
      }
    ],
    credits: { enabled: false }
  };

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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-base" style={{ color: themeColors.textSecondary }}>
          Welcome back, {user?.name || 'Admin'}. Here is your system's live overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Electricians */}
        <div className="p-6 rounded-2xl shadow-sm border bg-white flex items-center gap-4 transition hover:shadow-md">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-2xl">
            <FaBolt />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Total Electricians</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.totalElectricians}</h3>
            <p className="text-xs font-medium text-green-600 mt-1">{stats.totalActiveElectricians} Active</p>
          </div>
        </div>

        {/* Card 2: Retailers */}
        <div className="p-6 rounded-2xl shadow-sm border bg-white flex items-center gap-4 transition hover:shadow-md">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-2xl">
            <FaStore />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Total Retailers</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.totalRetailers}</h3>
            <p className="text-xs font-medium text-green-600 mt-1">{stats.totalActiveRetailers} Active</p>
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div className="p-6 rounded-2xl shadow-sm border bg-white flex items-center gap-4 transition hover:shadow-md">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl">
            <FaClock />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Pending Actions</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.pendingWithdrawals + stats.pendingKYC}</h3>
            <p className="text-xs font-medium text-red-500 mt-1">
              {stats.pendingWithdrawals} Payouts, {stats.pendingKYC} KYCs
            </p>
          </div>
        </div>

        {/* Card 4: Total Cashback Paid */}
        <div className="p-6 rounded-2xl shadow-sm border bg-white flex items-center gap-4 transition hover:shadow-md">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl">
            <FaRupeeSign />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Total Cashback Paid</p>
            <h3 className="text-2xl font-bold text-gray-800">₹{stats.totalCashbackPaid.toLocaleString()}</h3>
            <p className="text-xs font-medium text-gray-400 mt-1">Lifetime</p>
          </div>
        </div>

      </div>

      {/* Highcharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="p-6 rounded-2xl border bg-white shadow-sm" style={{ borderColor: themeColors.border }}>
          <HighchartsReact highcharts={Highcharts} options={usersDonutOptions} />
        </div>

        <div className="p-6 rounded-2xl border bg-white shadow-sm" style={{ borderColor: themeColors.border }}>
          <HighchartsReact highcharts={Highcharts} options={activityColumnOptions} />
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
