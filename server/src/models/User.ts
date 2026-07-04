import mongoose, { type Model, type HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IUser } from '../types/index.js';
import { isImmutableSuperAdminEmail } from '../config/superAdmins.js';

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export type UserModel = Model<IUser, object, IUserMethods>;
export type UserDoc = HydratedDocument<IUser, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['superAdmin', 'admin', 'visitor'],
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    isImmutableSuperAdmin: { type: Boolean, default: false },
    avatar: { type: String, default: '' },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

/**
 * Immutability guard — runs on EVERY save. The hardcoded super admins are
 * always re-asserted to a locked state regardless of what any
 * code/admin/API attempted, so they can never be demoted/disabled.
 */
userSchema.pre('save', function enforceImmutableSuperAdmin(next) {
  if (isImmutableSuperAdminEmail(this.email)) {
    this.role = 'superAdmin';
    this.status = 'active';
    this.isImmutableSuperAdmin = true;
  }
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User =
  (mongoose.models.User as UserModel) ||
  mongoose.model<IUser, UserModel>('User', userSchema);
export default User;
