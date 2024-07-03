import Order from "../models/orderModel.js";
import DeliveryStaff from "../models/deliveryStaffModel.js";
import BlackListedToken from "../models/blackListToken.js";
import User from "../models/userModel.js";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { sendOTPEmail } from "../helpers/emailHelper.js";
import { generateToken } from "../helpers/jwtHelper.js";

export const signUp = async (req, res) => {
  const { username, email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let userType = "deliveryStaff";
    let deliveryStaff = await DeliveryStaff.findOne({ email });
    console.log("deliveryStaff:", deliveryStaff);
    if (deliveryStaff) {
      return res.status(400).json({ message: "User already exists" });
    }

    //generating otp
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000;
    console.log("otp:", otp);

    //hashing password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(hashedPassword);

    deliveryStaff = new DeliveryStaff({
      username,
      email: email,
      password: hashedPassword,
      otp,
      otpExpires,
    });
    await deliveryStaff.save();
    console.log("deliveryStaff:", deliveryStaff);

    try {
      await sendOTPEmail(email, otp);
      res
        .status(200)
        .json({ message: "OTP sent to email, please verify your OTP" });
    } catch (emailError) {
      console.error(emailError.message);
      res.status(500).send("Error sending OTP");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};


export const verifyOTP = async (req, res) => {
  console.log("req.body:", req.body);
  const { otp } = req.body;

  try {
    const deliveryStaff = await DeliveryStaff.findOne({ otp });
    console.log("user:", deliveryStaff);
    if (!deliveryStaff) {
      return res.status(404).json({ message: "User not found" });
    }
    //verify OTP
    if (deliveryStaff.otp === otp && deliveryStaff.otpExpires > Date.now()) {
      (deliveryStaff.isVerified = true),
        (deliveryStaff.otp = null),
        (deliveryStaff.otpExpires = null);
      await deliveryStaff.save();

      //generate token
      await generateToken(res, deliveryStaff);

      return res.status(200).json({ message: "OTP verified successfully" });
    } else {
      return res.status(400).json({ message: "Invalid OTP or OTP expired" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("server error");
  }
};


export const login = async (req, res) => {
  console.log(req.body);
  const { email, password } = req.body;
  console.log(req.body);

  try {
    const deliveryStaff = await DeliveryStaff.findOne({ email: email });
    if (!deliveryStaff) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, deliveryStaff.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    if (!deliveryStaff.isVerified) {
      return res.status(403).json({ message: "User is not verified" });
    }
    generateToken(res, deliveryStaff);

    res.status(200).json({ message: "Login Successful" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};


export const getDeliveryData = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $nin: ["Delivered", "Cancelled"] },
    }).lean();

    if (orders.length === 0) {
      return res.status(200).json({ orders: [] });
    }

    const userIds = orders.map((order) => order.userId);

    const users = await User.find({ _id: { $in: userIds } }).lean();

    const userMap = {};
    users.forEach((user) => {
      userMap[user._id.toString()] = user.username;
    });

    const ordersWithUserDetails = orders.map((order) => ({
      ...order,
      userName: userMap[order.userId.toString()] || "Unknown User",
    }));

    console.log("ordersWithUserDetails:", ordersWithUserDetails);
    res.status(200).json({ orders: ordersWithUserDetails });
  } catch (error) {
    console.error("Error fetching delivery data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const acceptingOrder = async (req, res) => {
  const { orderId, deliveryStaffId } = req.body;
  console.log("orderId:", orderId);
  console.log("DeliveryStaffId:", deliveryStaffId);

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "Pickup";
    await order.save();

    const deliveryStaff = await DeliveryStaff.findByIdAndUpdate(
      deliveryStaffId,
      { $inc: { acceptedOrdersCount: 1 } },
      { new: true }
    );
    console.log("deliveryStaff:", deliveryStaff);

    if (!deliveryStaff) {
      return res.status(404).json({ message: "Delivery staff not found" });
    }

    deliveryStaff.acceptedOrders.push({
      foodName: order.foodName,
      userId: order.userId,
      orderId: order._id,
      dateAccepted: new Date(),
    });
    await deliveryStaff.save();

    res.status(200).json({ message: "Order accepted", order });
  } catch (error) {
    console.error("Error accepting order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const rejectOrder = async (req, res) => {
  const { orderId } = req.body;
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "cancelled";
    await order.save();

    res.status(200).json({ message: "Order rejected", order });
  } catch (error) {
    console.error("Error rejecting order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const logOut = async (req, res) => {
  const token = req.headers["authorization"].split(" ")[1];

  const blacklistedToken = new BlackListedToken({
    token,
    expiresAt: new Date(Date.now() + 3600 * 1000), // token expiry time
  });

  await blacklistedToken.save();

  res.status(200).send({ message: "Logged out successfully" });
};
