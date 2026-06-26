// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const Login = () => {
  const [credentials, setCredentials] = useState({
    adminId: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { setLoginData } = useAuth();
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await api.post("/api/auth/login", {
        phone: credentials.adminId.trim(),
        password: credentials.password,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Invalid credentials");
      }

      // Ensure the logged-in user is an admin or sub-admin
      if (data.user.role !== 'admin' && data.user.role !== 'sub-admin') {
        throw new Error("Access denied: You are not authorized as an admin.");
      }

      setLoginData({ 
        adminId: data.user.phone, 
        name: data.user.name, 
        id: data.user.id, 
        token: data.token,
        role: data.user.role
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "An error occurred while connecting to the server.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: themeColors.background,
        fontFamily: currentFont.family,
      }}
    >
      <div
        className="w-full max-w-sm p-6 rounded-2xl shadow-lg border"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        {/* Branding Section */}
        <div className="text-center mb-4 flex flex-col items-center">
          <div 
            className="w-28 h-28 mx-auto mb-3 flex items-center justify-center rounded-full overflow-hidden shadow-sm border-2"
            style={{ borderColor: themeColors.primary + '40', backgroundColor: themeColors.background }}
          >
            <img
              src="/logo.png"
              alt="Cashback Logo"
              className="w-full h-full object-cover p-1 rounded-full"
            />
          </div>

          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: themeColors.primary }}
          >
            Cashback
          </h1>

          <p
            className="text-xs"
            style={{ color: themeColors.textSecondary }}
          >
            Admin Panel
          </p>
        </div>

        {/* Error Box */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-center text-sm"
            style={{
              backgroundColor: themeColors.danger + "15",
              color: themeColors.danger,
              border: `1px solid ${themeColors.danger}30`,
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin ID / Phone Number */}
          <div>
            <label
              htmlFor="adminId"
              className="block mb-2 text-sm font-medium"
              style={{ color: themeColors.text }}
            >
              Admin Phone Number
            </label>
            <input
              type="text"
              id="adminId"
              name="adminId"
              value={credentials.adminId}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
                borderColor: themeColors.border,
              }}
              placeholder="Enter Admin Phone Number"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-medium"
              style={{ color: themeColors.text }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
                borderColor: themeColors.border,
              }}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            style={{
              backgroundColor: themeColors.primary,
              color: themeColors.onPrimary,
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;