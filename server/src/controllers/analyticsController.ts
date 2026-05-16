import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Visit } from '../models/Visit.js';
import { Message } from '../models/Message.js';
import { Project } from '../models/Project.js';
import { BlogPost } from '../models/BlogPost.js';

const deviceFromUA = (ua = ''): string => {
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
};

/** Public — record a lightweight, cookie-less analytics event. */
export const track = asyncHandler(async (req: Request, res: Response) => {
  const { type, path, ref } = (req.body ?? {}) as {
    type?: string;
    path?: string;
    ref?: string;
  };
  await Visit.create({
    type: (type as never) || 'pageview',
    path: path || '/',
    ref: ref || '',
    referrer: String(req.headers.referer || 'direct').slice(0, 200),
    device: deviceFromUA(req.headers['user-agent']),
  });
  res.json({ success: true });
});

/** Admin — aggregated dashboard summary. */
export const summary = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(90, parseInt(String(req.query.days)) || 30);
  const since = new Date(Date.now() - days * 86_400_000);

  const [
    totalViews,
    rangeViews,
    byDay,
    byType,
    byDevice,
    topProjects,
    topPosts,
    totals,
  ] = await Promise.all([
    Visit.countDocuments({ type: 'pageview' }),
    Visit.countDocuments({ type: 'pageview', createdAt: { $gte: since } }),
    Visit.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$day', views: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Visit.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Visit.aggregate([
      { $match: { type: 'pageview', createdAt: { $gte: since } } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]),
    Project.find().select('title slug views').sort({ views: -1 }).limit(5),
    BlogPost.find({ status: 'published' })
      .select('title slug views')
      .sort({ views: -1 })
      .limit(5),
    Promise.all([
      Project.countDocuments(),
      BlogPost.countDocuments({ status: 'published' }),
      Message.countDocuments(),
      Message.countDocuments({ read: false }),
    ]),
  ]);

  res.json({
    success: true,
    data: {
      range: { days, since },
      pageviews: { total: totalViews, range: rangeViews },
      byDay: byDay.map((d) => ({ date: d._id, views: d.views })),
      byType,
      byDevice,
      topProjects,
      topPosts,
      counts: {
        projects: totals[0],
        posts: totals[1],
        messages: totals[2],
        unread: totals[3],
      },
    },
  });
});
