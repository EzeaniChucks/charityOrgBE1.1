import * as mongoose from 'mongoose';

export const adminSchema = new mongoose.Schema({
  chargeRanges: [{ to: Number, from: Number, percent: Number }],
  globalRequestTimeLimit: String,
  globalDisputeTimeLimit: String,
  subscription: {
    free: { type: Object, default: {} },
    gold: { type: Object, default: {} },
    platinum: { type: Object, default: {} },
    goldprice: {
      value: { type: Number, default: 0 },
      currency: { type: String },
    },
    platinumprice: {
      value: { type: Number, default: 0 },
      currency: { type: String },
    },
    expiration: {
      value: { type: Number || String, default: 1 },
      quantifier: {
        type: String,
        default: 'month',
        enum: [
          'hour',
          'hours',
          'day',
          'days',
          'month',
          'months',
          'year',
          'years',
        ],
      },
    },
  },
  bundle_prices: {
    can_use_crypto: {
      value: { type: Number, default: 0 },
      currency: { type: String },
    },
    can_use_currency_conversion: {
      value: { type: Number, default: 0 },
      currency: { type: String },
    },
    can_use_pledge_forms: {
      value: { type: Number, default: 0 },
      currency: { type: String },
    },
    dep_in_multi_eventCategories: {
      value: { type: Number, default: 0 },
      currency: { type: String },
    },
    extend_dep_comp_deadlines: {
      value: { type: Number, default: 0 },
      currency: { type: String },
    },
  },
  bundle_settings: [
    {
      bundleName: { type: String, required: true },
      bundleFeatures: [
        {
          featureName: {
            type: String,
            enum: [
              'can_use_crypto',
              'can_use_currency_conversion',
              'can_use_pledge_forms',
              'dep_in_multi_eventCategories',
              'extend_dep_comp_deadlines',
              'can_be_obs_or_dep',
              'can_pick_event_currency',
              'can_pick_event_timezone',
              'can_pick_event_privacy',
              'can_invite_obser_or_depos',
              'can_add_new_category',
              'can_transfer_money_inapp',
              'can_see_full_list_of_transaction',
            ],
            required: true,
          },
          layFeatureName: { type: String },
          featureStock: { type: Number, required: true },
        },
      ],
      bundlePrice: { type: Number, required: true },
      bundleCurrency: { type: String, required: true },
    },
  ],
});