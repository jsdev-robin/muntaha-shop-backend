import { Document, Types } from 'mongoose';
import { IImg } from '../type';

export interface ISeller extends Document {
  _id: Types.ObjectId;
  fname: string;
  lname: string;
  email: string;
  avatar: IImg;
  role: 'seller' | 'admin';
  password?: string;
  isVerified?: boolean;
  isSocial?: boolean;
  correctPassword: (candidatePassword: string) => Promise<boolean>;
  signAccessToken: () => string;
  signRefreshToken: () => string;
}
