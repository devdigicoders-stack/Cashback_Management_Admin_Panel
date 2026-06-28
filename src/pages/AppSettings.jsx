import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useFont } from "../context/FontContext";
import { toast } from "sonner";
import { FaCog, FaSave, FaPhone, FaEnvelope, FaLink, FaShareAlt, FaShieldAlt, FaFileContract, FaInfoCircle, FaQuestionCircle } from "react-icons/fa";
import api from "../utils/api";

const AppSettings = () => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    contactPhone: "",
    contactEmail: "",
    rateUsUrl: "",
    shareAppText: "",
    privacyPolicy: "",
    termsAndConditions: "",
    aboutUs: "",
    faq: [],
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/app-config`);
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch app configuration");
      }

      if (data.config) {
        setFormData({
          contactPhone: data.config.contactPhone || "",
          contactEmail: data.config.contactEmail || "",
          rateUsUrl: data.config.rateUsUrl || "",
          shareAppText: data.config.shareAppText || "",
          privacyPolicy: data.config.privacyPolicy || "",
          termsAndConditions: data.config.termsAndConditions || "",
          aboutUs: data.config.aboutUs || "",
          faq: data.config.faq || [],
        });
      }
    } catch (err) {
      toast.error(err.message || "Something went wrong while fetching config.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddFaq = () => {
    setFormData({
      ...formData,
      faq: [...formData.faq, { question: "", answer: "" }],
    });
  };

  const handleFaqChange = (index, field, value) => {
    const newFaq = [...formData.faq];
    newFaq[index][field] = value;
    setFormData({ ...formData, faq: newFaq });
  };

  const handleRemoveFaq = (index) => {
    const newFaq = formData.faq.filter((_, i) => i !== index);
    setFormData({ ...formData, faq: newFaq });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await api.put(`/api/admin/app-config`, formData);
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.message || "Failed to save configuration");
      }

      toast.success("App settings saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error saving configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: themeColors.primary }}></div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-8 pb-24" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FaCog className="text-gray-500" />
            App Settings & Config
          </h1>
          <p className="text-sm mt-2" style={{ color: themeColors.textSecondary }}>
            Manage the contact details, policies, and promotional links visible to users in the mobile app.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Contact Info Section */}
        <div className="rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
            <FaPhone className="text-green-500 text-lg" /> 
            <h2 className="font-bold text-lg">Contact Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: themeColors.text }}>
                Support Phone Number
              </label>
              <input
                type="text"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-transparent"
                style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
                placeholder="+91 9999999999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: themeColors.text }}>
                Support Email Address
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-transparent"
                style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
                placeholder="support@cashback.com"
              />
            </div>
          </div>
        </div>

        {/* Links & Marketing Section */}
        <div className="rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
            <FaLink className="text-blue-500 text-lg" /> 
            <h2 className="font-bold text-lg">App Links & Marketing</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: themeColors.text }}>
                Play Store / App Store URL (Rate Us Link)
              </label>
              <input
                type="url"
                name="rateUsUrl"
                value={formData.rateUsUrl}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-transparent"
                style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
                placeholder="https://play.google.com/store/apps/details?id=..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: themeColors.text }}>
                <FaShareAlt className="text-gray-400" /> Share App Default Text (WhatsApp)
              </label>
              <textarea
                name="shareAppText"
                value={formData.shareAppText}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-transparent"
                style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
                rows="3"
                placeholder="Download our app and get instant cashback!"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Legal & About Section */}
        <div className="rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
            <FaShieldAlt className="text-purple-500 text-lg" /> 
            <h2 className="font-bold text-lg">Legal & About Pages</h2>
          </div>
          <div className="p-6 space-y-8">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: themeColors.text }}>
                <FaFileContract className="text-gray-400" /> Privacy Policy
              </label>
              <textarea
                name="privacyPolicy"
                value={formData.privacyPolicy}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all font-mono leading-relaxed bg-transparent"
                style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
                rows="8"
                placeholder="Enter your comprehensive privacy policy here..."
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: themeColors.text }}>
                <FaFileContract className="text-gray-400" /> Terms & Conditions
              </label>
              <textarea
                name="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all font-mono leading-relaxed bg-transparent"
                style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
                rows="8"
                placeholder="Enter your terms and conditions here..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: themeColors.text }}>
                <FaInfoCircle className="text-gray-400" /> About Us
              </label>
              <textarea
                name="aboutUs"
                value={formData.aboutUs}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all font-mono leading-relaxed bg-transparent"
                style={{ borderColor: themeColors.border, color: themeColors.text, focusRingColor: themeColors.primary }}
                rows="8"
                placeholder="Enter information about your company..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="px-6 py-4 border-b flex justify-between items-center gap-3" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
            <div className="flex items-center gap-3">
              <FaQuestionCircle className="text-orange-500 text-lg" /> 
              <h2 className="font-bold text-lg">Frequently Asked Questions (FAQ)</h2>
            </div>
            <button
              type="button"
              onClick={handleAddFaq}
              className="text-sm px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition"
            >
              + Add FAQ
            </button>
          </div>
          <div className="p-6 space-y-6">
            {formData.faq.length === 0 ? (
              <p className="text-sm italic opacity-60">No FAQs added yet. Click "+ Add FAQ" to create one.</p>
            ) : (
              formData.faq.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 relative" style={{ borderColor: themeColors.border }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveFaq(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                  >
                    × Remove
                  </button>
                  <div>
                    <label className="block text-sm font-medium mb-1">Question</label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                      className="w-full border rounded-md p-2 text-sm bg-transparent"
                      style={{ borderColor: themeColors.border, color: themeColors.text }}
                      placeholder="e.g. How do I get cashback?"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Answer</label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                      className="w-full border rounded-md p-2 text-sm bg-transparent"
                      style={{ borderColor: themeColors.border, color: themeColors.text }}
                      rows="3"
                      placeholder="Enter the answer..."
                      required
                    ></textarea>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Floating Save Button */}
        <div 
          className="fixed bottom-0 left-0 right-0 border-t p-4 flex justify-end px-6 shadow-2xl z-40 lg:ml-64 transition-all"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          <div className="w-full flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold transition-all shadow hover:shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              style={{ backgroundColor: themeColors.primary, color: '#fff' }}
            >
              <FaSave className={isSaving ? "animate-pulse" : ""} />
              {isSaving ? "Saving Config..." : "Save Settings"}
            </button>
          </div>
        </div>
        
      </form>
    </div>
  );
};

export default AppSettings;
