import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
import { User, type UserDoc } from '../models/User.js';

const sanitize = (u: UserDoc) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  avatar: u.avatar,
  lastLogin: u.lastLogin,
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({
    email: String(email).toLowerCase(),
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password.');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken({ id: user._id.toString(), role: user.role });
  res.json({ success: true, token, user: sanitize(user) });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, user: sanitize(req.user as UserDoc) });
});

export const updatePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    if (!newPassword || newPassword.length < 8) {
      throw ApiError.badRequest('New password must be at least 8 characters.');
    }
    const user = await User.findById(req.user!._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      throw ApiError.unauthorized('Current password is incorrect.');
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  }
);

export const updateProfileMeta = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, avatar } = req.body as { name?: string; avatar?: string };
    const user = await User.findById(req.user!._id);
    if (!user) throw ApiError.notFound('Account not found');
    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, user: sanitize(user) });
  }
);
