import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { AdminSettingsService } from './adminSettings.service';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  UserDetailsForAdminMgtResponseDTO,
  chargeRangeDeletionDTO,
  chargeRangeDeletionResponseDTO,
  fetchBundleAndSubResponseDTO,
  setBundleDTO,
  setSubscriptionDTO,
  setSubscriptionResponseDTO,
  walletChargeRangeDTO,
  walletChargeRangeDTOResult,
} from './adminSettings.dto';
import { Request, Response } from 'express';
@Controller()
export class AdminSettingsController {
  constructor(private readonly adminsettingsservice: AdminSettingsService) {}
  @Get('confirm_admin_status')
  @ApiTags('Admin')
  async confirmAdminStatus(@Req() req: Request) {
    return this.adminsettingsservice.confirmAdminStatus(req);
  }

  @Post('admin/create_new_paystack_customer')
  @ApiTags('Admin')
  async createNewPaystackCustomer(
    @Body('userId') userId: string,
    @Res() res: Response,
  ) {
    return this.adminsettingsservice.createNewPaystackCustomer(userId, res);
  }

  @Get('fetchUserDetailsForAdminManagement')
  @ApiOkResponse({
    description:
      'Fetch only selected user document fields for administrative purposes',
    type: UserDetailsForAdminMgtResponseDTO,
  })
  @ApiTags('Admin')
  async fetchUserDetailsForAdminManagement(
    @Res() res: Response,
    @Req() req: Request,
  ) {
    return this.adminsettingsservice.fetchUserDetailsForAdminManagement(
      req,
      res,
    );
  }

  @Get('get_verification_intent')
  @ApiTags('Admin')
  async fetchVerificationIntents(
    @Query('status') status: 'attended' | 'awaiting' | 'all',
    @Res() res: Response,
  ) {
    if (!status) {
      return res.status(400).json({
        msg: 'status query parameter should not be empty. Enums can be attended, unattended or all',
      });
    }
    return this.adminsettingsservice.fetchVerificationIntents(status, res);
  }

  @Post('give_verification_verdict')
  @ApiTags('Admin')
  async giveVerificationVerdict(
    @Body()
    body: {
      userId: string;
      verdict: 'satisfied' | 'dissatisfied';
      dissatisfaction_reason: string;
    },
    @Res() res: Response,
  ) {
    const { verdict, dissatisfaction_reason, userId } = body;
    if (verdict === 'dissatisfied' && !dissatisfaction_reason) {
      return res.status(400).json({
        msg: 'Please give your reason for being dissatified. "dissatisfaction_reason" field cannot be empty',
      });
    }
    return this.adminsettingsservice.giveVerificationVerdict(
      verdict,
      userId,
      dissatisfaction_reason,
      res,
    );
  }

  @Get('fetch_withdrawal_intent')
  @ApiTags('Admin')
  async fetchWithdrawalIntents(
    @Query('intentStatus')
    intentStatus: 'pending' | 'processing' | 'attended' | 'cancelled',
    @Res() res: Response,
  ) {
    if (!intentStatus) {
      return res.status(400).json({
        msg: 'status query parameter should not be empty. Enums can be attended, unattended or all',
      });
    }
    return this.adminsettingsservice.fetchWithdrawalIntents({
      intentStatus,
      res,
    });
  }

  @Post('accept_withdrawal_intent')
  @ApiTags('Admin')
  async acceptWithdrawalIntent(
    @Body()
    body: { intentId: string; userId: string },
    @Res() res: Response,
  ) {
    const { intentId, userId } = body;
    return this.adminsettingsservice.acceptWithdrawalIntent({
      userId,
      intentId,
      res,
    });
  }

  @Post('reject_withdrawal_intent')
  @ApiTags('Admin')
  async rejectWithdrawalIntent(
    @Body()
    body: { intentId: string; userId: string; cancellationReason: string },
    @Res() res: Response,
  ) {
    const { intentId, userId, cancellationReason } = body;
    return this.adminsettingsservice.rejectWithdrawalIntent({
      userId,
      cancellationReason,
      intentId,
      res,
    });
  }

