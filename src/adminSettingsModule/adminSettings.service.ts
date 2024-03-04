import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import * as cryptos from 'crypto';
import { Model } from 'mongoose';
import { PaymentController } from 'src/paymentModule/payment.controller';
import { PaymentService } from 'src/paymentModule/payment.service';
import { Response } from 'express';
import { chargeRangeDeletionDTO } from './adminSettings.dto';

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectModel('adminsettings') private Admin: Model<any>,
    @InjectModel('CharityAppUsers') private user: Model<any>,
    @InjectModel('events') private event: Model<any>,
    @InjectModel('membership') private membership: Model<any>,
    private paymentservice: PaymentService,
  ) {}

  async confirmAdminStatus(req: any) {
    try {
      // console.log(req?.decodedAdmin)
      if (req?.decodedAdmin.isAdmin) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  async fetchUserDetailsForAdminManagement(req: any, res: Response) {
    try {
      if (req?.decodedAdmin?.isAdmin === false) {
        return res
          .status(400)
          .json({ msg: 'unsuccessful', payload: 'unauthorized access' });
      }
      let users = await this.user.find({});
      let finalUserArray = [];
      const userlooping = users.map(async (eachUser: any) => {
        const charities = await this.event
          .find({ creatorId: eachUser._id })
          .select(
            '_id eventName currency totalEventAmount eventAmountExpected'
          );
        const memberships = await this.membership
          .find({ creatorId: eachUser?._id })
          .select('_id title members');

        finalUserArray?.push({
          _id:eachUser._id,
          name: `${eachUser?.firstName} ${eachUser?.lastName}`,
          charities,
          memberships,
          status:eachUser?.userStatus,
          isVerifiedAsOrganization: eachUser?.is_offically_verified || false,
          verification_documents: {
            govt_issued_id: eachUser?.official_verification_id,
            bank_statement: eachUser?.offical_verification_bank_statement,
          },
        });
      });
      await Promise.all(userlooping);
      return res
        .status(200)
        .json({ msg: 'successful', payload: finalUserArray });
    } catch (err) {
      return res
        .status(500)
        .json({ msg: 'unsuccessful. Server error', payload: err.message });
    }
  }

  async walletChargeHandler(
    completeBody: {
      to: number;
      from: number;
      percent: number;
    },
    req: any,
  ) {
    const { to, from, percent } = completeBody;
    if ((!to && !from) || !percent) {
      throw new BadRequestException({ msg: 'Incomplete credentials' });
    }
    try {
      let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
      if (!isAdmin) {
        throw new ForbiddenException('You cannot make this request');
      }
      const rangeExists = await this.Admin.findOne({
        chargeRanges: { $elemMatch: { to, from } },
      });
      if (rangeExists) {
        throw new BadRequestException({ msg: 'range already exists' });
      }
      const result = await this.Admin.findOneAndUpdate(
        { _id: '6466adefaaed2bfa0761592b' },
        { $push: { chargeRanges: completeBody } },
        { new: true },
      );
      return { msg: 'successful', chargeRange: result };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async chargeDeleteHandler(chargerangeId: string, req: any) {
    try {
      let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
      if (!isAdmin) {
        throw new ForbiddenException('You cannot make this request');
      }
      const result = await this.Admin.findOneAndUpdate(
        { _id: '6466adefaaed2bfa0761592b' },
        { $pull: { chargeRanges: { _id: chargerangeId } } },
        { new: true },
      ).select('chargeRanges');
      return { msg: 'successful', chargeRange: result };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async fetchChargeRanges(req: any) {
    try {
      const result = await this.Admin.findOne({
        _id: '6466adefaaed2bfa0761592b',
      }).select('chargeRanges');
      //I commented out the below code after deciding that users will need to fetch charge ranges too
      // console.log('decodedAdmin:', req?.decodedAdmin);
      // let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
      // if (!isAdmin) {
      //   throw new ForbiddenException('You cannot make this request');
      // }
      return { msg: 'successful', chargeRange: result };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async setSubscription(userId: string, subObj: any, req: any) {
    //check if user is an admin
    try {
      // const user = await this.user.findOne({ _id: userId });
      // if (!user?.isAdmin) {
      //   throw new ForbiddenException('Forbidden request.');
      // }
      let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
      if (!isAdmin) {
        throw new ForbiddenException('You cannot make this request');
      }
      let objectIsTamperedWith = false;
      const newObj = { ...subObj?.free, ...subObj?.gold, ...subObj?.platinum };
      // const newObjLength = Object.values(newObj).length;
      const schema = [
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
        'free_participant_no',
        'gold_participant_no',
        'platinum_participant_no',
      ];
      for (let subname in newObj) {
        if (!schema.includes(subname)) {
          objectIsTamperedWith = true;
        }
      }
      if (objectIsTamperedWith) {
        throw new ForbiddenException(
          'You have sent one or more wrong subscription feature name. Visit documentation for right list of allowed features',
        );
      }
      // check if all features are sent. I decided to remove the code implementing this (below)
      // because you might want to completely take off a praticular feature from
      // all subTypes (free, gold and platinum)

      // if (newObjLength !== schema.length) {
      //   throw new ForbiddenException(
      //     'Send full list of features. Visit documentation for list of allowed feature names',
      //   );
      // }

      //set subObj in admin subscription settings
      const result = await this.Admin.findOneAndUpdate(
        { _id: '6466adefaaed2bfa0761592b' },
        { $set: { subscription: subObj } },
        { new: true },
      );
      return {
        msg: 'successful',
        subscription: result.subscription,
        bundle: result.bundle_settings || {},
      };
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }

  async setBundles(userId: string, bundleObj: any, req: any) {
    //check if user is an admin
    // const user = await this.user.findOne({ _id: userId });
    // if (!user.isAdmin) {
    //   throw new ForbiddenException('Forbidden request.');
    // }
    let isAdmin = req?.decodedAdmin?.isAdmin; //gotten from adminSettings middleware
    if (!isAdmin) {
      throw new ForbiddenException('You cannot make this request');
    }
    const schema = [
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
    ];

    //check if bundlenames aren't repeated
    let bundleName = undefined;
    let nameIsRepeated = false;
    let objectIsTamperedWith = false;

    bundleObj.map((eachBundle: any) => {
      if (eachBundle.bundleName === bundleName) {
        nameIsRepeated = true;
      } else {
        bundleName = eachBundle.bundleName;
      }
      eachBundle.bundleFeatures.map((eachFeature: any) => {
        if (!schema.includes(eachFeature.featureName)) {
          objectIsTamperedWith = true;
        }
      });
      return;
    });

    if (nameIsRepeated) {
      throw new BadRequestException(
        'You cannot repeat bundle names. each name must be unique',
      );
    }
    if (objectIsTamperedWith) {
      throw new ForbiddenException(
        'You have sent one or more wrong subscription feature name. Visit documentation for list of allowed feature names',
      );
    }
    const adminObj = await this.Admin.findOne({
      _id: '6466adefaaed2bfa0761592b',
    });

    let bundleNamesArray = [];
    //extract bundleNames into an array (for later use)
    adminObj.bundle_settings.map((eachBundle: any) => {
      bundleNamesArray.push(eachBundle.bundleName);
      return;
    });

    let particularBundle = (bundleN: string) =>
      bundleObj.find((eachBundle: any) => {
        return eachBundle.bundleName === bundleN;
      });
    let result = undefined;
    for (let indBundle of bundleObj) {
      if (bundleNamesArray.includes(indBundle.bundleName)) {
        result = await this.Admin.findOneAndUpdate(
          {
            _id: '6466adefaaed2bfa0761592b',
            'bundle_settings.bundleName': indBundle.bundleName,
          },
          {
            $set: {
              'bundle_settings.$': particularBundle(indBundle.bundleName),
            },
          },
          { new: true },
        );
      } else {
        result = await this.Admin.findOneAndUpdate(
          {
            _id: '6466adefaaed2bfa0761592b',
          },
          {
            $push: {
              bundle_settings: particularBundle(indBundle.bundleName),
            },
          },
          { new: true },
        );
      }
    }
    return {
      msg: 'successful',
      // subscription: result.subscription,
      // bundle: result.bundle_prices || {},
      bundlenew: result.bundle_settings || {},
    };
  }

  async fetchSubscriptionAndBundles() {
    //pull out subObj
    const result = await this.Admin.findOne({
      _id: '6466adefaaed2bfa0761592b',
    });
    return {
      msg: 'successful',
      subscription: result?.subscription,
      bundlenew: result?.bundle_settings || {},
      // bundle: result?.bundle_prices || {},
    };
  }
}
