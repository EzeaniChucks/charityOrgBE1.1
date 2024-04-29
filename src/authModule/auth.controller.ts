import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Put,
  Query,
  Res,
  UseInterceptors,
  UploadedFiles,
  Req,
  UploadedFile,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { File } from 'buffer';
import {
  CompleteRegisterResponseDTO,
  EditUserDetailsDTO,
  EditAccountDetailsResponseDTO,
  EditUserBundleAmountDTO,
  EditUserSubTypeDTO,
  LoginDTO,
  LoginResponseDTO,
  LogoutResponseDTO,
  RegisterDTO,
  SearchUserResponseDTO,
  StartRegisterResponseDTO,
  VerifyEmailDTO,
  VerifyEmailResponseDTO,
} from './auth.dto';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@Controller()
export class AuthController {
  constructor(private readonly authservice: AuthService) {}
  @Post('auth/login')
  @ApiTags('Auth')
  @ApiOkResponse({ description: 'User login response', type: LoginResponseDTO })
  async login(@Body() completeBody: LoginDTO, @Res() res: Response) {
    const { email, password } = completeBody;
    return await this.authservice.login(email, password, res);
  }

  @Post('auth/start_registration')
  @ApiOkResponse({
    description: 'Initial user registration response',
    type: StartRegisterResponseDTO,
  })
  @ApiTags('Auth')
  async startRegistration(@Body() body: RegisterDTO, @Res() res: Response) {
    return await this.authservice.startRegistration(body, res);
  }

  @Post('auth/complete_registration')
  @ApiOkResponse({
    description: 'Completed user registration response',
    type: CompleteRegisterResponseDTO,
  })
  @ApiTags('Auth')
  async completeRegistration(
    @Body('userId') userId: string,
    @Res() res: Response,
  ) {
    return await this.authservice.completeRegistration(userId, res);
  }

  @Get('auth/logout')
  @ApiOkResponse({
    description: 'User logout response',
    type: LogoutResponseDTO,
  })
  @ApiTags('Auth')
  async logout(@Res() res: Response) {
    return await this.authservice.logout(res);
  }

  @Post('auth/verify-email')
  @ApiOkResponse({
    description: 'Email verification response',
    type: VerifyEmailResponseDTO,
  })
  @ApiTags('Auth')
  async verify_email(@Body() body: VerifyEmailDTO, @Res() res: Response) {
    const { verificationToken, email } = body;
    return await this.authservice.verifyEmail(verificationToken, email, res);
  }
  //send reset password request to email
  @Post('auth/send_password_reset_request')
  @ApiTags('Auth')
  async sendResetPassToEmail(
    @Body() body: { email: string },
    @Res() res: Response,
  ) {
    return this.authservice.sendResetPassToEmail(body?.email, res);
  }

  //respond to reset password
  @Post('auth/reset_password')
  @ApiTags('Auth')
  async sendResetPass(
    @Body()
    body: { verificationToken: string; email: string; password: string },
    @Res() res: Response,
  ) {
    const { verificationToken: resetToken, email, password } = body;
    return this.authservice.resetPassword(resetToken, email, password, res);
  }

  //fetch user
  @Get('auth/complete_user/:userId')
  @ApiOkResponse({
    description:
      'Complete user detail response. Only logged-in account owner should be able to access this endpoint to fetch their own info',
    type: VerifyEmailResponseDTO,
  })
  @ApiTags('Auth')
  fetchUserDetails(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.authservice.fetchCompleteUserDetails(userId, req, res);
  }

  @Get('auth/search_user')
  @ApiTags('Auth')
  @ApiOkResponse({
    description:
      'Complete user detail response. Only logged-in account owner should be able to access this endpoint to fetch their own info',
    type: SearchUserResponseDTO,
  })
  searchUser(@Query('searchWord') searchWord: string, @Res() res: Response) {
    // return this.authservice.searchUser(searchWord, res);
    return this.authservice.searchUser(searchWord, res);
  }

  // @Post('auth/editUserSubType')
  // @ApiTags('Auth')
  // editUserSubType(@Body() body: any) {
  //   const { subType, userId } = body;
  //   return this.authservice.editUserSubscriptiontype({ subType, userId });
  // }

  // @Post('auth/editUserBundleAmount')
  // @ApiTags('Auth')
  // editUserBundleAmount(@Body() body: any) {
  //   // const { userId, bundle_type_variable, bundle_quantity_to_buy } = body;
  //   const { userId, frontendBundleName } = body;
  //   return this.authservice.editUserBundleAmount(userId, frontendBundleName);
  // }

  @Post('auth/edit_user_details')
  @ApiTags('Auth')
  @UseInterceptors(FileInterceptor('profilePic'))
  editUserDetails(
    @UploadedFile() profilePic: File,
    @Body() body: EditUserDetailsDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { userId, first_name, last_name, address, phone_number } = body;
    return this.authservice.editUserDetails(
      userId,
      first_name,
      last_name,
      profilePic,
      address,
      phone_number,
      req,
      res,
    );
  }

  @Post('auth/accept_govt_issued_id_card')
  @ApiTags('Auth')
  acceptGovermentIssuedIdCard(
    @Body() body: EditUserDetailsDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { userId, idCard } = body;
    return this.authservice.acceptGovermentIssuedIdCard(
      userId,
      idCard,
      req,
      res,
    );
  }

  @Post('auth/editUserSubType')
  @ApiTags('Auth')
  editUserSubType(@Body() body: EditUserSubTypeDTO) {
    const { subType, userId } = body;
    return this.authservice.editUserSubscriptiontype({ subType, userId });
  }

  @Post('auth/editUserBundleAmount')
  @ApiTags('Auth')
  editUserBundleAmount(@Body() body: EditUserBundleAmountDTO) {
    // const { userId, bundle_type_variable, bundle_quantity_to_buy } = body;
    const { userId, frontendBundleName } = body;
    return this.authservice.editUserBundleAmount(userId, frontendBundleName);
  }

  @Post('auth/upload_verification_docs/:userId')
  @ApiTags('Auth')
  @UseInterceptors(FilesInterceptor('files'))
  async acceptVerificationDocuments(
    @UploadedFiles() file: File,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.status(400).json('No file uploaded');
    }
    return this.authservice.acceptVerificationDocuments(file, userId, res);
  }

  @Get('auth/token_is_still_valid')
  @ApiTags('Auth')
  async tokenIsStillValid(@Req() req: Request, @Res() res: Response) {
    return this.authservice.tokenIsStillValid(req, res);
  }
}
