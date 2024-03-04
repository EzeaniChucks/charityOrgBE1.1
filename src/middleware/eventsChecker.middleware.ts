import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { jwtIsValid } from 'src/util';

@Injectable()
export class EventsChecker implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // console.log(req.signedCookies);
    const isTokenValid = await jwtIsValid(req.signedCookies.accessToken);
    if (isTokenValid) {
      next();
    } else {
      return res
        .status(400)
        .json({ msg: 'Forbidden request. Token is expired or tampered with' });
    }
  }
}
