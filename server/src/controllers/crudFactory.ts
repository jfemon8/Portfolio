import type { Request, Response } from 'express';
import type { Model, RootFilterQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { destroyAsset } from '../config/cloudinary.js';

export interface CrudOptions {
  sort?: Record<string, 1 | -1>;
  /** Fields holding a Cloudinary publicId to clean up on delete. */
  imageFields?: string[];
}

interface ReorderItem {
  id: string;
  order: number;
}

/**
 * Generates standard list/get/create/update/delete handlers for a model.
 * Used by experience, skill, education, certification, publication.
 */
export const crudFactory = <T>(Model: Model<T>, opts: CrudOptions = {}) => {
  const sort = opts.sort ?? { order: 1, createdAt: -1 };
  const imageFields = opts.imageFields ?? [];

  const list = asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    if (req.query.featured === 'true') filter.featured = true;
    if (req.query.category) filter.category = req.query.category;
    const docs = await Model.find(filter as RootFilterQuery<T>).sort(sort);
    res.json({ success: true, count: docs.length, data: docs });
  });

  const getOne = asyncHandler(async (req: Request, res: Response) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${Model.modelName} not found`);
    res.json({ success: true, data: doc });
  });

  const create = asyncHandler(async (req: Request, res: Response) => {
    const doc = await Model.create(req.body);
    res.status(201).json({ success: true, data: doc });
  });

  const update = asyncHandler(async (req: Request, res: Response) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) throw ApiError.notFound(`${Model.modelName} not found`);
    res.json({ success: true, data: doc });
  });

  const remove = asyncHandler(async (req: Request, res: Response) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${Model.modelName} not found`);
    for (const f of imageFields) {
      const publicId = doc.get(f) as unknown;
      if (typeof publicId === 'string') await destroyAsset(publicId);
    }
    await doc.deleteOne();
    res.json({ success: true, message: `${Model.modelName} deleted` });
  });

  const reorder = asyncHandler(async (req: Request, res: Response) => {
    const items = req.body.items as ReorderItem[] | undefined;
    if (!Array.isArray(items)) throw ApiError.badRequest('items[] required');
    await Promise.all(
      items.map((i) => Model.findByIdAndUpdate(i.id, { order: i.order }))
    );
    res.json({ success: true, message: 'Reordered' });
  });

  return { list, getOne, create, update, remove, reorder };
};

export default crudFactory;
