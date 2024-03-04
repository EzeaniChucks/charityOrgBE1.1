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
      if (!req.signedCookies.accessToken) {
        return res.status(400).json({msg:'Forbidden request'});
      }
      const isTokenValid = await jwtIsValid(req.signedCookies.accessToken);
      if (isTokenValid) {
        next();
      } else {
        return res.status(400).json({
          msg: 'Forbidden request. Token is expired or tampered with',
        });
      }
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  }
}
