import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFont } from '../context/FontContext';
import { User, Mail, Phone, Edit2, Save, X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';

const Profile = () => {
  const { admin, setLoginData } = useAuth();
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/auth/me');
      if (response.data && response.data.success) {
        const user = response.data.user;
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || '',
        });
        setFormData({
          name: user.name || '',
          email: user.email || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await api.put('/api/auth/profile', formData);
      if (response.data && response.data.success) {
        toast.success('Profile updated successfully');
        setProfileData((prev) => ({
          ...prev,
          name: formData.name,
          email: formData.email,
        }));
        
        // Update context if name changed
        if (admin && admin.name !== formData.name) {
          setLoginData({ ...admin, name: formData.name });
        }
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8" style={{ fontFamily: currentFont.family }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: themeColors.text }}>My Profile</h1>
        <p className="mt-2" style={{ color: themeColors.textSecondary }}>Manage your account settings and personal information.</p>
      </div>

      <div className="rounded-2xl shadow-sm border overflow-hidden transition-all duration-300" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        {/* Header Background */}
        <div className="h-32 w-full relative" style={{ background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.primary}80 100%)` }}>
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center text-4xl font-bold shadow-md bg-white"
                 style={{ color: themeColors.primary, borderColor: '#f3f4f6' }}>
              {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </div>

        <div className="pt-16 px-8 pb-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: themeColors.text }}>{profileData.name || 'Admin User'}</h2>
              <div className="flex items-center mt-1 space-x-2">
                <Shield size={16} style={{ color: themeColors.primary }} />
                <span className="text-sm font-medium uppercase tracking-wider" style={{ color: themeColors.textSecondary }}>{profileData.role || 'Admin'}</span>
              </div>
            </div>
            
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 shadow-sm"
                style={{ backgroundColor: themeColors.primary, color: themeColors.onPrimary }}
              >
                <Edit2 size={16} className="mr-2" />
                Edit Profile
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ name: profileData.name, email: profileData.email }); // Reset
                }}
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 border shadow-sm"
                style={{ color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.background }}
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center" style={{ color: themeColors.text }}>
                  <User size={16} className="mr-2 opacity-70" /> Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                    style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                    placeholder="Enter your full name"
                    required
                  />
                ) : (
                  <div className="p-3 rounded-lg border" style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: 'transparent' }}>
                    {profileData.name || 'N/A'}
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center" style={{ color: themeColors.text }}>
                  <Mail size={16} className="mr-2 opacity-70" /> Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                    style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                    placeholder="Enter your email"
                  />
                ) : (
                  <div className="p-3 rounded-lg border" style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: 'transparent' }}>
                    {profileData.email || 'N/A'}
                  </div>
                )}
              </div>

              {/* Phone Field (Read Only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center" style={{ color: themeColors.text }}>
                  <Phone size={16} className="mr-2 opacity-70" /> Phone Number
                </label>
                <div className="p-3 rounded-lg border flex justify-between items-center" style={{ backgroundColor: themeColors.background, color: themeColors.textSecondary, borderColor: 'transparent', opacity: 0.8 }}>
                  <span>{profileData.phone || 'N/A'}</span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700" style={{ backgroundColor: themeColors.border }}>Uneditable</span>
                </div>
              </div>

            </div>

            {/* Submit Button */}
            {isEditing && (
              <div className="pt-6 mt-6 border-t flex justify-end" style={{ borderColor: themeColors.border }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-70"
                  style={{ backgroundColor: themeColors.primary, color: themeColors.onPrimary }}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
