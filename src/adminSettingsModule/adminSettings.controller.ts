import { Body, Controller, Get, Post, Put, Req, Res } from '@nestjs/common';
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