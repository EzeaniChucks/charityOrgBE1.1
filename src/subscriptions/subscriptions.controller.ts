import { Body, Controller, Delete, Get, Param, Post, Put, Req, Res } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { Request, Response } from "express";
import { ApiTags } from "@nestjs/swagger";
import { CreateSubscriptionDTO, EditSubscriptionDTO, IsUserSubscribedDTO } from "./subscriptions.dto";

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subservice: SubscriptionsService) {}
  //create subscriptions
  @Post('create')
  @ApiTags('Subscriptions')
  async createSubscription(
    @Body()
    body: CreateSubscriptionDTO,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const { sub_name, sub_currency, sub_duration_MS, sub_amount } = body;
    return this.subservice.createSubscription({
      sub_name,
      sub_duration_MS,
      sub_currency,
      sub_amount,
      req,
      res,
    });
  }

  //edit subscription
  @Put('edit')
  @ApiTags('Subscriptions')
  async editSubscription(
    @Body()
    body: EditSubscriptionDTO,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const { sub_name, sub_currency, sub_duration_MS, sub_amount } = body;
    return this.subservice.editSubscription({
      sub_name,
      sub_duration_MS,
      sub_currency,
      sub_amount,
      req,
      res,
    });
  }

  //Delete subscription
  @Delete('delete/:sub_name')
  @ApiTags('Subscriptions')
  async deleteSubscription(
    @Param('sub_name') sub_name: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    return this.subservice.deleteSubscription({
      sub_name,
      req,
      res,
    });
  }

  //is User Subscribed
  @Get('is_user_subscribed/:sub_name/:userId')
  @ApiTags('Subscriptions')
  async isUserSubscribed(
    @Param() param: IsUserSubscribedDTO,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const { sub_name, userId } = param;
    return this.subservice.isUserSubscribed({
      sub_name,
      userId,
      req,
      res,
    });
  }
}