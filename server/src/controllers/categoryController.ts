import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Category } from '../models/Category.js';

/** The legacy enum values that pre-existing Skill rows reference. Seeded
 *  once on first read so the public Skills section keeps rendering the
 *  same category tabs out of the box. Admins can rename / reorder / add /
 *  delete them freely after that. */
const DEFAULT_CATEGORIES: { name: string; slug: string; order: number }[] = [
  { name: 'Languages', slug: 'language', order: 0 },
  { name: 'Frameworks', slug: 'framework', order: 1 },
  { name: 'Databases', slug: 'database', order: 2 },
  { name: 'Tools', slug: 'tool', order: 3 },
  { name: 'Cloud', slug: 'cloud', order: 4 },
  { name: 'Concepts', slug: 'concept', order: 5 },
  { name: 'Other', slug: 'other', order: 6 },
];

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const listCategories = asyncHandler(
  async (_req: Request, res: Response) => {
    const count = await Category.estimatedDocumentCount();
    if (count === 0) {
      // Idempotent seed — uses `slug` unique index so a parallel insert
      // can't create duplicates.
      await Category.insertMany(DEFAULT_CATEGORIES, { ordered: false }).catch(
        () => undefined
      );
    }
    const docs = await Category.find().sort({ order: 1, name: 1 });
    res.json({ success: true, count: docs.length, data: docs });
  }
);

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const name = String(req.body.name || '').trim();
    if (!name) throw ApiError.badRequest('Name is required');
    const slug = req.body.slug ? slugify(String(req.body.slug)) : slugify(name);
    if (!slug) throw ApiError.badRequest('Slug could not be derived from name');
    const existing = await Category.findOne({ slug });
    if (existing) throw ApiError.badRequest(`Slug "${slug}" already exists`);
    const doc = await Category.create({
      name,
      slug,
      order: Number(req.body.order) || 0,
    });
    res.status(201).json({ success: true, data: doc });
  }
);

export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const doc = await Category.findById(req.params.id);
    if (!doc) throw ApiError.notFound('Category not found');
    const patch: Partial<{ name: string; slug: string; order: number }> = {};
    if (typeof req.body.name === 'string') patch.name = req.body.name.trim();
    if (typeof req.body.slug === 'string') {
      const next = slugify(req.body.slug);
      if (!next) throw ApiError.badRequest('Invalid slug');
      if (next !== doc.slug) {
        const conflict = await Category.findOne({ slug: next });
        if (conflict)
          throw ApiError.badRequest(`Slug "${next}" already exists`);
        patch.slug = next;
      }
    }
    if (typeof req.body.order === 'number') patch.order = req.body.order;
    Object.assign(doc, patch);
    await doc.save();
    res.json({ success: true, data: doc });
  }
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const doc = await Category.findById(req.params.id);
    if (!doc) throw ApiError.notFound('Category not found');
    await doc.deleteOne();
    res.json({ success: true, message: 'Category deleted' });
  }
);
