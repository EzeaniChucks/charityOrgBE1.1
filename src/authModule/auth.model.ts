import * as mongoose from 'mongoose';

export const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  promoCode: {
    type: String,
  },
  // cardNumber: Number,
  // expirationDate: Date,
  // cvv: Number,
  accountBank: { type: String, default: '' },
  accountBankCode: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  accountName: { type: String, default: '' },
  accountCurrency: { type: String, default: '' },
  accountBankVerified: { type: Boolean, default: false },
  accountBankVerificationAttempts: { type: Number, default: 0 },
  paystack_customer_code:{type:String, default:''},
  paystack_customer_id:{type:String, default:''},
  paystack_customer_integration:{type:String, default:''},
  verificationToken: String,
  isVerified: { type: Boolean, default: false },
  verified: Date,
  userStatus:{type:String, default:'individual', enum:['individual', 'organization']},
  is_offically_verified:{type:Boolean, default:false},
  offical_verification_bank_statement:{type:String, default:''},
  official_verification_id:{type:String, default:''},
  isAdmin: { type: Boolean, default: false },
});
