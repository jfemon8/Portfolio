import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Project } from '../models/Project.js';
import { destroyAsset } from '../config/cloudinary.js';

/** Public list (supports ?featured=true & ?category=). */
export const listProjects = asyncHandler(
  async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    if (req.query.featured === 'true') filter.featured = true;
    // Coerce to a primitive string so a crafted object like ?category[$ne]=x can't inject a Mongo query operator.
    if (req.query.category && req.query.category !== 'all') {
      filter.category = String(req.query.category);
    }
    let query = Project.find(filter)
      .sort({ featured: -1, order: 1, createdAt: -1 })
      .lean();
    // Pagination is opt-in via ?limit=.
    const limit = Number(req.query.limit);
    if (Number.isFinite(limit) && limit > 0) {
      const page = Math.max(1, Number(req.query.page) || 1);
      query = query.skip((page - 1) * limit).limit(Math.min(limit, 200));
    }
    const projects = await query;
    res.json({ success: true, count: projects.length, data: projects });
  }
);

/** Public detail by slug — increments a view counter. */
export const getProjectBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const project = await Project.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!project) throw ApiError.notFound('Project not found');
    res.json({ success: true, data: project });
  }
);

export const getProjectById = asyncHandler(
  async (req: Request, res: Response) => {
    const project = await Project.findById(req.params.id);
    if (!project) throw ApiError.notFound('Project not found');
    res.json({ success: true, data: project });
  }
);

export const createProject = asyncHandler(
  async (req: Request, res: Response) => {
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, data: project });
  }
);

export const updateProject = asyncHandler(
  async (req: Request, res: Response) => {
    const project = await Project.findById(req.params.id);
    if (!project) throw ApiError.notFound('Project not found');
    project.set(req.body);
    await project.save();
    res.json({ success: true, data: project });
  }
);

export const deleteProject = asyncHandler(
  async (req: Request, res: Response) => {
    const project = await Project.findById(req.params.id);
    if (!project) throw ApiError.notFound('Project not found');
    await Promise.all([
      project.coverPublicId ? destroyAsset(project.coverPublicId) : undefined,
      ...project.gallery.map((g) => destroyAsset(g.publicId)),
    ]);
    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  }
);
