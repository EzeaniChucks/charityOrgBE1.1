import { ApiProperty } from '@nestjs/swagger';

export class fetchAllEscrowParamsDTO {
  eventId: string;
  userId: string;
}
export class fetchAllEscrowResponseDTO {
  @ApiProperty({ example: 'successful' })
  msg: string;

  @ApiProperty({
    example: [
      {
        eventName: 'ExampleEventName',
        appointee: {
          userId: 'mongoseGeneratedId',
          accepted: false,
          has_disbursed_payment: false,
        },
        appointer: {
          userId: 'mongoseGeneratedId',
          accepted: false,
          money_value_willing_to_raise: 0,
          money_currency_willing_to_raise: '',
          has_paid: false,
        },
        escrowDetails: {
          amount: 0,
          currency: 'NGN',
          paidOut: false,
        },
        paymentForm: [
          {
            userId: 'mongoseGeneratedId',
            amount_received: 0,
            paid: false,
            date: 'DateString',
          },
        ],
        allParticipants: ['mongoseGeneratedId1', 'mongoseGeneratedId2'],
      },
      {
        eventName: 'ExampleEventName',
        appointee: {
          userId: 'mongoseGeneratedId',
          accepted: false,
          has_disbursed_payment: false,
        },
        appointer: {
          userId: 'mongoseGeneratedId',
          accepted: false,
          money_value_willing_to_raise: 0,
          money_currency_willing_to_raise: '',
          has_paid: false,
        },
        escrowDetails: {
          amount: 0,
          currency: 'NGN',
          paidOut: false,
        },
        paymentForm: [
          {
            userId: 'mongoseGeneratedId',
            amount_received: 0,
            paid: false,
            date: 'DateString',
          },
        ],
        allParticipants: ['mongoseGeneratedId1', 'mongoseGeneratedId2'],
      },
    ],
  })
  payload: [
    {
      eventName: string;
      appointee: {
        userId: string;
        accepted: boolean;
        has_disbursed_payment: boolean;
      };
      appointer: {
        userId: string;
        accepted: boolean;
        money_value_willing_to_raise: number;
        money_currency_willing_to_raise: string;
        has_paid: boolean;
      };
      escrowDetails: {
        amount: number;
        currency: string;
        paidOut: boolean;
      };
      paymentForm: [
        {
          userId: string;
          amount_received: number;
          paid: boolean;
          date: string;
        },
      ];
      allParticipants: [string];
    },
  ];
}

export class AddEventCommentDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;
  @ApiProperty({
    example:
      'I love the work this organization is doing! So glad they are putting every received penney to good use',
  })
  comment: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userName: string;
}
export class EditEventCommentDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  commentId: string;
  @ApiProperty({
    example:
      'I love the work this organization is doing! So glad they are putting every received penney to good use',
  })
  newComment: string;
}

export class DeleteEventCommentDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  commentId: string;
}

export class CreateRecurrentPaymentDTO {
  @ApiProperty({ example: 'paystackReference' })
  cardPaymentRef: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'Jay Dee' })
  userName: string;

  @ApiProperty({ example: 'John Doe' })
  actualName: string;

  @ApiProperty({ example: 'johndoe@site.com' })
  email: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({
    example:
      'I am donating to assist with the little cash I have. I hope it is something',
  })
  note: string;

  @ApiProperty({ example: 500 })
  amount: number;

  @ApiProperty({ example: 3 })
  frequencyDateValue: number;

  @ApiProperty({ example: 'hours' })
  frequencyDateUnit: 'hours' | 'days' | 'weeks' | 'months';

  @ApiProperty({ example: Date.now() })
  renewalEndDateMs: number;
}

export class CreateOneTimePaymentDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'Jay Dee' })
  userName: string;

  @ApiProperty({ example: 'John Doe' })
  actualName: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({
    example:
      'I am donating to assist with the little cash I have. I hope it is something',
  })
  note: string;

  @ApiProperty({ example: 500 })
  depositAmount: number;
}

export class CreateOneTimePledgeDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({ example: 'John Doe' })
  userName: string;

  @ApiProperty({
    example:
      'I am making a pledge of a bus and vow to redeem it on or before the date i have filled in this form. I hope it is something',
  })
  pledge_description: string;

  @ApiProperty({ example: new Date().toDateString() })
  redemption_date: Date;

  @ApiProperty({ example: 'johndoe@certainsite.com' })
  pledger_email: string;
}

export class CreateEscrowDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({ example: 3 })
  amount: number;

  @ApiProperty({ example: 'USD' })
  currency: string;
}

export class FetchSingleEscrowDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  escrowId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;
}
export class FetchEscrowParticipantsListsDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  escrowId: string;
  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;
}

export class InviteEscrowAppointeeDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  escrowId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  appointeeId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  appointerId: string;

  @ApiProperty({ example: 'John Doe' })
  appointerName: string;
}

export class AcceptEscrowInvitationDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  escrowId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({ example: 'Help the orphanage' })
  eventName: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  appointeeId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  appointerId: string;

  @ApiProperty({ example: 'John Doe' })
  appointeeName: string;
}
export class DeclineEscrowInvitationDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  escrowId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({ example: 'Help the orphanage' })
  eventName: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  appointeeId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  appointerId: string;

  @ApiProperty({ example: 'John Doe' })
  appointeeName: string;
}

export class PayEscrowDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  escrowId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;
}

export class DisburseEscrowFundsDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  escrowId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  appointeeId: string;

  @ApiProperty({
    example: [
      {
        userName: 'John Doe',
        _id: 'mongooseGeneratedId',
        amount: 250,
        type: 'individual',
      },
      {
        userName: 'Charity',
        _id: 'mongooseGeneratedId',
        amount: 100,
        type: 'charity',
      },
      {
        userName: 'Angeline Doe',
        _id: 'mongooseGeneratedId',
        amount: 0,
        type: 'individual',
      },
    ],
  })
  payroll: {
    userName: string;
    _id: string;
    amount: number;
    type: 'individual' | 'charity';
  }[];
}

export class eventFormFeatureEligibilityDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'can_choose_event_time_zone' })
  feature: string;
}
