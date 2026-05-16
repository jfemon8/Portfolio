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
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    const projects = await Project.find(filter).sort({
      featured: -1,
      order: 1,
      createdAt: -1,
    });
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
    if (project.coverPublicId) await destroyAsset(project.coverPublicId);
    for (const g of project.gallery) await destroyAsset(g.publicId);
    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  }
);
