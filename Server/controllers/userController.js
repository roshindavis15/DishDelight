import User from "../models/userModel.js";
import Food from "../models/foodModel.js";
import Order from "../models/orderModel.js";
import BlackListedToken from "../models/blackListToken.js";
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
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }
   
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpires = Date.now() + 2 * 60 * 1000;
    console.log("otp:", otp);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      email: email,
      password: hashedPassword,
      otp,
      otpExpires,
    });
    await user.save();
    // sending otp via mail
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
    const user = await User.findOne({ otp });
    console.log("user:", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //verify OTP
    if (user.otp === otp && user.otpExpires > Date.now()) {
      (user.isVerified = true), (user.otp = null), (user.otpExpires = null);
      await user.save();

      //generate token
      await generateToken(res, user);

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
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: "User is not verified" });
    }
    generateToken(res, user);

    res.status(200).json({ message: "Login Successful" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};


export const getFoodData = async (req, res) => {
  try {
    const foodData = await Food.find();
    if (!foodData || foodData.length === 0) {
      return res.status(404).json({ message: "No food items found" });
    }
    // console.log(foodData, "fooddata");
    res.status(200).json(foodData);
  } catch (error) {
    console.error("Error fetching food items:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const orderFood = async (req, res) => {
  const { userId, foodId } = req.body;

  try {
    const orderedFood = await Food.findById({ _id: foodId });
    if (!orderedFood) {
      return res.status(404).json({ message: "Food not found" });
    }

    const newOrder = new Order({
      userId: userId,
      foodName: orderedFood.foodName,
      price: orderedFood.price,
      imageUrl: orderedFood.imageUrl,
      status: "Pending",
      date: new Date(),
    });

    await newOrder.save();

    res.status(201).json({ message: "Order placed successfully" });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getOrderedFoods = async (req, res) => {
  try {
    console.log("reached here");
    const { userId } = req.body;
    console.log(userId, "userid");
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userName = user.name;
    const orderedFoods = await Order.find({ userId: userId });

    if (orderedFoods.length === 0) {
      return res.status(404).json({ message: `${userName}...You don't have any orders` });
           
    }
    res .status(200) .json({ message: "Orders fetched successfully", orders: orderedFoods });
  
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const cancelOrder = async (req, res) => {
  const { status, orderId } = req.body;
  console.log("status");
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    order.status = status;
    await order.save();
    res.status(200).json({ message: "Order cancelled successfully", order });
  } catch (error) {
    console.error("Error cancelling order:", error);
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
