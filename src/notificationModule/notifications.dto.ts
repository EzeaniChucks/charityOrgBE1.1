import { ApiProperty } from '@nestjs/swagger';

export class LogNotificationsDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  eventId:string;
  
  @ApiProperty({ example: false })
  has_checked: boolean;

  @ApiProperty({
    example:
      'User has invited you to an escrow. Click the link button to check',
  })
  message: string;

  @ApiProperty({
    example: 'https://client_address.com/escrow/relevant_link_to_client_page',
  })
  link: string;

  @ApiProperty({ example: 'escrow_invitation' })
  type: string;
}

export class MarkMessageAsReadDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  messageId: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
}
