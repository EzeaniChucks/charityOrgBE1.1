import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as request from 'request';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import * as emailjs from '@emailjs/nodejs';
// export const currency_array = [
//   { 'British Pound Sterling': 'GBP' },
//   { 'Canadian Dollar': 'CAD' },
//   { 'Central African CFA Franc': 'XAF' },
//   { 'Chilean Peso': 'CLP' },
//   { 'Colombian Peso': 'COP' },
//   { 'Egyptian Pound': 'EGP' },
//   { SEPA: 'EUR' },
//   { 'Ghanaian Cedi': 'GHS' },
//   { 'Guinean Franc': 'GNF' },
//   { 'Kenyan Shilling': 'KES' },
//   { 'Malawian Kwacha': 'MWK' },
//   { 'Moroccan Dirham': 'MAD' },
//   { 'Nigerian Naira': 'NGN' },
//   { 'Rwandan Franc': 'RWF' },
//   { 'Sierra Leonean Leone': 'SLL' },
//   { 'São Tomé and Príncipe dobra': 'STD' },
//   { 'South African Rand': 'ZAR' },
//   { 'Tanzanian Shilling': 'TZS' },
//   { 'Ugandan Shilling': 'UGX' },
//   { 'United States Dollar': 'USD' },
//   { 'West African CFA Franc BCEAO': 'XOF' },
//   { 'Zambian Kwacha': 'ZMW' },
// ];

export const createJwt = async (body: any) => {
  try {
    const token = await jwt.sign(body, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_LIFETIME,
    });
    return token;
  } catch (err) {
    throw new InternalServerErrorException({ msg: err.message });
  }
};
export const jwtIsValid = async (token: string) => {
  try {
    if (!token) {
      throw new ForbiddenException('forbidden request');
    }
    const isValid = await jwt.verify(token, process.env.JWT_SECRET);
    return isValid;
  } catch (err) {
    throw new InternalServerErrorException({ msg: err.message });
  }
};

export const attachCookiesToResponse = async (
  res: Response,
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    isAdmin: string;
  },
) => {
  const token = await jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME,
  });
  const oneDay = 1000 * 60 * 60 * 24;
  let value = res.cookie('accessToken', token, {
    httpOnly: true,
    expires: new Date(Date.now() + oneDay),
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  // console.log(value.req.signedCookies.accessToken)
};
export const currency_array = [
  'GBP',
  'CAD',
  'XAF',
  'CLP',
  'COP',
  'EGP',
  'EUR',
  'GHS',
  'GNF',
  'KES',
  'MWK',
  'MAD',
  'NGN',
  'RWF',
  'SLL',
  'STD',
  'ZAR',
  'TZS',
  'UGX',
  'USD',
  'XOF',
  'ZMW',
  'BTC',
  'ETH',
  'DAI',
  'USDC',
  'BCH',
  'LTC',
  'APE',
  'DOGE',
  'SHIB',
  'USDT',
  'MATIC',
];

const returnCurrency = (value: any) => {
  return value;
};

export const convertcurrency = async (
  from: string,
  to: string,
  amount: number,
) => {
  let url =
    'http://api.exchangeratesapi.io/v1/latest?access_key=440ba96caa3491b47c82c3ad055d8e52';
  const options = {
    method: 'GET',
    url,
  };
  var rate = 0;
  await request(options, async (error: any, response: any) => {
    if (error) {
      return error;
    }
    const resp = await JSON.parse(response.body);
    //if 1 euro == 497 NGN (from)
    //and 1 euro == 1.075 USD (to)
    //if  1.075USD === 497NGN
    //then amount NGN == amount/497 * 1.075
    if (resp.rates[from] && resp.rates[to]) {
      rate = (amount / resp.rates[from]) * resp.rates[to];
      return returnCurrency(rate);
    } else {
      throw new BadRequestException(
        'currency options might not be supported. Please contact customer support',
      );
    }
  });
  // console.log(cool);
  // if (rate) {
  //   return rate;
  // }
};

export const sendEmail = async (
  user: { firstName: string; lastName: string; email: string },
  message: string,
) => {
  return await emailjs.send(
    process.env.EmailServiceId,
    process.env.EmailTemplateId,
    {
      name: `${user?.firstName} ${user?.lastName}`,
      email: `${user?.email}`,
      message,
    },
    {
      publicKey: '7UpYhI4ulL04ybL_j',
      privateKey: 't-HI5fwlLdMx_qOM7QfRx',
    },
  );
};
