import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, "")}/orders`
  : "http://localhost:5000/api/orders";

const getAuthConfig = (token) => {
  const authToken = token || localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  };
};

export const orderService = {
  // Create new order
  createOrder: async (orderData, token) => {
    const res = await axios.post(API_URL, orderData, getAuthConfig(token));
    return res.data;
  },

  // Get current user's orders
  getMyOrders: async (token) => {
    const res = await axios.get(`${API_URL}/my`, getAuthConfig(token));
    return res.data;
  },

  // Get farmer's incoming produce orders
  getFarmerOrders: async (token) => {
    const res = await axios.get(`${API_URL}/farmer`, getAuthConfig(token));
    return res.data;
  },

  // Get single order by ID
  getOrderById: async (orderId, token) => {
    const res = await axios.get(`${API_URL}/${orderId}`, getAuthConfig(token));
    return res.data;
  },

  // Update order status (Farmer / Admin fulfillment)
  updateOrderStatus: async (orderId, statusData, token) => {
    const res = await axios.put(`${API_URL}/${orderId}/status`, statusData, getAuthConfig(token));
    return res.data;
  },

  // Customer cancel order
  cancelOrder: async (orderId, token) => {
    const res = await axios.put(`${API_URL}/${orderId}/cancel`, {}, getAuthConfig(token));
    return res.data;
  },

  // Admin get all platform orders
  getAllOrders: async (token) => {
    const res = await axios.get(API_URL, getAuthConfig(token));
    return res.data;
  },

  // Confirm payment (SEC-02: Simulated sandbox gateway confirmation)
  confirmPayment: async (orderId, paymentData, token) => {
    const res = await axios.post(`${API_URL}/${orderId}/confirm-payment`, paymentData, getAuthConfig(token));
    return res.data;
  },
};

export default orderService;
