import { ApiProperty } from "@nestjs/swagger";

export class CreateSubscriptionDTO {
  @ApiProperty({example:'The Extra Cool Package'})
  sub_name: string;

  @ApiProperty({example:Date.now()})
  sub_duration_MS: number;

  @ApiProperty({example:'NGM'})
  sub_currency: string;
  
  @ApiProperty({example:2000})
  sub_amount: number;
}


export class EditSubscriptionDTO {
  @ApiProperty({example:'The Extra Cool Package'})
  sub_name: string;

  @ApiProperty({example:Date.now()})
  sub_duration_MS: number;

  @ApiProperty({example:'NGM'})
  sub_currency: string;
  
  @ApiProperty({example:2000})
  sub_amount: number;
}


export class IsUserSubscribedDTO {
  @ApiProperty({example:'The Extra Cool Package'})
  sub_name: string;
  
  @ApiProperty({example:'mongooseGeneratedId'})
  userId: string
}