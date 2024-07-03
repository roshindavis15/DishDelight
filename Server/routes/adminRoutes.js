import express from 'express';
const adminRoutes=express.Router();
import { signUp,addFoodData,login,getUserData,getDeliveryStaffData,viewUserDetails,viewDeliveryStaffDetails,orderStatusUpdate,logOut } from '../controllers/adminController.js';
import { authenticateToken } from '../middlewares/auth.js';
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


adminRoutes.post('/signUp',signUp);
adminRoutes.post('/login',login);
adminRoutes.post('/addFoodData',authenticateToken,upload.single('photo'),addFoodData);
adminRoutes.get('/getUserData',authenticateToken,getUserData);
adminRoutes.get('/getDeliveryStaffData',authenticateToken,getDeliveryStaffData);
adminRoutes.get('/viewUserDetails',authenticateToken,viewUserDetails);
adminRoutes.get('/viewDeliveryStaffDetails',authenticateToken,viewDeliveryStaffDetails);
adminRoutes.patch('/orderStatusUpdate',authenticateToken,orderStatusUpdate);
adminRoutes.post('/logOut',authenticateToken,logOut);




export default adminRoutes;