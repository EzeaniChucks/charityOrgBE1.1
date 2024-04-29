import { ApiProperty } from '@nestjs/swagger';

export class LoginDTO {
  @ApiProperty({ example: 'example@site.com' })
  email: string;

  @ApiProperty({ example: 'myPassword' })
  password: string;
}

export class LoginResponseDTO {
  @ApiProperty({ example: 'success' })
  msg: string;

  @ApiProperty({
    example: {
      _id: 'mongooseGeneratedId',
      email: 'example@site.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '080870070709',
      isVerified: false,
    },
  })
  user: object;
}

export class RegisterDTO {
  @ApiProperty({ example: 'example@site.com' })
  email: string;

  @ApiProperty({ example: 'myPassword' })
  password: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: '1992-01-30' })
  dateOfBirth: string;
  @ApiProperty({ example: '+234898800000' })
  phoneNumber: string;
  @ApiProperty({ example: 'Anything' })
  promoCode: string;
  @ApiProperty({ example: 'individual' })
  userStatus: string;
}

export class StartRegisterResponseDTO {
  @ApiProperty({
    example: 'success! we sent you an email to verify your account',
  })
  msg: string;
  @ApiProperty({
    example: { _id: 'mongooseGeneratedId', email: 'yourmail@site.com' },
  })
  payload: { _id: string; email: string };
}

export class CompleteRegisterResponseDTO {
  @ApiProperty({
    example: 'success! we sent you an email to verify your account',
  })
  msg: string;

  @ApiProperty({
    example: { _id: 'mongooseGeneratedId', email: 'yourmail@site.com' },
  })
  payload: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    isVerified: string;
  };
}

export class LogoutResponseDTO {
  @ApiProperty({
    example: 'User logged out',
  })
  msg: string;
}

export class VerifyEmailDTO {
  @ApiProperty({
    example: 'hexStringGeneratedFromNodejsCryptoModule',
  })
  verificationToken: string;

  @ApiProperty({
    example: 'email@certainsite.com',
  })
  email: string;
}
export class VerifyEmailResponseDTO {
  @ApiProperty({
    example: 'email verified',
  })
  msg: string;

  @ApiProperty({
    example: {
      _id: 'mongooseGeneratedId',
      email: 'useremail@certainsite.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+23496900922222',
    },
  })
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export class CompleteUserDetailsResponseDTO {
  @ApiProperty({ example: 'successful' })
  msg: string;

  @ApiProperty({
    example: {
      _id: 'mongooseGeneratedId',
      email: 'email@site.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+234987070700',
      accountBank: '058',
      accountNumber: '998557587889',
      accountName: 'John Doe',
      accountBankCode: '068',
      accountCurrency: 'NGN',
      isVerified: false,
      isAdmin: false,
    },
  })
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    accountBank: string;
    accountNumber: string;
    accountName: string;
    accountBankCode: string;
    accountCurrency: string;
    isVerified: boolean;
    isAdmin: boolean;
  };
}

export class EditUserDetailsDTO {
  @ApiProperty({ example: 'userGeneratedId' })
  userId: string;
  @ApiProperty({ example: 'John' })
  first_name?: string;
  @ApiProperty({ example: 'Doe' })
  last_name?: string;
  @ApiProperty({ example: '+2340900098980' })
  phone_number?: string;
  @ApiProperty({ example: 'an img file' })
  profilePic?: Express.Multer.File;
  @ApiProperty({ example: 'an img file' })
  idCard?: Express.Multer.File;
  @ApiProperty({ example: 'user address' })
  address?: string;
}

export class EditUserSubTypeDTO {
  @ApiProperty({ example: 'Free or Gold or Platinum' })
  subType: string;

  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;
}

export class EditUserBundleAmountDTO {
  @ApiProperty({ example: 'mongooseGeneratedId' })
  userId: string;

  @ApiProperty({ example: 'Free or Gold or Platinum' })
  frontendBundleName: string;
}

export class EditAccountDetailsResponseDTO {
  @ApiProperty({ example: 'success' })
  msg: string;

  @ApiProperty({
    example: {
      accountBank: 'userGeneratedId',
      accountNumber: '89859998594',
      accountName: 'John Doe',
      accountBankCode: '058',
      accountCurrency: 'NGN',
    },
  })
  user: {
    accountBank: string;
    accountNumber: string;
    accountName: string;
    accountBankCode: string;
    accountCurrency: string;
  };
}
export class SearchUserResponseDTO {
  @ApiProperty({
    example: [
      {
        _id: '655231fa7bd194ba99e67829',
        firstName: 'Monday',
        lastName: 'Reds',
        email: 'mondayreds@yahoo.com',
      },
      {
        _id: '6559d364a89ae8d27efa3ae0',
        firstName: 'Monday',
        lastName: 'Reds2',
        email: 'mondayreds2@yahoo.com',
      },
    ],
  })
  result: [{ _id: string; firstName: string; lastName: string; email: string }];
}
