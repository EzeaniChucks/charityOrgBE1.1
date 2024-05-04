import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import { VirtualCardServices } from './virtualCard.service';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { BlockVirtualCardDTO, CreateVirtualCardDTO, DebitVirtualCardDTO, DestroyVirtualCardDTO, FundVirtualCardDTO, UnBlockVirtualCardDTO } from './virtualCard.dto';

@Controller('virtual_cards')
export class VirtualCardController {
  constructor(private virtualcardservice: VirtualCardServices) {}

  // @Post('create')
  // @ApiTags('VirtualCard')
  // async createVirtualCard(
  //   @Body()
  //   body: CreateVirtualCardDTO,
  //   @Res() res: Response,
  // ) {
  //   const { userId, amount, currency, data } = body;
  //   return this.virtualcardservice.createVirtualCard({
  //     userId,
  //     amount,
  //     currency,
  //     data,
  //     res,
  //   });
  // }

  //Get single virtual card
  @Get('get_cards/:userId')
  @ApiTags('VirtualCard')
  async getAllUserCards(@Param('userId') userId: string, @Res() res: Response) {
    return this.virtualcardservice.getAllUserCards({ userId, res });
  }

  @Put('fund')
  @ApiTags('VirtualCard')
  async fundACard(
    @Body()
    body: FundVirtualCardDTO,
    @Res() res: Response,
  ) {
    const { userId, cardId, amount, currency } = body;
    return await this.virtualcardservice.fundACard({
      userId,
      cardId,
      amount,
      currency,
      res,
    });
  }

  @Put('debit')
  @ApiTags('VirtualCard')
  async debitACard(
    @Body()
    body: DebitVirtualCardDTO,
    @Res() res: Response,
  ) {
    const { userId, cardId, amount, currency } = body;
    return await this.virtualcardservice.debitACard({
      userId,
      cardId,
      amount,
      currency,
      res,
    });
  }

  @Put('block_a_card')
  @ApiTags('VirtualCard')
  async blockACard(
    @Body()
    body: BlockVirtualCardDTO,
    @Res() res: Response,
  ) {
    const { userId, cardId } = body;
    return await this.virtualcardservice.blockACard({
      userId,
      cardId,
      res,
    });
  }

  @Put('unblock_a_card')
  @ApiTags('VirtualCard')
  async unblockACard(
    @Body()
    body: UnBlockVirtualCardDTO,
    @Res() res: Response,
  ) {
    const { userId, cardId } = body;
    return await this.virtualcardservice.unblockACard({
      userId,
      cardId,
      res,
    });
  }

  @Put('destroy_a_card')
  @ApiTags('VirtualCard')
  async destroyACard(
    @Body()
    body: DestroyVirtualCardDTO,
    @Res() res: Response,
  ) {
    const { userId, cardId } = body;
    return await this.virtualcardservice.destroyACard({
      userId,
      cardId,
      res,
    });
  }
}