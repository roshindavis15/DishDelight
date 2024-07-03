import express from 'express';
const deliveryStaffRoutes = express.Router();
import { authenticateToken } from '../middlewares/auth.js';
import {signUp,verifyOTP,login,getDeliveryData,acceptingOrder,rejectOrder,logOut} from '../controllers/deliveryStaffController.js'
import { signUpValidation } from '../middlewares/validation.js';

deliveryStaffRoutes.post('/signUp',signUpValidation,signUp);
deliveryStaffRoutes.post('/verify-otp',verifyOTP);
deliveryStaffRoutes.post('/login',login);
deliveryStaffRoutes.get('/getDeliveryData',authenticateToken,getDeliveryData)
deliveryStaffRoutes.patch('/acceptOrder',authenticateToken,acceptingOrder);
deliveryStaffRoutes.patch('/rejectOrder',authenticateToken,rejectOrder);
deliveryStaffRoutes.post('/logOut',authenticateToken,logOut);





export default deliveryStaffRoutes;