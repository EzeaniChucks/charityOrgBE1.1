import { ApiProperty, ApiResponse } from '@nestjs/swagger';

//wallet charge range req and res dto
export class walletChargeRangeDTO {
  @ApiProperty({ example: 2000 })
  to: number;

  @ApiProperty({ example: 10 })
  from: number;

  @ApiProperty({ example: 0.5 })
  percent: number;
}

export class walletChargeRangeDTOResult {
  @ApiProperty({ example: 'successful' })
  msg: string;

  @ApiProperty({
    example: {
      _id: 'mongooseGeneratedId',
      chargeRanges: [
        { from: 10, to: 100, percent: 2, _id: 'mongooseGeneratedId' },
        { from: 101, to: 1000, percent: 1 },
      ],
    },
  })
  chargeRange: object;
}

//
class SubscriptionSettingNestedDTO {
  free: object;
  gold: object;
  platinum: object;
  goldprice: {
    value: number;
    currency: string;
  };
  platinumprice: {
    value: number;
    currency: string;
  };
  expiration: {
    value: number;
    quantifier: string;
  };
}

export class setSubscriptionDTO {
  @ApiProperty({ example: 'mongooseGeneratedId1' })
  userId: string;

  @ApiProperty({
    example: {
      free: {
        dep_in_multi_eventCategories: true,
        free_participant_no: 2,
        can_add_new_category: true,
      },
      gold: {
        can_use_pledge_forms: true,
        extend_dep_comp_deadlines: true,
        dep_in_multi_eventCategories: true,
        can_use_currency_conversion: true,
        can_be_obs_or_dep: true,
        can_pick_event_currency: true,
        can_see_full_list_of_transaction: true,
        can_add_new_category: true,
        can_invite_obser_or_depos: true,
        can_transfer_money_inapp: true,
        gold_participant_no: 2,
      },
      platinum: {
        can_use_pledge_forms: true,
        can_use_currency_conversion: true,
        dep_in_multi_eventCategories: true,
        extend_dep_comp_deadlines: true,
        can_use_crypto: true,
        can_be_obs_or_dep: true,
        can_pick_event_currency: true,
        can_invite_obser_or_depos: true,
        can_add_new_category: true,
        can_see_full_list_of_transaction: true,
        can_transfer_money_inapp: true,
        platinum_participant_no: 100,
        can_pick_event_timezone: true,
        can_pick_event_privacy: true,
      },
      goldprice: {
        value: 1,
        currency: 'USD',
      },
      platinumprice: {
        value: 3,
        currency: 'USD',
      },
      expiration: {
        value: 1,
        quantifier: 'month',
      },
    },
  })
  subObj: SubscriptionSettingNestedDTO;
}

class SubscriptionSettingResponseNestedDTO {
  subscriptions: {
    free: object;
    gold: object;
    platinum: object;
    goldprice: {
      value: number;
      currency: string;
    };
    platinumprice: {
      value: number;
      currency: string;
    };
    expiration: {
      value: number;
      quantifier: string;
    };
  };
}

export class setSubscriptionResponseDTO {
  @ApiProperty({ example: 'successful' })
  msg: string;

  @ApiProperty({
    example: {
      subscriptions: {
        free: {
          dep_in_multi_eventCategories: true,
          free_participant_no: 2,
          can_add_new_category: true,
        },
        gold: {
          can_use_pledge_forms: true,
          extend_dep_comp_deadlines: true,
          dep_in_multi_eventCategories: true,
          can_use_currency_conversion: true,
          can_be_obs_or_dep: true,
          can_pick_event_currency: true,
          can_see_full_list_of_transaction: true,
          can_add_new_category: true,
          can_invite_obser_or_depos: true,
          can_transfer_money_inapp: true,
          gold_participant_no: 2,
        },
        platinum: {
          can_use_pledge_forms: true,
          can_use_currency_conversion: true,
          dep_in_multi_eventCategories: true,
          extend_dep_comp_deadlines: true,
          can_use_crypto: true,
          can_be_obs_or_dep: true,
          can_pick_event_currency: true,
          can_invite_obser_or_depos: true,
          can_add_new_category: true,
          can_see_full_list_of_transaction: true,
          can_transfer_money_inapp: true,
          platinum_participant_no: 100,
          can_pick_event_timezone: true,
          can_pick_event_privacy: true,
        },
        goldprice: {
          value: 1,
          currency: 'USD',
        },
        platinumprice: {
          value: 3,
          currency: 'USD',
        },
        expiration: {
          value: 1,
          quantifier: 'month',
        },
      },
    },
  })
  payload: SubscriptionSettingNestedDTO;
}

