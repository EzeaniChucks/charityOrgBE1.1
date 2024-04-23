import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { jwtIsValid } from 'src/util';

@Injectable()
export class VirtualCardsChecker implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req?.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new ForbiddenException('Forbidden request');
      }
      // const isTokenValid = await jwtIsValid(req?.signedCookies?.accessToken);
      const isTokenValid = await jwtIsValid(token);
      // const isTokenValid = await jwtIsValid(req.signedCookies.accessToken);
      if (isTokenValid) {
        next();
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
