import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/userService.js';

/** GET /users (superAdmin) */
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const data = await userService.listUsers();
  res.json({ success: true, count: data.length, data });
});

/** POST /users (superAdmin) */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role?: userService.AssignableRole;
  };
  const user = await userService.createUser(
    { name, email, password, role },
    req
  );
  res.status(201).json({ success: true, data: user });
});

/** PATCH /users/:id (superAdmin) */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, role, status } = req.body as {
    name?: string;
    role?: userService.AssignableRole;
    status?: 'active' | 'disabled';
  };
  const user = await userService.updateUser(
    req.params.id as string,
    { name, role, status },
    req
  );
  res.json({ success: true, data: user });
});

/** DELETE /users/:id (superAdmin) */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteUser(req.params.id as string, req);
  res.json({ success: true, message: 'User deleted.' });
});
