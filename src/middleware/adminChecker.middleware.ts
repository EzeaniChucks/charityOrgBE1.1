import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { jwtIsValid } from 'src/util';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminChecker implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // const decoded = await jwtIsValid(req?.signedCookies?.accessToken);
    try {
      const token = req?.headers?.authorization?.split(' ')[1];
      if (!token) {
        throw new ForbiddenException('Forbidden request');
      }
      // const isTokenValid = await jwtIsValid(req?.signedCookies?.accessToken);
      const isTokenValid = await jwtIsValid(token);
      // const isTokenValid = await jwtIsValid(req.signedCookies.accessToken);
      if (isTokenValid) {
        next();
        req['decodedAdmin'] = isTokenValid;
      } else {
        return res.status(400).json({
          msg: 'Forbidden request. Token is expired or tampered with',
        });
      }
    } catch (err) {
      throw new InternalServerErrorException({ msg: err.message });
    }
  }
}