export class setBundleDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({
    example: [
      {
        bundleName: 'Refridgerate',
        bundleFeatures: [
          {
            featureName: 'can_use_currency_conversion',
            layFeatureName: 'Can use currency conversion',
            featureStock: 0,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_use_crypto',
            layFeatureName: 'Can use cryptocurrencies',
            featureStock: 0,
            _id: 'mongooseGenerateId',
          },
        ],
        bundlePrice: 1000,
        bundleCurrency: 'NGN',
        _id: 'mongooseGenerateId32',
      },
      {
        bundleName: 'New Bundle',
        bundleFeatures: [
          {
            featureName: 'can_use_currency_conversion',
            layFeatureName: 'Can use currency conversion',
            featureStock: 10,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_use_crypto',
            layFeatureName: 'Can use cryptocurrencies',
            featureStock: 10,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'dep_in_multi_eventCategories',
            layFeatureName: 'Can deposit in multiple event categories',
            featureStock: 10,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_use_pledge_forms',
            layFeatureName: 'Can use pledge forms',
            featureStock: 15,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'extend_dep_comp_deadlines',
            layFeatureName: 'Can extend deposit and completion deadlines',
            featureStock: 26,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_be_obs_or_dep',
            layFeatureName: 'can choose to be observer or depositor',
            featureStock: 19,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_pick_event_currency',
            layFeatureName:
              'can pick event currency different from local currency',
            featureStock: 20,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_pick_event_timezone',
            layFeatureName: 'can change event timezone different from local',
            featureStock: 17,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_invite_obser_or_depos',
            layFeatureName: 'can invite observers and depositors',
            featureStock: 30,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_add_new_category',
            layFeatureName: 'can add new category',
            featureStock: 10,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_transfer_money_inapp',
            layFeatureName: 'can transfer money in-app',
            featureStock: 10,
            _id: 'mongooseGenerateId',
          },
          {
            featureName: 'can_see_full_list_of_transaction',
            layFeatureName: 'can see full list of transaction',
            featureStock: 15,
            _id: 'mongooseGenerateId',
          },
        ],
        bundlePrice: 250,
        bundleCurrency: 'NGN',
        _id: 'mongooseGenerateId',
      },
    ],
  })
  bundleObj: [
    {
      bundleName: string;
      bundleFeatures: [
        {
          featureName: string;
          layFeatureName: string;
          featureStock: number;
          _id: string;
        },
      ];
      bundlePrice: number;
      bundleCurrency: string;
      _id: string;
    },
  ];
}

export class fetchBundleAndSubResponseDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({
    example: {
      newbundle: [
        {
          bundleName: 'Refridgerate',
          bundleFeatures: [
            {
              featureName: 'can_use_currency_conversion',
              layFeatureName: 'Can use currency conversion',
              featureStock: 0,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_use_crypto',
              layFeatureName: 'Can use cryptocurrencies',
              featureStock: 0,
              _id: 'mongooseGenerateId',
            },
          ],
          bundlePrice: 1000,
          bundleCurrency: 'NGN',
          _id: 'mongooseGenerateId32',
        },
        {
          bundleName: 'New Bundle',
          bundleFeatures: [
            {
              featureName: 'can_use_currency_conversion',
              layFeatureName: 'Can use currency conversion',
              featureStock: 10,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_use_crypto',
              layFeatureName: 'Can use cryptocurrencies',
              featureStock: 10,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'dep_in_multi_eventCategories',
              layFeatureName: 'Can deposit in multiple event categories',
              featureStock: 10,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_use_pledge_forms',
              layFeatureName: 'Can use pledge forms',
              featureStock: 15,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'extend_dep_comp_deadlines',
              layFeatureName: 'Can extend deposit and completion deadlines',
              featureStock: 26,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_be_obs_or_dep',
              layFeatureName: 'can choose to be observer or depositor',
              featureStock: 19,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_pick_event_currency',
              layFeatureName:
                'can pick event currency different from local currency',
              featureStock: 20,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_pick_event_timezone',
              layFeatureName: 'can change event timezone different from local',
              featureStock: 17,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_invite_obser_or_depos',
              layFeatureName: 'can invite observers and depositors',
              featureStock: 30,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_add_new_category',
              layFeatureName: 'can add new category',
              featureStock: 10,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_transfer_money_inapp',
              layFeatureName: 'can transfer money in-app',
              featureStock: 10,
              _id: 'mongooseGenerateId',
            },
            {
              featureName: 'can_see_full_list_of_transaction',
              layFeatureName: 'can see full list of transaction',
              featureStock: 15,
              _id: 'mongooseGenerateId',
            },
          ],
          bundlePrice: 250,
          bundleCurrency: 'NGN',
          _id: 'mongooseGenerateId',
        },
      ],
      subscriptions: {
        subscriptions: {
          free: {
            dep_in_multi_eventCategories: true,
            free_participant_no: 2,
            can_add_new_category: true,
          },
          gold: {
            can_use_pledge_forms: true,
            extend_dep_comp_deadlines: true,
            dep_in_multi_eventCategories: true,
            can_use_currency_conversion: true,
            can_be_obs_or_dep: true,
            can_pick_event_currency: true,
            can_see_full_list_of_transaction: true,
            can_add_new_category: true,
            can_invite_obser_or_depos: true,
            can_transfer_money_inapp: true,
            gold_participant_no: 2,
          },
          platinum: {
            can_use_pledge_forms: true,
            can_use_currency_conversion: true,
            dep_in_multi_eventCategories: true,
            extend_dep_comp_deadlines: true,
            can_use_crypto: true,
            can_be_obs_or_dep: true,
            can_pick_event_currency: true,
            can_invite_obser_or_depos: true,
            can_add_new_category: true,
            can_see_full_list_of_transaction: true,
            can_transfer_money_inapp: true,
            platinum_participant_no: 100,
            can_pick_event_timezone: true,
            can_pick_event_privacy: true,
          },
          goldprice: {
            value: 1,
            currency: 'USD',
          },
          platinumprice: {
            value: 3,
            currency: 'USD',
          },
          expiration: {
            value: 1,
            quantifier: 'month',
          },
        },
      },
    },
  })
  bundlenew: [
    {
      bundleName: string;
      bundleFeatures: [
        {
          featureName: string;
          layFeatureName: string;
          featureStock: number;
          _id: string;
        },
      ];
      bundlePrice: number;
      bundleCurrency: string;
      _id: string;
    },
  ];

  subscriptions: SubscriptionSettingResponseNestedDTO;
}

export class chargeRangeDeletionDTO {
  @ApiProperty({ example: 'mongooseChargeRangeDeletionId' })
  chargeRangeId: string;
}

export class chargeRangeDeletionResponseDTO extends walletChargeRangeDTOResult {}

//
export class UserDetailsForAdminMgtResponseDTO {
  @ApiProperty({ example: 'successful' })
  msg: string;

  @ApiProperty({
    example: [
      {
        _id: 'mongooseGeneratedId',
        name: `user1`,
        charities: {},
        memberships: {},
        status: 'individual',
        isVerifiedAsOrganization: false,
        verification_documents: {
          govt_issued_id: 'https://cloudinary.com/media_name',
          bank_statement: 'https://cloudinary.com/media_name',
        },
      },
      {
        _id: 'mongooseGeneratedId',
        name: `user2`,
        charities: {},
        memberships: {},
        status: 'organization',
        isVerifiedAsOrganization: false,
        verification_documents: {
          govt_issued_id: 'https://cloudinary.com/media_name',
          bank_statement: 'https://cloudinary.com/media_name',
        },
      },
      {
        _id: 'mongooseGeneratedId',
        name: `user3`,
        charities: {},
        memberships: {},
        status: 'individual',
        isVerifiedAsOrganization: false,
        verification_documents: {
          govt_issued_id: 'https://cloudinary.com/media_name',
          bank_statement: 'https://cloudinary.com/media_name',
        },
      },
    ],
  })
  payload: [
    {
      _id: string;
      name: string;
      charities: object;
      memberships: object;
      status: string;
      isVerifiedAsOrganization: boolean;
      verification_documents: {
        govt_issued_id: string;
        bank_statement: string;
      };
    },
  ];
}
