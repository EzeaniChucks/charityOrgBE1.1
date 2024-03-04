import { Body, Controller, Delete, Post, Put } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { ApiTags } from '@nestjs/swagger';

@Controller()
export class DisputeController {
  constructor(private readonly disputeservice: DisputesService) {}
  // @Post('add_dispute')
  // @ApiTags('Disputes')
  // addDispute(@Body() body: any) {
  //   const {
  //     requestId,
  //     requestOwnerId,
  //     dispute_complainerId,
  //     eventId,
  //     description,
  //   } = body;
  //   return this.disputeservice.addDisputes(
  //     requestId,
  //     requestOwnerId,
  //     dispute_complainerId,
  //     eventId,
  //     description,
  //     );
  // }

  // @Put('remove_dispute')
  // @ApiTags('Disputes')
  // removeDisputes(@Body() body: any) {
  //   const { requestId, requestOwnerId, dispute_complainerId, eventId } = body;
  //   return this.disputeservice.removeDisputes(
  //     requestId,
  //     requestOwnerId,
  //     dispute_complainerId,
  //     eventId,
  //   );
  // }

  // @Put('remove_all_disputes')
  // @ApiTags('Disputes')
  // removeAllDisputes(@Body() body: any) {
  //   const { eventId, requestId, userId } = body;
  //   return this.disputeservice.removeAllDisputes(eventId, requestId, userId);
  // }
}