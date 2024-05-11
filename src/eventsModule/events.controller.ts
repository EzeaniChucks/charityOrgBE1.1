import { Express, Response } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Query,
  UploadedFiles,
  UseInterceptors,
  Res,
  UploadedFile,
} from '@nestjs/common';
import { EventsServices } from './events.service';
import {
  AnyFilesInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { Request } from 'express';
import { File } from 'buffer';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AcceptEscrowInvitationDTO,
  AddEventCommentDTO,
  CreateEscrowDTO,
  CreateOneTimePaymentDTO,
  CreateOneTimePledgeDTO,
  CreateRecurrentPaymentDTO,
  DeclineEscrowInvitationDTO,
  DeleteEventCommentDTO,
  DisburseEscrowFundsDTO,
  EditEventCommentDTO,
  FetchEscrowParticipantsListsDTO,
  FetchSingleEscrowDTO,
  InviteEscrowAppointeeDTO,
  PayEscrowDTO,
  fetchAllEscrowParamsDTO,
  fetchAllEscrowResponseDTO,
} from './event.dto';

@Controller()
export class EventsController {
  constructor(private readonly eventservice: EventsServices) {}

  @Post('create_event')
  @ApiTags('Events')
  @UseInterceptors(FileInterceptor('image'))
  createEvent(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // console.log(file, body);
    const { document } = body;
    return this.eventservice.createEvent(file, JSON.parse(document), res);
  }

  @Put('edit_event_details')
  @ApiTags('Events')
  editEventDetails(
    @Body()
    body: {
      eventId: string;
      userId: string;
      eventTags: string[];
      description: string;
      amount: number;
      type: 'amount' | 'tag' | 'description';
    },
    @Res() res: Response,
  ) {
    const { eventId, userId, eventTags, description, amount, type } = body;
    return this.eventservice.editEventDetails(
      eventId,
      userId,
      type,
      res,
      eventTags,
      description,
      amount,
    );
  }

  @Put('add_comment_on_event')
  @ApiTags('Events')
  addCommmentOnEvent(@Body() body: AddEventCommentDTO, @Res() res: Response) {
    const { eventId, userName, comment } = body;
    return this.eventservice.addCommentOnEvent(eventId, userName, comment, res);
  }

  @Put('edit_comment_on_event')
  @ApiTags('Events')
  editCommmentOnEvent(@Body() body: EditEventCommentDTO, @Res() res: Response) {
    const { eventId, commentId, newComment } = body;
    return this.eventservice.editCommentOnEvent(
      eventId,
      commentId,
      newComment,
      res,
    );
  }

  @Put('delete_comment_on_event')
  @ApiTags('Events')
  deleteCommmentOnEvent(
    @Body() body: DeleteEventCommentDTO,
    @Res() res: Response,
  ) {
    const { eventId, commentId } = body;
    return this.eventservice.deleteCommentOnEvent(eventId, commentId, res);
  }

  //PAYMENTS

  //CRON JOB
  //card recurrent payment to charity
  @Get('recurrent_payment_with_card_for_charities_cron')
  @ApiTags('Events')
  async recurrentPaymentWithCardForCharitiesCron(@Res() res: Response) {
    return this.eventservice.recurrentPaymentWithCardForCharitiesCron(res);
  }

  //CRON JOB
  //wallet recurrent payment to charity
  @Get('recurrent_payment_with_wallet_for_charities_cron')
  @ApiTags('Events')
  async recurrentPaymentWithWalletForCharitiesCron(@Res() res: Response) {
    return this.eventservice.recurrentPaymentWithWalletForCharitiesCron(res);
  }

  //wallet one-time payment to charities
  @Post('create_one_time_payment')
  @ApiTags('Events')
  createOneTimePaymentToCharity(
    @Body()
    body: CreateOneTimePaymentDTO,
    @Res() res: Response,
  ) {
    const {
      userId,
      userName,
      actualName,
      eventId,
      depositAmount,
      note,
      // activityType,
      // pledge_description,
    } = body;
    return this.eventservice.createOneTimePayment(
      userId,
      userName,
      actualName,
      eventId,
      note,
      depositAmount,
      res,
    );
  }

  //wallet recurrent payment to charity
  @Post('create_recurrent_payment')
  @ApiTags('Events')
  createWalletRecurrentPaymentToCharity(
    @Body()
    body: CreateRecurrentPaymentDTO,
    @Res() res: Response,
  ) {
    const {
      userId,
      eventId,
      actualName,
      amount,
      note,
      frequencyDateUnit,
      frequencyDateValue,
      renewalEndDateMs,
    } = body;
    return this.eventservice.createWalletRecurrentPaymentToCharity({
      userId,
      eventId,
      actualName,
      amount,
      note,
      frequencyDateValue,
      frequencyDateUnit,
      renewalEndDateMs,
      res,
    });
  }

  //card/transfers one-time charity response
  @Get('paystack_charity_fund_response')
  @ApiTags('Events')
  payStackCharityPaymentResponse(
    @Query('reference') reference: string,
    @Res() response: Response,
  ) {
    return this.eventservice.payStackCharityPaymentResponse(
      reference,
      response,
    );
  }

