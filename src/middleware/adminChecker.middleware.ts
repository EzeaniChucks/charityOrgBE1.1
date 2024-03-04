import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { jwtIsValid } from 'src/util';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminChecker implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const decoded = await jwtIsValid(req?.signedCookies?.accessToken);
    // console.log('req cookies:', req?.signedCookies, 'decoded:', decoded);
    req['decodedAdmin'] = decoded;
    // return res.status(200).json('you hit here');
    next();
  }
}
