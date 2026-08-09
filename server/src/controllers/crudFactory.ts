import type { Request, Response } from 'express';
import mongoose, { type Model, type RootFilterQuery } from 'mongoose';
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

export const crudFactory = <T>(Model: Model<T>, opts: CrudOptions = {}) => {
  const sort = opts.sort ?? { order: 1, createdAt: -1 };
  const imageFields = opts.imageFields ?? [];

  const list = asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    if (req.query.featured === 'true') filter.featured = true;
    // Coerce to a primitive string so a crafted object like ?category[$ne]=x can't inject a Mongo query operator.
    if (req.query.category) filter.category = String(req.query.category);

    let query = Model.find(filter as RootFilterQuery<T>)
      .sort(sort)
      .lean();
    const limit = Number(req.query.limit);
    if (Number.isFinite(limit) && limit > 0) {
      const page = Math.max(1, Number(req.query.page) || 1);
      query = query.skip((page - 1) * limit).limit(Math.min(limit, 200));
    }
    const docs = await query;
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
    await Promise.all(
      imageFields.map((f) => {
        const publicId = doc.get(f) as unknown;
        return typeof publicId === 'string'
          ? destroyAsset(publicId)
          : undefined;
      })
    );
    await doc.deleteOne();
    res.json({ success: true, message: `${Model.modelName} deleted` });
  });

  const reorder = asyncHandler(async (req: Request, res: Response) => {
    const items = req.body.items as ReorderItem[] | undefined;
    if (!Array.isArray(items)) throw ApiError.badRequest('items[] required');
    if (items.length > 500) throw ApiError.badRequest('Too many items');
    // Validate the whole payload up front — the old parallel findByIdAndUpdate could commit some writes before rejecting a malformed id/order, leaving the list half-reordered.
    for (const i of items) {
      if (
        !mongoose.isValidObjectId(i.id) ||
        !Number.isFinite(Number(i.order))
      ) {
        throw ApiError.badRequest('Invalid reorder payload');
      }
    }
    if (items.length) {
      // One atomic bulkWrite round-trip; cast is safe since every reorderable model has an `order` field.
      const ops = items.map((i) => ({
        updateOne: {
          filter: { _id: i.id },
          update: { $set: { order: Number(i.order) } },
        },
      })) as unknown as Parameters<typeof Model.bulkWrite>[0];
      await Model.bulkWrite(ops);
    }
    res.json({ success: true, message: 'Reordered' });
  });

  return { list, getOne, create, update, remove, reorder };
};

export default crudFactory;