  //card recurrent charity response
  @Post('create_card_recurrent_charity_payment')
  @ApiTags('Events')
  payStackRecurrentCharityPaymentResponse(
    @Body()
    body: CreateRecurrentPaymentDTO,
    @Res() res: Response,
  ) {
    // console.log(body);
    const {
      cardPaymentRef, //from PayStack successful card payment
      userId,
      eventId,
      actualName,
      amount,
      note,
      email,
      frequencyDateUnit,
      frequencyDateValue,
      renewalEndDateMs,
    } = body;
    return this.eventservice.payStackRecurrentCharityPaymentResponse({
      cardPaymentRef,
      userId,
      eventId,
      email,
      actualName,
      amount,
      note,
      frequencyDateValue,
      frequencyDateUnit,
      renewalEndDateMs,
      res,
    });
  }

  @Post('create_one_time_pledge')
  @ApiTags('Events')
  createOneTimePledge(
    @Body()
    body: CreateOneTimePledgeDTO,
    @Res() res: Response,
  ) {
    const {
      userId,
      userName,
      eventId,
      pledge_description,
      redemption_date,
      pledger_email,
    } = body;
    return this.eventservice.createOneTimePledge(
      userId,
      userName,
      eventId,
      pledge_description,
      redemption_date,
      pledger_email,
      res,
    );
  }

  @Post('create_escrow')
  @ApiTags('Events')
  createEscrow(
    @Body()
    body: CreateEscrowDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.createEscrow({
      ...body,
      res,
    });
  }

  //stop here for documentation
  @Get('fetch_all_escrow/:eventId/:userId')
  @ApiTags('Events')
  @ApiOkResponse({
    description:
      'Result displayed for all escrows created by a user on a particular charity/event',
    type: fetchAllEscrowResponseDTO,
    // isArray:true
  })
  fetchAllEscrow(
    @Param()
    param: fetchAllEscrowParamsDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.fetchAllEscrow({
      ...param,
      res,
    });
  }

  @Get('fetch_single_escrow/:eventId/:escrowId')
  @ApiTags('Events')
  fetchSingleEscrow(
    @Param()
    param: FetchSingleEscrowDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.fetchSingleEscrow({
      ...param,
      res,
    });
  }

  @Get('fetch_escrow_participants_list/:eventId/:escrowId')
  @ApiTags('Events')
  fetchEscrowParticipantsList(
    @Param()
    param: FetchEscrowParticipantsListsDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.fetchEscrowParticipantsList({
      ...param,
      res,
    });
  }

  @Post('invite_escrow_appointee')
  @ApiTags('Events')
  inviteEscrowAppointee(
    @Body()
    body: InviteEscrowAppointeeDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.inviteEscrowAppointee({
      ...body,
      res,
    });
  }

  @Post('accept_escrow_invitation')
  @ApiTags('Events')
  acceptEscrowInvitation(
    @Body()
    body: AcceptEscrowInvitationDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.acceptEscrowInvitation({
      ...body,
      res,
    });
  }

  @Post('decline_escrow_invitation')
  @ApiTags('Events')
  declineEscrowInvitation(
    @Body()
    body: DeclineEscrowInvitationDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.declineEscrowInvitation({
      ...body,
      res,
    });
  }

  @Post('pay_escrow')
  @ApiTags('Events')
  payEscrow(
    @Body()
    body: PayEscrowDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.payEscrow({
      ...body,
      res,
    });
  }

  @Post('disburse_escrow_fund')
  @ApiTags('Events')
  disburseEscrowFund(
    @Body()
    body: DisburseEscrowFundsDTO,
    @Res() res: Response,
  ) {
    return this.eventservice.disburseEscrowFund({
      ...body,
      res,
    });
  }

  @Get('get_my_events/:creatorId')
  @ApiTags('Events')
  getMyEvents(@Param('creatorId') creatorId: string, @Res() res: Response) {
    return this.eventservice.getMyEvents(creatorId, res);
  }

  @Get('get_user_timezone')
  @ApiTags('Events')
  async getUserTimezone() {
    return this.eventservice.getUserTimezone();
  }

  @Get('get_user_country_currency')
  @ApiTags('Events')
  async getUserCountryCurrency(@Req() req: Request, @Res() res: Response) {
    return this.eventservice.getUserCountryCurrency(req, res);
  }

  @Get('get_all_events')
  @ApiTags('Events')
  fetchAllEvents(@Res() res: Response, @Query('eventName') eventName?: string) {
    return this.eventservice.fetchAllEvents(eventName, res);
  }

  @Get('/get_single_event/:eventId')
  @ApiTags('Events')
  fetchSingleEvent(@Param('eventId') eventId: string) {
    return this.eventservice.fetchSingleEvent(eventId);
  }

  @Get('event_creator_details/:creatorId')
  @ApiTags('Events')
  fetchEventCreatorDetails(@Param('creatorId') creatorId: string) {
    return this.eventservice.fetchEventCreatorDetails(creatorId);
  }

  @Get('get_event_form_feature_eligibility')
  @ApiTags('Events')
  eventFormFeatureEligibility(@Query() body: any) {
    const { userId, feature } = body;
    return this.eventservice.eventFormFeatureEligibility(userId, feature);
  }
}
