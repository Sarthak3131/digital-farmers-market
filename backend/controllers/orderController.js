import Order from "../models/Order.js";
import Product from "../models/Product.js";

// Helper to round to 2 decimal places
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// @desc    Create new order with server-side validation & stock deduction
// @route   POST /api/orders
// @access  Private (Consumer / Admin)
export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, deliverySlot } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart cannot be empty" });
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.phone) {
      return res.status(400).json({ message: "Valid shipping address and contact number required" });
    }

    // 1. Validate each item against the database and calculate trusted prices
    const validatedItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const quantity = Math.max(1, parseInt(item.quantity || item.qty, 10) || 1);
      const productId = item.product || item.id || item._id;

      if (!productId) {
        return res.status(400).json({ message: `Invalid item format: missing product id for ${item.name}` });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: `Product "${item.name || productId}" is no longer available.` });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stock} ${product.unit || 'units'}, Requested: ${quantity}`
        });
      }

      // Use trusted server-side price
      const price = Number(product.price);
      calculatedSubtotal += price * quantity;

      validatedItems.push({
        product: product._id,
        seller: product.seller,
        name: product.name,
        quantity,
        price,
        image: product.image || item.image || item.img,
        unit: product.unit || "kg"
      });
    }

    // 2. Financial Calculations
    // GST Tax: 5% on agricultural produce/processed items
    const tax = round2(calculatedSubtotal * 0.05);
    // Platform fee: 2.5%
    const platformFee = round2(calculatedSubtotal * 0.025);
    // Delivery fee: Free over ₹500, else ₹40
    const deliveryFee = calculatedSubtotal >= 500 ? 0 : 40;
    // Total Amount
    const totalAmount = round2(calculatedSubtotal + tax + deliveryFee);

    // 3. Atomically decrement inventory stock
    for (const vItem of validatedItems) {
      const updatedProduct = await Product.findByIdAndUpdate(
        vItem.product,
        { $inc: { stock: -vItem.quantity } },
        { new: true }
      );

      // If stock reached 0 or less, mark status as sold_out
      if (updatedProduct && updatedProduct.stock <= 0) {
        updatedProduct.status = "sold_out";
        await updatedProduct.save();
      }
    }

    // 4. Generate unique tracking ID
    const trackingId = `TF-ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 5. Construct & Save Order
    const order = new Order({
      buyer: req.user._id,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      tax,
      deliveryFee,
      platformFee,
      totalAmount,
      shippingAddress: {
        name: shippingAddress.name || req.user.name,
        phone: shippingAddress.phone || req.user.phone || "",
        email: shippingAddress.email || req.user.email || "",
        address: shippingAddress.address,
        city: shippingAddress.city || "Mumbai",
        state: shippingAddress.state || "Maharashtra",
        pincode: shippingAddress.pincode || "400001",
        instructions: shippingAddress.instructions || deliverySlot || ""
      },
      status: "pending",
      paymentMethod: (paymentMethod || "COD").toUpperCase(),
      paymentStatus: (paymentMethod || "").toUpperCase() === "COD" ? "pending" : "completed",
      trackingId
    });

    const createdOrder = await order.save();

    // 6. Broadcast Real-time Order Notification to Admin and Socket rooms
    const io = req.app.get("io");
    if (io) {
      io.emit("new_order", {
        orderId: createdOrder._id,
        trackingId: createdOrder.trackingId,
        buyerName: req.user.name,
        totalAmount: createdOrder.totalAmount,
        itemCount: createdOrder.items.length,
        createdAt: createdOrder.createdAt
      });
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: error.message || "Failed to place order" });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate("items.product", "name category image price unit")
      .populate("items.seller", "name phone email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Get My Orders Error:", error);
    res.status(500).json({ message: error.message || "Failed to retrieve orders" });
  }
};

// @desc    Get orders for farmer's produce
// @route   GET /api/orders/farmer
// @access  Private (Farmer / Admin)
export const getFarmerOrders = async (req, res) => {
  try {
    // Find all products owned by this farmer
    const myProducts = await Product.find({ seller: req.user._id }).select("_id");
    const myProductIds = myProducts.map(p => p._id);

    // Find orders containing any of these products or items where seller is this farmer
    const orders = await Order.find({
      $or: [
        { "items.product": { $in: myProductIds } },
        { "items.seller": req.user._id }
      ]
    })
      .populate("buyer", "name email phone")
      .populate("items.product", "name category image price unit")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Get Farmer Orders Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch farmer orders" });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("buyer", "name email phone")
      .populate("items.product", "name category image price unit")
      .populate("items.seller", "name phone email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization: must be buyer, farmer of an item, or admin
    const isBuyer = order.buyer?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isSeller = order.items.some(
      item => item.seller?.toString() === req.user._id.toString() ||
              item.product?.seller?.toString() === req.user._id.toString()
    );

    if (!isBuyer && !isAdmin && !isSeller) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get Order By ID Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch order details" });
  }
};

// @desc    Update order status (fulfillment progress)
// @route   PUT /api/orders/:id/status
// @access  Private (Farmer / Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered", "completed", "cancelled"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If changing to cancelled and was not already cancelled, restore inventory
    if (status === "cancelled" && order.status !== "cancelled") {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
            $set: { status: "available" }
          });
        }
      }
      if (order.paymentStatus === "completed") {
        order.paymentStatus = "refunded";
      }
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    const updatedOrder = await order.save();

    // Broadcast socket update
    const io = req.app.get("io");
    if (io) {
      io.emit("order_status_updated", {
        orderId: updatedOrder._id,
        trackingId: updatedOrder.trackingId,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus
      });
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error("Update Order Status Error:", error);
    res.status(500).json({ message: error.message || "Failed to update order status" });
  }
};

// @desc    Cancel order by buyer
// @route   PUT /api/orders/:id/cancel
// @access  Private (Consumer)
export const cancelMyOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify ownership
    if (order.buyer.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    if (order.status !== "pending" && order.status !== "processing") {
      return res.status(400).json({
        message: `Order cannot be cancelled in "${order.status}" status. Please contact support.`
      });
    }

    // Restore stock
    for (const item of order.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
          $set: { status: "available" }
        });
      }
    }

    order.status = "cancelled";
    if (order.paymentStatus === "completed") {
      order.paymentStatus = "refunded";
    }

    const savedOrder = await order.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("order_status_updated", {
        orderId: savedOrder._id,
        trackingId: savedOrder.trackingId,
        status: savedOrder.status
      });
    }

    res.json({ message: "Order cancelled successfully", order: savedOrder });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({ message: error.message || "Failed to cancel order" });
  }
};

// @desc    Get all platform orders
// @route   GET /api/orders
// @access  Private (Admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("buyer", "name email phone")
      .populate("items.product", "name category price unit")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Get All Orders Error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch orders" });
  }
};
