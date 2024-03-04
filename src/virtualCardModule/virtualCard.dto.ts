import { ApiProperty } from '@nestjs/swagger';


class CreateVirtualCardDataDTO {
  title: 'Mr' | 'Mrs' | 'Miss';
  phone: string;
  gender: 'M' | 'F';
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postal_code: string;
}

export class CreateVirtualCardDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({ example: 20 })
  amount: number;
  @ApiProperty({ example: 'USD' })
  currency: string;
  @ApiProperty({
    example: {
      title: 'Miss',
      phone: '+2347979076687',
      gender: 'F',
      billing_address: '333, Fremount Street',
      billing_city: 'San Francisco',
      billing_state: 'CA',
      billing_country: 'US',
      billing_postal_code: '94105',
    },
  })
  data: CreateVirtualCardDataDTO;
}

export class FundVirtualCardDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({
    example: 'mongooseGeneratedId',
    description: 'not the flutterwave one. The database one.',
  })
  cardId: string;
  @ApiProperty({ example: 3000 })
  amount: number;
  @ApiProperty({ example: 'USD' })
  currency: string;
}

export class DebitVirtualCardDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({
    example: 'mongooseGeneratedId',
    description: 'not the flutterwave one. The database one.',
  })
  cardId: string;
  @ApiProperty({ example: 3000 })
  amount: number;
  @ApiProperty({ example: 'USD' })
  currency: string;
}
export class BlockVirtualCardDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({
    example: 'mongooseGeneratedId',
    description: 'not the flutterwave one. The database one.',
  })
  cardId: string;
}

export class UnBlockVirtualCardDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({
    example: 'mongooseGeneratedId',
    description: 'not the flutterwave one. The database one.',
  })
  cardId: string;
}

export class DestroyVirtualCardDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
  @ApiProperty({
    example: 'mongooseGeneratedId',
    description: 'not the flutterwave one. The database one.',
  })
  cardId: string;
}