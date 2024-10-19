import { Request } from 'express';

export type Role = 'seller' | 'admin';

export interface ISellerSignupRequest extends Request {
  body: {
    fname: string;
    lname: string;
    email: string;
    password: string;
  };
}

export interface ISellerActivationRequest extends Request {
  body: {
    activationToken: string;
    otp: string;
  };
}

export interface ISellerSigninRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}
