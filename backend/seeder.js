import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// Load models
import User from "./models/User.js";
import Product from "./models/Product.js";
import Auction from "./models/Auction.js";
import Bid from "./models/Bid.js";
import Order from "./models/Order.js";
import SystemConfig from "./models/SystemConfig.js";
import Dispute from "./models/Dispute.js";
import Notification from "./models/Notification.js";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital-farmers-market");
    console.log("Connected to MongoDB for Seeding...");
  } catch (error) {
    console.error("MongoDB Seeder Connection Error:", error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    console.log("Clearing existing database collections...");
    await User.deleteMany({});
    await Product.deleteMany({});
    await Auction.deleteMany({});
    await Bid.deleteMany({});
    await Order.deleteMany({});
    await SystemConfig.deleteMany({});
    await Dispute.deleteMany({});
    await Notification.deleteMany({});

    console.log("Creating default System Configuration...");
    await SystemConfig.create({
      maintenanceMode: false,
      allowRegistration: true,
      platformFee: 2.5,
      emailNotifications: true,
      autoApproveFarmers: false,
      debugMode: false,
    });

    console.log("Creating users (Admin, Farmers, Consumers)...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    const adminPassword = await bcrypt.hash("admin123", 10);

    const users = await User.insertMany([
      {
        name: "TerraFresh Administrator",
        email: "admin@terrafresh.com",
        password: adminPassword,
        role: "admin",
        isActive: true,
        phone: "+91 98765 00001",
      },
      {
        name: "Rajesh Kumar",
        email: "rajesh@farm.com",
        password: hashedPassword,
        role: "farmer",
        isActive: true,
        isVerified: true,
        farmName: "Green Valley Organic Farms",
        location: "Nashik, Maharashtra",
        phone: "+91 98765 43210",
        riskScore: "Low",
        documents: [
          {
            docType: "Aadhar",
            idNumber: "XXXX-XXXX-4589",
            status: "valid",
            url: "https://example.com/docs/aadhar.pdf",
          },
          {
            docType: "7/12 Land Record",
            idNumber: "LR-MH-2024-9981",
            status: "valid",
            url: "https://example.com/docs/7-12.pdf",
          },
        ],
      },
      {
        name: "Ramesh Patel",
        email: "ramesh@farm.com",
        password: hashedPassword,
        role: "farmer",
        isActive: true,
        isVerified: true,
        farmName: "Surat Agro Cooperative",
        location: "Surat, Gujarat",
        phone: "+91 98765 43211",
        riskScore: "Low",
        documents: [
          {
            docType: "Aadhar",
            idNumber: "XXXX-XXXX-7812",
            status: "valid",
            url: "https://example.com/docs/aadhar2.pdf",
          },
        ],
      },
      {
        name: "Suresh Sharma",
        email: "suresh@farm.com",
        password: hashedPassword,
        role: "farmer",
        isActive: true,
        isVerified: false, // Pending KYC verification for testing Admin Verification queue!
        farmName: "Karnal Heritage Crops",
        location: "Karnal, Haryana",
        phone: "+91 98765 43212",
        riskScore: "Medium",
        documents: [
          {
            docType: "Aadhar",
            idNumber: "XXXX-XXXX-9901",
            status: "pending",
            url: "https://example.com/docs/aadhar_pending.pdf",
          },
          {
            docType: "Kisan Credit Card",
            idNumber: "KCC-HR-5521",
            status: "pending",
            url: "https://example.com/docs/kcc.pdf",
          },
        ],
      },
      {
        name: "Amit Verma",
        email: "consumer@terrafresh.com",
        password: hashedPassword,
        role: "consumer",
        isActive: true,
        phone: "+91 91234 56789",
      },
      {
        name: "Priya Sengupta",
        email: "priya@terrafresh.com",
        password: hashedPassword,
        role: "consumer",
        isActive: true,
        phone: "+91 91234 56790",
      },
    ]);

    const adminUser = users[0];
    const farmerRajesh = users[1];
    const farmerRamesh = users[2];
    const consumerAmit = users[4];
    const consumerPriya = users[5];

    console.log("Seeding 50+ Real Agricultural Products across all categories...");

    const productDefinitions = [
      // VEGETABLES
      { name: "Roma Tomato (Tamatar)", category: "Vegetables", price: 40, unit: "kg", stock: 120, grade: "A", description: "Farm-fresh ripe red Roma tomatoes, picked at peak maturity." },
      { name: "Red Onion (Pyaaz)", category: "Vegetables", price: 30, unit: "kg", stock: 250, grade: "A+", description: "Crisp, pungent red onions dried and cured for long shelf life." },
      { name: "Potato (Aloo)", category: "Vegetables", price: 25, unit: "kg", stock: 300, grade: "A", description: "Freshly harvested soil potatoes, ideal for cooking and roasting." },
      { name: "Carrot (Gajar)", category: "Vegetables", price: 50, unit: "kg", stock: 80, grade: "Organic", description: "Sweet, crunchy red winter carrots packed with natural beta-carotene." },
      { name: "Bell Pepper (Shimla Mirch)", category: "Vegetables", price: 60, unit: "kg", stock: 45, grade: "A", description: "Vibrant green crisp capsicums grown in climate-controlled polyhouses." },
      { name: "Bitter Gourd (Karela)", category: "Vegetables", price: 45, unit: "kg", stock: 40, grade: "A", description: "Nutrient-dense dark green bitter gourds, excellent for wellness." },
      { name: "Cauliflower (Gobi)", category: "Vegetables", price: 35, unit: "kg", stock: 70, grade: "A", description: "Tender, tight-headed snow-white cauliflower florets." },
      { name: "Okra (Bhindi)", category: "Vegetables", price: 40, unit: "kg", stock: 60, grade: "A", description: "Tender, soft green lady fingers harvested early morning." },
      { name: "Purple Eggplant (Baingan)", category: "Vegetables", price: 30, unit: "kg", stock: 85, grade: "Standard", description: "Glossy purple brinjals perfect for bharta and curries." },
      { name: "Green Beans (Phali)", category: "Vegetables", price: 50, unit: "kg", stock: 50, grade: "A", description: "Crisp, stringless tender French beans." },
      { name: "Fresh Ginger (Adrak)", category: "Vegetables", price: 120, unit: "kg", stock: 90, grade: "A+", description: "Aromatic, fiber-rich mountain ginger rhizomes." },
      { name: "Garlic (Lehsun)", category: "Vegetables", price: 150, unit: "kg", stock: 110, grade: "A+", description: "Strong pungent garlic bulbs cured under natural sunlight." },
      { name: "Baby Spinach (Palak)", category: "Vegetables", price: 20, unit: "bunch", stock: 100, grade: "Organic", description: "Tender iron-rich hydroponic baby spinach leaves." },
      { name: "Coriander Leaves (Dhaniya)", category: "Vegetables", price: 15, unit: "bunch", stock: 140, grade: "Fresh", description: "Fragrant lush green coriander bunch harvested today." },
      { name: "Green Chili (Hari Mirch)", category: "Vegetables", price: 80, unit: "kg", stock: 35, grade: "A", description: "Spicy, fresh green chilies with intense flavor." },
      { name: "Cucumber (Kheera)", category: "Vegetables", price: 30, unit: "kg", stock: 110, grade: "A", description: "Cool, crunchy salad cucumbers with high water content." },
      { name: "Cabbage (Patta Gobi)", category: "Vegetables", price: 30, unit: "kg", stock: 95, grade: "A", description: "Dense, fresh green cabbage heads." },
      { name: "Sweet Corn (Bhutta)", category: "Vegetables", price: 15, unit: "pc", stock: 200, grade: "A+", description: "Sweet golden corn cobs fresh from the stalk." },
      { name: "Beetroot (Chukandar)", category: "Vegetables", price: 40, unit: "kg", stock: 80, grade: "A", description: "Earthy, nutrient-packed dark crimson beetroots." },
      { name: "White Radish (Mooli)", category: "Vegetables", price: 20, unit: "kg", stock: 75, grade: "A", description: "Crisp peppery white radishes with tender edible tops." },

      // FRUITS
      { name: "Alphonso Mangoes (Hapus)", category: "Fruits", price: 600, unit: "dozen", stock: 40, grade: "Export Quality", description: "GI-tagged Ratnagiri Alphonso mangoes, rich, creamy, and aromatic." },
      { name: "Kashmir Royal Gala Apples", category: "Fruits", price: 160, unit: "kg", stock: 150, grade: "A+", description: "Handpicked crisp sweet mountain apples from Sopore orchards." },
      { name: "Nagpur Oranges (Santra)", category: "Fruits", price: 70, unit: "kg", stock: 180, grade: "A", description: "Juicy sweet and tangy citrus oranges from Maharashtra." },
      { name: "Robusta Bananas", category: "Fruits", price: 50, unit: "dozen", stock: 90, grade: "A", description: "Naturally ripened sweet bananas free of carbide." },
      { name: "Sweet Green Grapes", category: "Fruits", price: 90, unit: "kg", stock: 65, grade: "A+", description: "Seedless, juicy sweet green grapes from Nashik vineyards." },
      { name: "Ruby Pomegranate (Anaar)", category: "Fruits", price: 140, unit: "kg", stock: 55, grade: "A+", description: "Large deep-red arils bursting with antioxidant juice." },
      { name: "Fresh Papaya (Papita)", category: "Fruits", price: 40, unit: "kg", stock: 60, grade: "Organic", description: "Sweet golden-orange farm papayas, rich in papain enzymes." },
      { name: "Fresh Guava (Amrood)", category: "Fruits", price: 50, unit: "kg", stock: 70, grade: "A", description: "Crisp white-fleshed Allahabad Safeda guavas." },

      // GRAINS & CEREALS
      { name: "Traditional Basmati Rice", category: "Grains", price: 120, unit: "kg", stock: 500, grade: "A+", description: "Aged long-grain aromatic Dehradun Basmati rice." },
      { name: "Sharbati Whole Wheat Atta", category: "Grains", price: 55, unit: "kg", stock: 400, grade: "Organic", description: "Stone-ground golden Sehore Sharbati wheat flour." },
      { name: "Yellow Moong Dal (Split)", category: "Grains", price: 110, unit: "kg", stock: 220, grade: "Organic", description: "Unpolished, naturally processed high-protein yellow lentils." },
      { name: "Toor / Arhar Dal", category: "Grains", price: 140, unit: "kg", stock: 190, grade: "A+", description: "Unpolished organic pigeon pea dal, free of added coloring." },
      { name: "Organic Rolled Oats", category: "Grains", price: 95, unit: "kg", stock: 150, grade: "Organic", description: "100% whole grain rolled oats for wholesome breakfast bowls." },
      { name: "Pearl Millet (Bajra)", category: "Grains", price: 45, unit: "kg", stock: 200, grade: "A", description: "Heritage drought-resistant millet packed with iron and calcium." },

      // DAIRY
      { name: "A2 Gir Cow Fresh Raw Milk", category: "Dairy", price: 85, unit: "liter", stock: 60, grade: "A2 Pure", description: "Pure unpasteurized single-origin A2 milk from free-grazing indigenous cows." },
      { name: "Desi Gir Cow Bilona Ghee", category: "Dairy", price: 950, unit: "kg", stock: 35, grade: "A2 Vedic", description: "Traditional clay-pot curd-churned golden Bilona ghee." },
      { name: "Fresh Farm Malai Paneer", category: "Dairy", price: 360, unit: "kg", stock: 40, grade: "A+", description: "Soft, spongy whole-milk cottage cheese made fresh daily." },
      { name: "Artisanal Thick Cow Dahi", category: "Dairy", price: 75, unit: "kg", stock: 50, grade: "Natural", description: "Probiotic rich, naturally set curd with creamy texture." },

      // ORGANIC STAPLES
      { name: "Cold-Pressed Kachi Ghani Mustard Oil", category: "Organic", price: 195, unit: "liter", stock: 130, grade: "Organic", description: "Cold-pressed wood churned mustard oil retaining natural antioxidants." },
      { name: "Raw Wildflower Forest Honey", category: "Organic", price: 450, unit: "kg", stock: 60, grade: "Pure Wild", description: "Unfiltered, unheated forest honey harvested sustainably." },
      { name: "Organic Jaggery Powder (Gud)", category: "Organic", price: 80, unit: "kg", stock: 140, grade: "Organic", description: "Chemical-free evaporated sugarcane juice powder." },
      { name: "Natural Himalayan Pink Salt", category: "Organic", price: 40, unit: "kg", stock: 200, grade: "Natural", description: "Mineral-rich unrefined rock salt crystals." },

      // HERBS & SPICES
      { name: "Kashmiri Mongra Saffron (Kesar)", category: "Spices", price: 350, unit: "gram", stock: 50, grade: "Grade 1", description: "Hand-harvested pure crimson stigmas from Pampore saffron fields." },
      { name: "Malabar Whole Black Pepper", category: "Spices", price: 650, unit: "kg", stock: 90, grade: "A+", description: "Tellicherry bold black peppercorns with intense aroma." },
      { name: "Green Cardamom Pods (Elaichi)", category: "Spices", price: 1800, unit: "kg", stock: 30, grade: "8mm Bold", description: "Extra-large fragrant green cardamom from Idukki hills." },
      { name: "Fresh Hydroponic Mint (Pudina)", category: "Herbs", price: 15, unit: "bunch", stock: 120, grade: "Fresh", description: "Crisp aromatic garden mint leaves." },
      { name: "Fresh Culinary Basil (Tulsi)", category: "Herbs", price: 25, unit: "bunch", stock: 80, grade: "Organic", description: "Aromatic Italian and Holy basil leaves picked fresh." },

      // SEEDS & PLANTS
      { name: "Hybrid Tomato F1 Seeds", category: "Seeds", price: 450, unit: "pack", stock: 80, grade: "High Yield", description: "Disease-resistant indeterminate tomato seeds with 90% germination." },
      { name: "Basmati Seed Grain (Pusa 1121)", category: "Seeds", price: 1200, unit: "kg", stock: 100, grade: "Certified", description: "Certified foundation seed for premium long-grain paddy farming." },
      { name: "Grafted Alphonso Mango Sapling", category: "Seeds", price: 150, unit: "pc", stock: 60, grade: "Nursery", description: "1-year hardened grafted mango plant ready for farm plantation." },

      // EXOTIC PRODUCE
      { name: "Indian Dragon Fruit (Kamalam)", category: "Exotic", price: 120, unit: "pc", stock: 75, grade: "A+", description: "Vibrant pink-fleshed dragon fruit cultivated in Kutch orchards." },
      { name: "Fresh Hass Avocado", category: "Exotic", price: 220, unit: "pc", stock: 45, grade: "Export", description: "Creamy, nutrient-rich ripe avocados grown in South Indian hills." },
      { name: "Fresh Button Mushrooms", category: "Exotic", price: 55, unit: "pack", stock: 110, grade: "A", description: "Plump, closed-cap white button mushrooms in 200g packs." }
    ];

    const productsToInsert = productDefinitions.map((p, idx) => ({
      ...p,
      seller: idx % 2 === 0 ? farmerRajesh._id : farmerRamesh._id,
      images: [
        `https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=400&auto=format&fit=crop`,
      ],
      harvestDate: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)),
      rating: +(4.5 + Math.random() * 0.5).toFixed(1),
      reviewsCount: Math.floor(10 + Math.random() * 50),
    }));

    const createdProducts = await Product.insertMany(productsToInsert);
    console.log(`Successfully seeded ${createdProducts.length} products.`);

    console.log("Creating Active Live Auctions & Bid Histories...");
    const auctionProduct1 = createdProducts[0]; // Tomato
    const auctionProduct2 = createdProducts[20]; // Mango
    const auctionProduct3 = createdProducts[28]; // Basmati Rice

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const auction1 = await Auction.create({
      product: auctionProduct1._id,
      seller: farmerRajesh._id,
      startingPrice: 35,
      currentPrice: 48,
      bidIncrement: 2,
      highestBidder: consumerAmit._id,
      startTime: new Date(),
      endTime: tomorrow,
      status: "active",
    });

    const auction2 = await Auction.create({
      product: auctionProduct2._id,
      seller: farmerRajesh._id,
      startingPrice: 500,
      currentPrice: 620,
      bidIncrement: 20,
      highestBidder: consumerPriya._id,
      startTime: new Date(),
      endTime: dayAfter,
      status: "active",
    });

    const auction3 = await Auction.create({
      product: auctionProduct3._id,
      seller: farmerRamesh._id,
      startingPrice: 100,
      currentPrice: 115,
      bidIncrement: 5,
      highestBidder: consumerAmit._id,
      startTime: new Date(),
      endTime: tomorrow,
      status: "active",
    });

    // Seed Bids for auctions
    await Bid.insertMany([
      { auction: auction1._id, bidder: consumerPriya._id, amount: 40, timestamp: new Date(Date.now() - 3600000) },
      { auction: auction1._id, bidder: consumerAmit._id, amount: 44, timestamp: new Date(Date.now() - 1800000) },
      { auction: auction1._id, bidder: consumerPriya._id, amount: 46, timestamp: new Date(Date.now() - 600000) },
      { auction: auction1._id, bidder: consumerAmit._id, amount: 48, timestamp: new Date(Date.now() - 60000) },
      { auction: auction2._id, bidder: consumerAmit._id, amount: 550, timestamp: new Date(Date.now() - 7200000) },
      { auction: auction2._id, bidder: consumerPriya._id, amount: 620, timestamp: new Date(Date.now() - 1200000) },
      { auction: auction3._id, bidder: consumerAmit._id, amount: 115, timestamp: new Date(Date.now() - 300000) },
    ]);

    console.log("Seeding Delivered Orders for Revenue & Analytics verification...");
    await Order.insertMany([
      {
        buyer: consumerAmit._id,
        items: [
          {
            product: createdProducts[0]._id,
            name: createdProducts[0].name,
            quantity: 5,
            price: createdProducts[0].price,
            image: createdProducts[0].images[0],
            unit: createdProducts[0].unit,
          },
          {
            product: createdProducts[1]._id,
            name: createdProducts[1].name,
            quantity: 3,
            price: createdProducts[1].price,
            image: createdProducts[1].images[0],
            unit: createdProducts[1].unit,
          },
        ],
        subtotal: 290,
        tax: 14.5,
        deliveryFee: 40,
        platformFee: 7.25, // 2.5% of subtotal
        totalAmount: 344.5,
        shippingAddress: {
          name: "Amit Verma",
          phone: "+91 91234 56789",
          email: "consumer@terrafresh.com",
          address: "Flat 402, Green Acres, Powai",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400076",
        },
        status: "delivered",
        paymentMethod: "UPI",
        paymentStatus: "completed",
        trackingId: "TRK-MH-9921",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        buyer: consumerPriya._id,
        items: [
          {
            product: createdProducts[20]._id, // Alphonso Mangoes
            name: createdProducts[20].name,
            quantity: 2,
            price: createdProducts[20].price,
            image: createdProducts[20].images[0],
            unit: createdProducts[20].unit,
          },
        ],
        subtotal: 1200,
        tax: 60,
        deliveryFee: 0,
        platformFee: 30, // 2.5% fee
        totalAmount: 1260,
        shippingAddress: {
          name: "Priya Sengupta",
          phone: "+91 91234 56790",
          email: "priya@terrafresh.com",
          address: "B-12, Sector 14, Vashi",
          city: "Navi Mumbai",
          state: "Maharashtra",
          pincode: "400703",
        },
        status: "completed",
        paymentMethod: "Credit Card",
        paymentStatus: "completed",
        trackingId: "TRK-MH-7712",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ]);

    console.log("Seeding initial Notification...");
    await Notification.create({
      title: "New Farmer Pending Verification",
      message: "Farmer Suresh Sharma has submitted KYC documents and awaits approval.",
      type: "warning",
      link: "/admin/farmer-verification",
    });

    console.log("\n========================================================");
    console.log("🌱 TERRAFRESH SEEDING COMPLETED SUCCESSFULLY! 🌱");
    console.log("========================================================");
    console.log("DEMO ACCOUNTS READY FOR TESTING:");
    console.log("1. Administrator : admin@terrafresh.com     | admin123");
    console.log("2. Farmer (Valid): rajesh@farm.com          | password123");
    console.log("3. Farmer (KYC)  : suresh@farm.com          | password123");
    console.log("4. Consumer      : consumer@terrafresh.com  | password123");
    console.log("========================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Seeding Failed:", error);
    process.exit(1);
  }
};

seedData();
