import Admin from '../models/adminModel.js';
import Food from '../models/foodModel.js';
import Order from '../models/orderModel.js'
import User from '../models/userModel.js';
import DeliveryStaff from '../models/deliveryStaffModel.js'
import BlackListedToken from '../models/blackListToken.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../helpers/jwtHelper.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretKey = process.env.SECRET;
const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },

  region: bucketRegion,
});



export const signUp = async (req, res) => {
    console.log("readdd");
    const { email, password } = req.body;
  console.log(email);
  console.log(password);
    try {
    
      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = new Admin({
        email,
        password: hashedPassword,
      });
  
      const result = await newAdmin.save();
  
      res.status(201).json({ message: "Admin created successfully", admin: result });
        
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };


  export const addFoodData=async(req,res)=>{
    try {
      console.log("req.body:", req.body);
      console.log("req.file:", req.file);
  
      const params = {
        Bucket: bucketName,
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: "public-read",
      };
      const command = new PutObjectCommand(params);
      console.log("command:", command);
  
      await s3.send(command);
      const imageUrl = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${req.file.originalname}`;
      const { foodName, description, price } = req.body;
  
      const data = await Food.create({
        foodName,
        description,
        price,
        imageUrl: imageUrl,
      });
      console.log("dataaaa:", data);
  
      console.log("imageUrl:", imageUrl);
      res.status(200).json({ message: "food data added successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
      console.log(error, "error");
    }
  }


  export const login=async(req,res)=>{
    const { email, password } = req.body;
  
  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    generateToken(res, admin);
    res.status(200).json({ message: "Login successful", admin });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
  };


  export const getUserData=async(req,res)=>{
    try {
      console.log("reached here");
      const userData = await User.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "userId",
            as: "orders",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            ordersCount: { $size: "$orders" }, 
          },
        },
      ]);
      console.log("userData:", userData);
      res.status(200).json(userData);
    } catch (err) {
      console.error("Error fetching user data:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };


export const getDeliveryStaffData=async(req,res)=>{
  try {
    const deliveryStaffData = await DeliveryStaff.aggregate([
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          acceptedOrdersCount: {
            $cond: {
              if: { $isArray: "$acceptedOrders" },
              then: { $size: "$acceptedOrders" },
              else: 0, 
            },
          },
        },
      },
    ]);

    res.status(200).json(deliveryStaffData);
  } catch (err) {
    console.error("Error fetching deliveryStaffData data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const viewUserDetails=async(req,res)=>{
  try {
    const { userId } = req.body; 

    console.log("userId:", userId);


    const userOrders = await Order.find({ userId: userId })
      .select("_id foodName imageUrl status price")
      .lean();

    console.log("userOrders:", userOrders);

    if (!userOrders || userOrders.length === 0) {
      return res.status(404).json({ message: "No orders found for the user" });
    }

    const formattedOrders = userOrders.map((order) => ({
      orderId: order._id,
      foodName: order.foodName,
      imageUrl: order.imageUrl,
      status: order.status,
      price: order.price,
    }));

    res.status(200).json(formattedOrders);
  } catch (err) {
    console.error("Error fetching user activity:", err);
    res.status(500).json({ message: "Internal server error" });
  }
  };

  export const viewDeliveryStaffDetails = async (req, res) => {
    const { deliveryStaffId } = req.body;
    console.log("deliveryStaffId:", deliveryStaffId);
  
    if (!deliveryStaffId) {
      return res.status(400).json({ message: "deliveryStaff is required" });
    }
  
    try {
      const deliveryStaff = await DeliveryStaff.findById(deliveryStaffId)
        .populate('acceptedOrders.userId', 'username')
        .populate('acceptedOrders.orderId', 'status');
      
      console.log("deliveryStaff:", deliveryStaff);
  
      if (!deliveryStaff) {
        return res.status(404).json({ message: "deliveryStaff not found" });
      }
  
      const deliveryStaffDetails = deliveryStaff.acceptedOrders.map((order) => ({
        orderId: order.orderId._id,
        orderedPerson: order.userId.username,
        orderedFood: order.foodName,
        orderAcceptedDate: order.dateAccepted,
        orderStatus: order.orderId.status,
      }));
  
      console.log("deliveryStaffDetails:", deliveryStaffDetails);
  
      res.status(200).json(deliveryStaffDetails);
    } catch (error) {
      console.error("Error fetching deliveryStaffDetails:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };


  export const orderStatusUpdate=async(req,res)=>{
    const { orderId, status } = req.body;
    
    try {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId },
        { status: status },
        { new: true } 
      );
  
      console.log("updatedOrder:", updatedOrder);
  
      if (!updatedOrder) {
        console.log("not updating");
        return res.status(404).json({ error: "Order not found" });
      }
  
      res.json(updatedOrder); 
    } catch (error) {
      console.error("Failed to update order status", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  };

  export const logOut = async (req, res) => {
    const token = req.headers['authorization'].split(' ')[1];
  
    const blacklistedToken = new BlackListedToken({
      token,
      expiresAt: new Date(Date.now() + 3600 * 1000), // token expiry time
    });
  
    await blacklistedToken.save();
  
    res.status(200).send({ message: 'Logged out successfully' });
  };
  