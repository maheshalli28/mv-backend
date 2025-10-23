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
    accountnumber:{type:String, required:true},
    ifsccode:{type:String, required:true}, 
    loanamount:{type:Number, required:true},
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    date:{type:Date, default:Date.now}
}, { 
    timestamps: true,
    // Add indexes for faster queries
    indexes: [
        { email: 1, phone: 1 }, // For profile lookup (email + phone)
        { status: 1 }, // For filtering by status
        { createdAt: 1 }, // For date filtering and sorting
        { loantype: 1 }, // For loan type filtering
        { loanamount: 1 }, // For amount range filtering
        { firstname: "text", lastname: "text", email: "text" } // For text search
    ]
});

const Customer = mongoose.model("Customer",CustomerSchema);
export default Customer