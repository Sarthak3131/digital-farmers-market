import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, "")}/admin`
  : "http://localhost:5000/api/admin";

const getAuthConfig = (token) => {
  const authToken = token || localStorage.getItem("token") || localStorage.getItem("jwt");
  return {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  };
};

export const adminService = {
  // Command Center Overview
  getStats: async (token) => {
    const res = await axios.get(`${API_URL}/stats`, getAuthConfig(token));
    return res.data;
  },

  // Platform Revenue Analytics
  getRevenue: async (token) => {
    const res = await axios.get(`${API_URL}/revenue`, getAuthConfig(token));
    return res.data;
  },

  // User Management
  getUsers: async (params = {}, token) => {
    const res = await axios.get(`${API_URL}/users`, {
      ...getAuthConfig(token),
      params,
    });
    return res.data;
  },

  toggleUserStatus: async (userId, token) => {
    const res = await axios.put(`${API_URL}/users/${userId}/status`, {}, getAuthConfig(token));
    return res.data;
  },

  deleteUser: async (userId, token) => {
    const res = await axios.delete(`${API_URL}/users/${userId}`, getAuthConfig(token));
    return res.data;
  },

  // Farmer KYC Verification
  getPendingFarmers: async (token) => {
    const res = await axios.get(`${API_URL}/farmers/pending`, getAuthConfig(token));
    return res.data;
  },

  verifyFarmer: async (farmerId, token) => {
    const res = await axios.put(`${API_URL}/farmers/${farmerId}/verify`, {}, getAuthConfig(token));
    return res.data;
  },

  rejectFarmer: async (farmerId, token) => {
    const res = await axios.put(`${API_URL}/farmers/${farmerId}/reject`, {}, getAuthConfig(token));
    return res.data;
  },

  // Disputes
  getDisputes: async (token) => {
    const res = await axios.get(`${API_URL}/disputes`, getAuthConfig(token));
    return res.data;
  },

  resolveDispute: async (disputeId, resolutionData, token) => {
    const res = await axios.put(`${API_URL}/disputes/${disputeId}/resolve`, resolutionData, getAuthConfig(token));
    return res.data;
  },

  // Live Auctions Control
  stopAuction: async (auctionId, token) => {
    const res = await axios.put(`${API_URL}/auctions/${auctionId}/stop`, {}, getAuthConfig(token));
    return res.data;
  },

  // System Configuration
  getConfig: async (token) => {
    const res = await axios.get(`${API_URL}/config`, getAuthConfig(token));
    return res.data;
  },

  updateConfig: async (configData, token) => {
    const res = await axios.put(`${API_URL}/config`, configData, getAuthConfig(token));
    return res.data;
  },

  // Notifications
  getNotifications: async (token) => {
    const res = await axios.get(`${API_URL}/notifications`, getAuthConfig(token));
    return res.data;
  },

  markNotificationRead: async (notificationId, token) => {
    const res = await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, getAuthConfig(token));
    return res.data;
  },
};

export default adminService;
