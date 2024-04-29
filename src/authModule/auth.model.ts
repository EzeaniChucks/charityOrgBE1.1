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
  country: {
    type: String,
    required: true,
  },
  address: { type: String, default: '' },
  profilePic: {
    type: String,
  },
  promoCode: {
    type: String,
  },
  accountBank: { type: String, default: '' },
  accountBankCode: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  accountName: { type: String, default: '' },
  accountCurrency: { type: String, default: '' },
  accountBankVerified: { type: Boolean, default: false },
  accountBankVerificationAttempts: { type: Number, default: 0 },
  bvn: String,
  accountTempInfo: {
    account_number: String,
    bvn: String,
    account_bank: String,
    legal_first_name: String,
    legal_last_name: String,
  },
  paystack_customer_code: { type: String, default: '' },
  paystack_customer_id: { type: String, default: '' },
  paystack_customer_integration: { type: String, default: '' },
  verificationToken: String,
  isVerified: { type: Boolean, default: false },
  verified: Date,
  userStatus: {
    type: String,
    default: 'individual',
    enum: ['individual', 'organization'],
  },
  is_offically_verified: { type: Boolean, default: false },
  offical_verification_bank_statement: { type: String, default: '' }, //photo link on cloudinary
  official_verification_id: { type: String, default: '' }, //photo link on cloudinary
  isAdmin: { type: Boolean, default: false },
  subscription: {
    subscription_type: { type: String, default: 'free' },
    subscription_date: { type: Date, default: new Date() },
  },
  bundle: [
    {
      bundleName: { type: String, required: true, unique: true },
      bundleFeatures: [
        {
          featureName: {
            type: String,
            required: true,
            enum: [
              'can_use_crypto',
              'can_use_currency_conversion',
              'can_use_pledge_forms',
              'dep_in_multi_eventCategories',
              'extend_dep_comp_deadlines',
              'can_be_obs_or_dep',
              'can_pick_event_currency',
              'can_pick_event_timezone',
              'can_invite_obser_or_depos',
              'can_add_new_category',
              'can_transfer_money_inapp',
              'can_see_full_list_of_transaction',
            ],
          },
          stockLeft: { type: Number, required: true, default: 0 },
        },
      ],
    },
  ],
});
