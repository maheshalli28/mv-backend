import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({   
    firstname:{type:String, required:true},
    lastname:{type:String, required:true},
    gender:{type:String,required:true},
    dob:{type:Date,requied:true},
    email:{type:String, required:true},
    phone:{type:String, required:true},
    loantype:{type:String, default:"Home Loan"},
    bankname:{type:String, required:true},
    loanamount:{type:Number, required:true},
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    date:{type:Date, default:Date.now}
}, { timestamps: true });

const Customer = mongoose.model("Customer",CustomerSchema);
export default Customer