import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import BlackListedToken from '../models/blackListToken.js';
dotenv.config();

export const authenticateToken = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    console.log("tokenn:", token);

    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        
        const blacklistedToken = await BlackListedToken.findOne({ token });
        if (blacklistedToken) {
            return res.status(401).send({ message: 'Token is blacklisted' });
        }

        // Verifying the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("decoded:", decoded);

        req.user = decoded.user;
        console.log("req.user:", req.user);

        next();
    } catch (error) {
        
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ message: 'Token has expired' });
        } else if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ message: 'Token is not valid' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
};