import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_URL = `${API_BASE}/products`;

// Get all products with optional filters
export const getProducts = async (params = {}) => {
  const response = await axios.get(API_URL, { params });
  return response.data;
};

// Get single product by ID
export const getProductById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

// Get logged-in farmer's products
export const getMyProducts = async (token) => {
  const authToken = token || localStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };
  const response = await axios.get(`${API_URL}/my`, config);
  return response.data;
};

// Create a new product (Farmer/Admin)
export const createProduct = async (productData, token) => {
  const authToken = token || localStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };
  const response = await axios.post(API_URL, productData, config);
  return response.data;
};

// Update an existing product (Farmer/Admin)
export const updateProduct = async (id, productData, token) => {
  const authToken = token || localStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };
  const response = await axios.put(`${API_URL}/${id}`, productData, config);
  return response.data;
};

// Delete a product (Farmer/Admin)
export const deleteProduct = async (id, token) => {
  const authToken = token || localStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };
  const response = await axios.delete(`${API_URL}/${id}`, config);
  return response.data;
};

const productService = {
  getProducts,
  getProductById,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};

export default productService;
