import express from 'express';
const userRoutes = express.Router();
import { signUp,verifyOTP,login,getFoodData,orderFood,getOrderedFoods,cancelOrder,logOut } from '../controllers/userController.js';
import { signUpValidation } from '../middlewares/validation.js';
import { authenticateToken } from '../middlewares/auth.js';


userRoutes.post('/signUp',signUpValidation,signUp);
userRoutes.post('/verify-otp',verifyOTP);
userRoutes.post('/login',login);
userRoutes.get('/getFoodData',authenticateToken,getFoodData);
userRoutes.post('/order',authenticateToken,orderFood);
userRoutes.get('/getOrderedFoods',authenticateToken,getOrderedFoods);
userRoutes.patch('/cancelOrder',authenticateToken,cancelOrder);
userRoutes.post('/logOut',logOut);

export default userRoutes;