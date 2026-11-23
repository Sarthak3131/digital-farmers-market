import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// Helper to round to 2 decimal places
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper to safely roll back decremented stock on multi-item failure
const rollbackDeductedStock = async (items) => {
  for (const item of items) {
    try {
      const prod = await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: { stock: item.quantity },
          $set: { status: "available" }
        },
        { new: true }
      );
    } catch (err) {
      console.error(`Failed to rollback stock for product ${item.product}:`, err);
    }
  }
};

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

    // 3. Atomically decrement inventory stock using conditional atomic check ($gte)
    // Supports MongoDB transactions if replica set is available, else atomic compensation rollback
    const isReplicaSet = mongoose.connection.client?.topology?.description?.type?.includes("ReplicaSet") || false;
    const session = isReplicaSet ? await mongoose.startSession() : null;
    if (session) session.startTransaction();

    const decrementedItems = [];
    let stockDeductionFailed = false;
    let failedItemName = "";

    try {
      for (const vItem of validatedItems) {
        // Enforce conditional atomic decrement: stock must be >= requested quantity
        const query = { _id: vItem.product, stock: { $gte: vItem.quantity } };
        const update = { $inc: { stock: -vItem.quantity } };
        const options = { new: true, ...(session ? { session } : {}) };

        const updatedProduct = await Product.findOneAndUpdate(query, update, options);

        if (!updatedProduct) {
          stockDeductionFailed = true;
          failedItemName = vItem.name;
          break;
        }

        decrementedItems.push(vItem);

        // If stock reaches 0, update product status to sold_out
        if (updatedProduct.stock === 0) {
          await Product.findByIdAndUpdate(
            vItem.product,
            { $set: { status: "sold_out" } },
            options
          );
        }
      }

      if (stockDeductionFailed) {
        if (session) {
          await session.abortTransaction();
          await session.endSession();
        } else {
          // Compensate / roll back previously decremented items
          await rollbackDeductedStock(decrementedItems);
        }
        return res.status(400).json({
          message: `Insufficient stock for "${failedItemName}". It may have just been purchased by another buyer.`
        });
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
        // SEC-02: Never mark Card/UPI as paid merely on order selection. All orders start with pending payment.
        paymentStatus: "pending",
        trackingId
      });

      const createdOrder = session ? await order.save({ session }) : await order.save();

      if (session) {
        await session.commitTransaction();
        await session.endSession();
      }

      // 6. Broadcast Real-time Order Notification to Admin and affected Seller rooms (SEC-04)
      const io = req.app.get("io");
      if (io) {
        const adminOrderPayload = {
          orderId: createdOrder._id,
          trackingId: createdOrder.trackingId,
          buyerName: req.user.name,
          totalAmount: createdOrder.totalAmount,
          itemCount: createdOrder.items.length,
          createdAt: createdOrder.createdAt
        };
        // Emit to admin room
        io.to("admin_room").emit("new_order", adminOrderPayload);

        // Emit to affected farmers in their private user rooms
        const sellerIds = [...new Set(createdOrder.items.map((it) => it.seller?.toString()).filter(Boolean))];
        for (const sellerId of sellerIds) {
          io.to(`user_${sellerId}`).emit("new_order", {
            orderId: createdOrder._id,
            trackingId: createdOrder.trackingId,
            itemCount: createdOrder.items.filter((it) => it.seller?.toString() === sellerId).length,
            createdAt: createdOrder.createdAt
          });
        }
      }

      return res.status(201).json(createdOrder);
    } catch (orderProcError) {
      if (session) {
        await session.abortTransaction();
        await session.endSession();
      } else {
        await rollbackDeductedStock(decrementedItems);
      }
      throw orderProcError;
    }
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

    // SEC-05: Enforce ownership - Farmer can only update orders where they own all items.
    // Admin authorization remains separate.
    if (req.user.role !== "admin") {
      const isSellerOfAny = order.items.some(
        (item) => item.seller?.toString() === req.user._id.toString()
      );

      if (!isSellerOfAny) {
        return res.status(403).json({
          message: "Forbidden: You are not authorized to update an order containing produce you do not sell."
        });
      }

      const isSellerOfAll = order.items.every(
        (item) => item.seller?.toString() === req.user._id.toString()
      );

      if (!isSellerOfAll) {
        return res.status(403).json({
          message: "Forbidden: This order contains items from multiple sellers. Only an administrator can update multi-seller orders."
        });
      }
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

    // Broadcast socket update targeted to Admin, Buyer, and Sellers (SEC-04)
    const io = req.app.get("io");
    if (io) {
      const statusPayload = {
        orderId: updatedOrder._id,
        trackingId: updatedOrder.trackingId,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus
      };

      io.to("admin_room").emit("order_status_updated", statusPayload);
      if (updatedOrder.buyer) {
        io.to(`user_${updatedOrder.buyer.toString()}`).emit("order_status_updated", statusPayload);
      }
      const sellerIds = [...new Set(updatedOrder.items.map((it) => it.seller?.toString()).filter(Boolean))];
      for (const sellerId of sellerIds) {
        io.to(`user_${sellerId}`).emit("order_status_updated", statusPayload);
      }
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
      const statusPayload = {
        orderId: savedOrder._id,
        trackingId: savedOrder.trackingId,
        status: savedOrder.status
      };
      io.to("admin_room").emit("order_status_updated", statusPayload);
      if (savedOrder.buyer) {
        io.to(`user_${savedOrder.buyer.toString()}`).emit("order_status_updated", statusPayload);
      }
      const sellerIds = [...new Set(savedOrder.items.map((it) => it.seller?.toString()).filter(Boolean))];
      for (const sellerId of sellerIds) {
        io.to(`user_${sellerId}`).emit("order_status_updated", statusPayload);
      }
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

// @desc    Confirm payment for an order (Explicit Development Mock Gateway Mode / Webhook)
// @route   POST /api/orders/:id/confirm-payment
// @access  Private (Consumer / Admin)
export const confirmPayment = async (req, res) => {
  try {
    const { transactionId, gateway = "MOCK_PAYMENT_GATEWAY" } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify buyer ownership or admin
    if (order.buyer.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to confirm payment for this order" });
    }

    if (order.paymentStatus === "completed") {
      return res.status(400).json({ message: "Payment is already marked as completed" });
    }

    order.paymentStatus = "completed";
    if (order.status === "pending") {
      order.status = "processing";
    }

    const savedOrder = await order.save();

    // Broadcast targeted update
    const io = req.app.get("io");
    if (io) {
      const payload = {
        orderId: savedOrder._id,
        trackingId: savedOrder.trackingId,
        paymentStatus: savedOrder.paymentStatus,
        status: savedOrder.status
      };
      io.to("admin_room").emit("order_status_updated", payload);
      io.to(`user_${savedOrder.buyer.toString()}`).emit("order_status_updated", payload);
      const sellerIds = [...new Set(savedOrder.items.map((it) => it.seller?.toString()).filter(Boolean))];
      for (const sellerId of sellerIds) {
        io.to(`user_${sellerId}`).emit("order_status_updated", payload);
      }
    }

    res.json({
      message: "Payment confirmed successfully",
      mode: "DEVELOPMENT_MOCK_SANDBOX",
      note: "Explicit development sandbox mode. For production, connect Razorpay/Stripe webhooks with cryptographic HMAC signature verification.",
      order: savedOrder,
      transactionId: transactionId || `TXN-MOCK-${Date.now()}`,
      gateway
    });
  } catch (error) {
    console.error("Confirm Payment Error:", error);
    res.status(500).json({ message: error.message || "Failed to confirm payment" });
  }
};