  @Get('fetch_virtual_card_intent')
  @ApiTags('Admin')
  async fetchVirtualCardIntents(
    @Query('intentStatus')
    intentStatus: 'awaiting' | 'processing' | 'attended' | 'cancelled',
    @Res() res: Response,
  ) {
    if (!intentStatus) {
      return res.status(400).json({
        msg: 'status query parameter should not be empty. Enums can be attended, unattended or all',
      });
    }
    return this.adminsettingsservice.fetchVirtualCardIntents({
      intentStatus,
      res,
    });
  }

  @Post('accept_virtual_card_intent')
  @ApiTags('Admin')
  async acceptVirtualCardIntent(
    @Body()
    body: { intentId: string; userId: string },
    @Res() res: Response,
  ) {
    const { intentId, userId } = body;
    return this.adminsettingsservice.acceptVirtualCardIntent({
      userId,
      intentId,
      res,
    });
  }

  @Post('reject_virtual_card_intent')
  @ApiTags('Admin')
  async rejectVirtualCardIntent(
    @Body()
    body: { intentId: string; userId: string; dissatisfaction_reason: string },
    @Res() res: Response,
  ) {
    const { intentId, userId, dissatisfaction_reason } = body;
    return this.adminsettingsservice.rejectVirtualCardIntent({
      userId,
      dissatisfaction_reason,
      intentId,
      res,
    });
  }

  //set wallet charge range
  @Post('set_wallet_charge_amount')
  @ApiTags('Admin')
  @ApiOkResponse({
    description: 'the charge ranges object',
    type: walletChargeRangeDTOResult,
    isArray: false,
  })
  async walletChargeHandler(
    @Body()
    completeBody: walletChargeRangeDTO,
    @Req() req: Request,
  ) {
    const { to, from, percent } = completeBody;
    return await this.adminsettingsservice.walletChargeHandler(
      { to: Number(to), from: Number(from), percent: Number(percent) },
      req,
    );
  }

  @Get('get_all_charge_range')
  @ApiTags('Admin')
  @ApiOkResponse({
    description: 'Result displays all available charges ranges',
    type: chargeRangeDeletionResponseDTO,
  })
  async fetchChargeRanges(@Req() req: Request) {
    return await this.adminsettingsservice.fetchChargeRanges(req);
  }

  //delete a specific charge range by sending the charge rangeId
  @Put('charge_range_deletion')
  @ApiTags('Admin')
  @ApiOkResponse({
    description:
      'Charge range deletion response. Result displays existing charges ranges except deleted one',
    type: chargeRangeDeletionResponseDTO,
  })
  async chargeDeleteHandler(
    @Body() body: chargeRangeDeletionDTO,
    @Req() req: Request,
  ) {
    const { chargeRangeId } = body;
    return await this.adminsettingsservice.chargeDeleteHandler(
      chargeRangeId,
      req,
    );
  }

  @Post('set_subscription')
  @ApiOkResponse({
    description:
      'Subscriptions object containing different price tiers (e.g Free, Gold, Platinum )and features users can access under each tier',
    type: setSubscriptionResponseDTO,
  })
  @ApiTags('Admin')
  async setSubscription(@Body() body: setSubscriptionDTO, @Req() req: Request) {
    const { userId, subObj } = body;
    return this.adminsettingsservice.setSubscription(userId, subObj, req);
  }

  @Post('set_bundles')
  @ApiOkResponse({
    type: setBundleDTO,
    description:
      'Returns all bundle names with their price and quantities, as set by admin',
  })
  @ApiTags('Admin')
  async setBundles(@Body() body: setBundleDTO, @Req() req: Request) {
    const { userId, bundleObj } = body;
    return this.adminsettingsservice.setBundles(userId, bundleObj, req);
  }

  @Get('fetch_sub_and_bundles')
  @ApiOkResponse({
    type: fetchBundleAndSubResponseDTO,
    description: 'Returns all charge ranges without just-deleted range',
  })
  @ApiTags('Admin')
  async fetchSubscriptionAndBundles() {
    return this.adminsettingsservice.fetchSubscriptionAndBundles();
  }
}
