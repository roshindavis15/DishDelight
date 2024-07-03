import mongoose from "mongoose";

const deliveryStaffSchema=new mongoose.Schema({
    username: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      password: {
        type: String,
        required: true
      },
      acceptedOrdersCount: {
        type: Number,
        default: 0
      },
      otp:{
        type:String
      },
      otpExpires:{
        type:Date
      },
      isVerified:{
        type:Boolean,
        default:false
    },
      acceptedOrders: [
        {
          foodName: String,
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
          },
          dateAccepted: {
            type: Date,
            default: Date.now
          }
        }
      ]
    
    
});

export default mongoose.model("DeliveryStaff",deliveryStaffSchema);
