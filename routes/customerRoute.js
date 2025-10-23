
import express from "express";
import dotenv from "dotenv";
import Customer from "../models/Customer.js";
import { sendEmail } from "../utils/sendEmail.js";
import { adminAuth } from "../middleware/adminAuth.js";

dotenv.config();

const router = express.Router();

/**
 * @route GET /api/customers/stats
 * @desc Get customer status counts and loan totals (overall and monthwise)
 * @access Admin
 */
router.get("/stats", adminAuth, async (req, res) => {
  try {
    // Single optimized aggregation query for overall stats
    const currentYear = new Date().getFullYear();
    
    const [overallStats, monthwiseStats] = await Promise.all([
      // Overall stats in single query
      Customer.aggregate([
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            approvedCount: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
            totalLoanAmount: { $sum: "$loanamount" }
          }
        }
      ]),
      // Monthwise stats for current year
      Customer.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31, 23, 59, 59, 999)
            }
          }
        },
        {
          $group: {
            _id: { month: { $month: "$createdAt" } },
            approved: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
            },
            rejected: {
              $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
            },
            loanTotal: { $sum: "$loanamount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.month": 1 } }
      ])
    ]);

    const stats = overallStats[0] || {
      totalCustomers: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      totalLoanAmount: 0
    };

    res.json({
      ...stats,
      monthwise: monthwiseStats
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

/**
 * @route POST /api/customers/register
 * @desc Register a new customer (optimized)
 */
router.post("/register", async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      gender,
      dob,
      email,
      phone,
      address,
      bankname,
      accountnumber,
      ifsccode,
      loantype,
      loanamount,
    } = req.body;

    // Validate inputs
    if (!firstname || !email || !phone || !accountnumber || !ifsccode) {
      return res
        .status(400)
        .json({ message: "Firstname, Email, Phone, Account Number, and IFSC Code are required" });
    }

    // Check if email or phone already exists
    const existing = await Customer.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(400).json({
        message: "Customer already exists with this email or phone number",
      });
    }

    // Create new customer
    const customer = await Customer.create({
      firstname,
      lastname,
      gender,
      dob,
      email,
      phone,
      address,
      bankname,
      accountnumber,
      ifsccode,
      loantype,
      loanamount,
    });

    // ✅ Respond immediately (non-blocking)
    res.status(201).json({
      message: "Customer registered successfully",
      customer,
    });

    // ⚙️ Background tasks (non-blocking)
    setImmediate(async () => {
      try {
        // 1️⃣ Send welcome email
        const emailTemplate = `
        <td style="font-family: Arial, sans-serif; padding: 15px; background-color: #f9f9f9; border: 1px solid #dddddd;">
          <p style="font-size: 16px; color: #333333;">
            Dear <strong>${firstname} ${lastname},</strong>,
          </p>
          <p style="font-size: 16px; color: #333333;">Thank you for registering at MV Associates. We have received your details and will process your loan application shortly.</p>
          <p style="font-size: 16px; color: #333333;">Email: <strong>${email}</strong></p>
          <p style="font-size: 16px; color: #333333;">Phone: <strong>${phone}</strong></p>
          <a style="font-size: 16px; color: #1976d2;" href="https://mvassociates.org/login">Login Here</a>

          <p style="font-size: 16px; color: #333333;">If you have any questions or concerns, feel free to reach out to us using the contact information below.</p>

          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">

          <p style="font-size: 14px; color: #555555;">
            🌐 Website: <a href="https://www.mvassociates.org" style="color: #1976d2;">www.mvassociates.org</a><br>
            📧 Email: <a href="mailto:mvassociates.org@gmail.com" style="color: #1976d2;">mvassociates.org@gmail.com</a><br>
            📞 Phone: +91 8247675651
          </p>

          <p style="font-size: 14px; color: #555555;">
            Thank you for choosing <strong>MV Associates</strong>. We appreciate your trust in our services.
          </p>

          <p style="font-size: 14px; color: #999999;">&copy; 2025 MV Associates. All rights reserved.</p>
        </td>`;

        await sendEmail(
          email,
          "Welcome to MV Associates - Registration Successful",
          emailTemplate
        );

        // 2️⃣ Emit socket event (if Socket.io is set)
        if (req.io) {
          process.nextTick(() => {
            req.io.emit("newCustomer", customer);
          });
        }
      } catch (bgError) {
        console.error("Background task error:", bgError.message);
      }
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ message: "Invalid registration", error: error.message });
  }
});



/**
 * @route GET /api/customers/profile
 * @desc Get customer profile by email & phone
 */
router.get("/profile", async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email || !phone) {
      return res
        .status(400)
        .json({ message: "Email and phone are required" });
    }

    const customer = await Customer.findOne({ email, phone });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

/**
 * @route GET /api/customers/all
 * @desc Get all customers with pagination (Admin only)
 */
router.get("/all", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    // Execute queries in parallel for better performance
    const [customers, total] = await Promise.all([
      Customer.find()
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance
      Customer.countDocuments()
    ]);

    res.status(200).json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

/**
 * @route PUT /api/customers/update/:id
 * @desc Update customer details (Admin only, including status)
 */
router.put("/update/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(id, updates, {
      new: true,
    });

    res.status(200).json({
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Delete Customer data

router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Perform actual deletion
    await Customer.findByIdAndDelete(id);

    res.status(200).json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});



/**
 * @route GET /api/customers/search
 * @desc Search customer records by name, email, or phone
 * @access Public (or Admin based on your system)
 */
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }

    const regex = new RegExp(q, "i"); // case-insensitive

    const customers = await Customer.find({
      $or: [
        { firstname: regex },
        { lastname: regex },
        { email: regex },
        { phone: regex },
      ],
    });

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


/**
 * @route GET /api/customers/filter
 * @desc Filter customers by date, loantype, loanamount range, and status
 */
router.get("/filter", async (req, res) => {
  try {
    const { month, year, loantype, minAmount, maxAmount, status } = req.query;

    const filter = {};

    // Filter by month/year
    if (month || year) {
      const start = new Date(
        year || new Date().getFullYear(),
        month ? parseInt(month) - 1 : 0,
        1
      );
      const end = new Date(
        year || new Date().getFullYear(),
        month ? parseInt(month) : 12,
        0,
        23, 59, 59, 999
      );
      filter.createdAt = { $gte: start, $lte: end };
    }

    // Filter by loantype
    if (loantype) {
      filter.loantype = loantype;
    }

    // Filter by loanamount range
    if (minAmount || maxAmount) {
      filter.loanamount = {};
      if (minAmount) filter.loanamount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.loanamount.$lte = parseFloat(maxAmount);
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    const customers = await Customer.find(filter);
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// In routes/customerRoutes.js
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error) {

    res.status(500).json({ message: "Server error", error });
  }

});
export default router;
