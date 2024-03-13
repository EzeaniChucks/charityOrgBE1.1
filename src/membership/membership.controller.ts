import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Res,
  Req,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import {
  AcceptMembershipReviewsDTO,
  DeleteMembershipDTO,
  JoinMembershipDTO,
  LeaveMembershipDTO,
  createMembershipDTO,
  fetchSingleMembershipDTO,
  updateMembershipDTO,
} from './membership.dto';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipservice: MembershipService) {}

  //CRON JOB
  @Get('recurrent_payment_from_wallet_for_membership_cron')
  @ApiTags('Membership')
  async recurrentPaymentFromWalletForMembershipCron(@Res() res: Response) {
    return this.membershipservice.recurrentPaymentFromWalletForMembershipCron(
      res,
    );
  }
  //Create Membership
  @Post('create')
  @ApiTags('Membership')
  async createMembership(
    @Body()
    body: createMembershipDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.membershipservice.createMembership(body, req, res);
  }

  //Fetch Membership
  @Get('fetch/:creatorId')
  @ApiTags('Membership')
  async fetch(@Param('creatorId') creatorId: string, @Res() res: Response) {
    return this.membershipservice.fetchMembership(creatorId, res);
  }

  //Fetch Single Membership
  @Get('fetch_single/:creatorId/:membershipId')
  @ApiTags('Membership')
  async fetchSingle(
    @Param() param: fetchSingleMembershipDTO,
    @Res() res: Response,
  ) {
    const { creatorId, membershipId } = param;
    return this.membershipservice.fetchSingleMembership(
      creatorId,
      membershipId,
      res,
    );
  }

  //Update Membership
  @Put('update')
  @ApiTags('Membership')
  async update(
    @Body()
    body: updateMembershipDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.membershipservice.updateMembership(body, req, res);
  }

  //Update Membership
  @Put('accept_reviews')
  @ApiTags('Membership')
  async acceptMembershipReviews(
    @Body()
    body: AcceptMembershipReviewsDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const {
      reviewerId,
      membershipOwnerId,
      membershipId,
      reviewName,
      reviewComment,
    } = body;
    return this.membershipservice.acceptMembershipReview(
      reviewerId,
      membershipOwnerId,
      membershipId,
      reviewName,
      reviewComment,
      req,
      res,
    );
  }

  //Delete Membership
  @Delete('delete/:creatorId/:membershipId')
  @ApiTags('Membership')
  async deleteMembership(
    @Param() param: DeleteMembershipDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.membershipservice.deleteMembership(
      param?.creatorId,
      param?.membershipId,
      req,
      res,
    );
  }

  //join Membership
  @Put('join')
  @ApiTags('Membership')
  async joinMembership(
    @Body()
    body: JoinMembershipDTO,
    @Res() res: Response,
  ) {
    return this.membershipservice.joinMembership(
      body?.creatorId,
      body?.membershipId,
      body?.userId,
      body?.userName,
      res,
    );
  }

  //Leave Membership
  @Put('leave')
  @ApiTags('Membership')
  async leaveMembership(
    @Body() body: LeaveMembershipDTO,
    @Res() res: Response,
  ) {
    return this.membershipservice.leaveMembership(
      body?.creatorId,
      body?.membershipId,
      body?.userId,
      res,
    );
  }
}
