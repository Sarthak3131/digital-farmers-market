import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_URL = `${API_BASE}/auctions`;

export const getAuctionDetails = async (auctionId) => {
  const response = await axios.get(`${API_URL}/${auctionId}`);
  return response.data;
};

export const placeBid = async (auctionId, amount, token) => {
  const authToken = token || localStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };
  const response = await axios.post(
    `${API_URL}/bid`,
    { auctionId, amount: Number(amount) },
    config
  );
  return response.data;
};

export const createAuction = async (auctionData, token) => {
  const authToken = token || localStorage.getItem("token");
  const config = {
    headers: { Authorization: `Bearer ${authToken}` },
  };
  const response = await axios.post(`${API_URL}/create`, auctionData, config);
  return response.data;
};

export const getAllAuctions = async (params = {}) => {
  const response = await axios.get(API_URL, { params });
  return response.data;
};

export const getSellerAuctions = async (token) => {
  const authToken = token || localStorage.getItem("token");
  const config = {
    headers: { Authorization: `Bearer ${authToken}` },
  };
  const response = await axios.get(`${API_URL}/seller`, config);
  return response.data;
};

export const getFeed = async () => {
  const response = await axios.get(`${API_URL}/feed`);
  return response.data;
};

const bidService = {
  getAuctionDetails,
  getAuction: getAuctionDetails,
  placeBid,
  createAuction,
  getAllAuctions,
  getSellerAuctions,
  getFeed,
};

export default bidService;
