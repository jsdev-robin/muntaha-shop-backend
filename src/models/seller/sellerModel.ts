import { CallbackWithoutResultAndOptionalError, Schema, model } from 'mongoose';
import { compare, hash } from 'bcryptjs';
import { ISeller } from './type';
import EnvConfig from '../../config/envConfig';
import Utils from '../../services/Utils';

const sellerSchema = new Schema<ISeller>(
  {
    fname: {
      type: String,
      trim: true,
    },
    lname: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      enum: ['seller', 'admin'],
      default: 'seller',
    },
    password: {
      type: String,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
    isSocial: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create a unique index on the email field to ensure that each email is unique in the database.
// This prevents duplicate entries for the email field and ensures that no two users can register with the same email.
sellerSchema.index({ email: 1 }, { unique: true });

// Virtual field to get the seller's full name by combining first name and last name
sellerSchema.virtual('fullName').get(function () {
  return `${this.fname} ${this.lname}`;
});

// Pre-save hook to hash the seller's password before saving if it's modified
sellerSchema.pre(
  'save',
  async function (this: ISeller, next: CallbackWithoutResultAndOptionalError) {
    try {
      // Check if the password is modified, if not, skip hashing
      if (!this.isModified('password')) {
        next();
        return;
      }

      // Hash the password with a salt factor of 14 and replace plain password
      const hashedPassword = await hash(this.password ?? '', 14);
      this.password = hashedPassword;

      next();
    } catch (error: unknown) {
      // Pass any errors to the next middleware
      next(error as Error);
    }
  }
);

// Method to compare provided password with the hashed password in the database
sellerSchema.methods.correctPassword = async function (
  this: ISeller,
  providePassword: string
) {
  return await compare(providePassword, this.password ?? '');
};

sellerSchema.methods.signAccessToken = function (this: ISeller) {
  return Utils.jwtCreator(
    { id: this._id },
    EnvConfig.ACCESS_TOKEN ?? '',
    EnvConfig.ACCESS_TOKEN_EXPIRE ?? '5m'
  );
};

sellerSchema.methods.signRefreshToken = function (this: ISeller) {
  return Utils.jwtCreator(
    { id: this._id },
    EnvConfig.REFRESH_TOKEN ?? '',
    EnvConfig.REFRESH_TOKEN_EXPIRE ?? '3d'
  );
};

// Create the Seller model from the schema and export it
const Seller = model<ISeller>('Seller', sellerSchema);
export default Seller;
