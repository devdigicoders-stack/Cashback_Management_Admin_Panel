import { memo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useAuth } from "../context/AuthContext";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Header = memo(({
  toggleSidebar,
  currentPageTitle
}) => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { admin } = useAuth();
  const navigate = useNavigate();
  
  return (
    <header
      className="h-16 flex items-center justify-between px-4 border-b backdrop-blur-sm sticky top-0 z-40"
      style={{
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      }}
    >
      <div className="flex items-center min-w-0 flex-1">
        <button
          onClick={toggleSidebar}
          className="lg:hidden mr-3 p-1.5 rounded-md hover:scale-110 transition-all duration-200"
          style={{
            color: themeColors.text,
            backgroundColor: themeColors.background
          }}
          aria-label="Open sidebar"
        >
          <span className="text-base">☰</span>
        </button>
        <h2
          className="text-sm font-semibold truncate"
          style={{
            color: themeColors.text,
            fontFamily: currentFont.family
          }}
        >
          {currentPageTitle}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* Profile Section */}
        <div 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 cursor-pointer group px-3 py-1.5 rounded-xl transition-all duration-300 border shadow-sm hover:shadow-md"
          style={{
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
          }}
        >
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-bold truncate max-w-[120px]" style={{ color: themeColors.text }}>
              {admin?.name || "Admin"}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: themeColors.primary }}>
              Super Admin
            </span>
          </div>
          
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-inner overflow-hidden border-2 transition-transform duration-300 group-hover:scale-105"
            style={{ 
              backgroundColor: themeColors.primary + '20',
              borderColor: themeColors.primary 
            }}
          >
            <FaUserCircle className="text-2xl" style={{ color: themeColors.primary }} />
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
export default Header;