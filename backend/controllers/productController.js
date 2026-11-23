import Product from "../models/Product.js";
import mongoose from "mongoose";

// @desc    Get all products with query filtering (category, search, seller, price, sort)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const { category, search, seller, minPrice, maxPrice, status, sort } = req.query;

    const query = {};

    // Filter by Category (case-insensitive regex)
    if (category && category !== "All") {
      query.category = new RegExp(`^${category.trim()}$`, "i");
    }

    // Filter by Search Keyword (in name or description)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    // Filter by Seller
    if (seller && mongoose.Types.ObjectId.isValid(seller)) {
      query.seller = seller;
    }

    // Filter by Price Range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined && !isNaN(Number(minPrice))) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // Filter by Status
    if (status) {
      query.status = status;
    }

    // Sort order
    let sortOption = { createdAt: -1 }; // default newest
    if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };
    else if (sort === "rating") sortOption = { rating: -1 };
    else if (sort === "oldest") sortOption = { createdAt: 1 };

    const products = await Product.find(query)
      .populate("seller", "name email phone isVerified")
      .sort(sortOption);

    res.json(products);
  } catch (error) {
    console.error("getProducts error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id).populate(
      "seller",
      "name email phone isVerified"
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("getProductById error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get logged in farmer's products
// @route   GET /api/products/my
// @access  Private (Farmer/Admin)
export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .populate("seller", "name email phone isVerified")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("getMyProducts error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Farmer/Admin)
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      quantity,
      stock,
      unit,
      grade,
      images,
      harvestDate,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: "Valid positive price is required" });
    }

    const numStock = stock !== undefined ? Math.max(0, Number(stock)) : 50;

    let computedStatus = "available";
    if (numStock <= 0) computedStatus = "sold_out";
    else if (numStock < 10) computedStatus = "low_stock";

    const product = new Product({
      name: name.trim(),
      description: description ? description.trim() : "",
      category: category || "Vegetables",
      price: Number(price),
      quantity: quantity ? Number(quantity) : 1,
      stock: numStock,
      unit: unit || "kg",
      grade: grade || "A",
      status: computedStatus,
      seller: req.user._id,
      images: Array.isArray(images) && images.length > 0 ? images : [
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=400&auto=format&fit=crop"
      ],
      harvestDate: harvestDate || new Date(),
    });

    const createdProduct = await product.save();
    const populated = await createdProduct.populate("seller", "name email phone isVerified");

    res.status(201).json(populated);
  } catch (error) {
    console.error("createProduct error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Farmer/Admin)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Ownership check: must be owner or admin
    if (
      product.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized to edit this product" });
    }

    const {
      name,
      description,
      category,
      price,
      stock,
      unit,
      grade,
      images,
      status,
    } = req.body;

    if (name) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (category) product.category = category;
    if (price !== undefined && !isNaN(Number(price))) product.price = Number(price);
    if (unit) product.unit = unit;
    if (grade) product.grade = grade;
    if (images && Array.isArray(images)) product.images = images;

    if (stock !== undefined && !isNaN(Number(stock))) {
      product.stock = Math.max(0, Number(stock));
      if (product.stock <= 0) product.status = "sold_out";
      else if (product.stock < 10) product.status = "low_stock";
      else product.status = "available";
    }

    if (status && ["available", "low_stock", "sold_out"].includes(status)) {
      product.status = status;
    }

    const updatedProduct = await product.save();
    const populated = await updatedProduct.populate("seller", "name email phone isVerified");

    res.json(populated);
  } catch (error) {
    console.error("updateProduct error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Farmer/Admin)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Ownership check: must be owner or admin
    if (
      product.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }

    await Product.findByIdAndDelete(id);

    res.json({ message: "Product removed successfully", id });
  } catch (error) {
    console.error("deleteProduct error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
