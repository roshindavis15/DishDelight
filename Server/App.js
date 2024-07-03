import express from 'express';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import deliveryStaffRoutes from './routes/deliveryStaffRoute.js'




connectDB();

const app=express();
app.use(express.json())
app.use('/',userRoutes);
app.use('/admin', adminRoutes);
app.use('/deliveryStaff',deliveryStaffRoutes)


app.use("/",(req,res,next)=>{
    res.send("Hello world")
});


const PORT=process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});