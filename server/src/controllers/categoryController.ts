import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Category } from '../models/Category.js';
import type { CategoryScope } from '../types/index.js';

type DefaultCategory = { name: string; slug: string; order: number };

/** The legacy enum values that pre-existing Skill rows reference. Seeded
 *  once on first read so the public Skills section keeps rendering the
 *  same category tabs out of the box. Admins can rename / reorder / add /
 *  delete them freely after that. */
const DEFAULT_SKILL_CATEGORIES: DefaultCategory[] = [
  { name: 'Languages', slug: 'language', order: 0 },
  { name: 'Frameworks', slug: 'framework', order: 1 },
  { name: 'Databases', slug: 'database', order: 2 },
  { name: 'Tools', slug: 'tool', order: 3 },
  { name: 'Cloud', slug: 'cloud', order: 4 },
  { name: 'Concepts', slug: 'concept', order: 5 },
  { name: 'Other', slug: 'other', order: 6 },
];

/** Matches the categories the Tools seed script assigns — seeded once on first read of the tool scope, same idea as DEFAULT_SKILL_CATEGORIES. */
const DEFAULT_TOOL_CATEGORIES: DefaultCategory[] = [
  { name: 'Developer Utilities', slug: 'developer-utilities', order: 0 },
  {
    name: 'Competitive Programming',
    slug: 'competitive-programming',
    order: 1,
  },
];

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const parseScope = (value: unknown): CategoryScope =>
  value === 'tool' ? 'tool' : 'skill';

export const listCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const scope = parseScope(req.query.scope);
    const count = await Category.countDocuments({ scope });
    if (count === 0) {
      const defaults =
        scope === 'tool' ? DEFAULT_TOOL_CATEGORIES : DEFAULT_SKILL_CATEGORIES;
      // Only swallow the expected duplicate-key race (11000); log the rest.
      await Category.insertMany(
        defaults.map((d) => ({ ...d, scope })),
        { ordered: false }
      ).catch((err: unknown) => {
        if ((err as { code?: number })?.code !== 11000) {
          console.warn('Category default-seed failed:', err);
        }
      });
    }
    const docs = await Category.find({ scope })
      .sort({ order: 1, name: 1 })
      .lean();
    res.json({ success: true, count: docs.length, data: docs });
  }
);

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const name = String(req.body.name || '').trim();
    if (!name) throw ApiError.badRequest('Name is required');
    const scope = parseScope(req.body.scope);
    const slug = req.body.slug ? slugify(String(req.body.slug)) : slugify(name);
    if (!slug) throw ApiError.badRequest('Slug could not be derived from name');
    const existing = await Category.findOne({ slug, scope });
    if (existing) throw ApiError.badRequest(`Slug "${slug}" already exists`);
    const doc = await Category.create({
      name,
      slug,
      scope,
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
        // Scoped to the category's own (immutable) scope, not a caller-supplied one — a rename can't accidentally jump namespaces.
        const conflict = await Category.findOne({
          slug: next,
          scope: doc.scope,
        });
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
