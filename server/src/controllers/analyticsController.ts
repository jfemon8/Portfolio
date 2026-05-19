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

/** Coarse browser family from UA — privacy-friendly, no fingerprinting. */
const browserFromUA = (ua = ''): string => {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'unknown';
};

/**
 * Country code from Vercel's native geo header (edge-injected). We store
 * ONLY the 2-letter code — never the IP — so it stays privacy-friendly and
 * needs no GeoIP dependency. Empty locally / on non-Vercel hosts.
 */
const countryFromReq = (req: Request): string => {
  const h = req.headers['x-vercel-ip-country'];
  const raw = Array.isArray(h) ? h[0] : h;
  return (raw || '').toUpperCase().slice(0, 2);
};

/** Clamp a scroll-depth value to an integer 0–100. */
const clampDepth = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};

/** Public — record a lightweight, cookie-less analytics event. */
export const track = asyncHandler(async (req: Request, res: Response) => {
  const { type, path, ref, sid, depth } = (req.body ?? {}) as {
    type?: string;
    path?: string;
    ref?: string;
    sid?: string;
    depth?: number;
  };
  await Visit.create({
    type: (type as never) || 'pageview',
    path: path || '/',
    ref: ref || '',
    referrer: String(req.headers.referer || 'direct').slice(0, 200),
    device: deviceFromUA(req.headers['user-agent']),
    browser: browserFromUA(req.headers['user-agent']),
    country: countryFromReq(req),
    sid: String(sid || '').slice(0, 40),
    depth: clampDepth(depth),
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
    sessionsAgg,
    byDay,
    byType,
    byDevice,
    byBrowser,
    byCountry,
    scrollDepth,
    topProjects,
    topPosts,
    totals,
  ] = await Promise.all([
    Visit.countDocuments({ type: 'pageview' }),
    Visit.countDocuments({ type: 'pageview', createdAt: { $gte: since } }),
    Visit.aggregate([
      { $match: { createdAt: { $gte: since }, sid: { $ne: '' } } },
      { $group: { _id: '$sid' } },
      { $count: 'n' },
    ]),
    Visit.aggregate([
      { $match: { type: 'pageview', createdAt: { $gte: since } } },
      { $group: { _id: '$day', views: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Visit.aggregate([
      // scroll_depth has its own funnel — keep the events list meaningful
      { $match: { type: { $ne: 'scroll_depth' }, createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Visit.aggregate([
      { $match: { type: 'pageview', createdAt: { $gte: since } } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]),
    Visit.aggregate([
      { $match: { type: 'pageview', createdAt: { $gte: since } } },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Visit.aggregate([
      {
        $match: {
          type: 'pageview',
          createdAt: { $gte: since },
          country: { $nin: ['', null] },
        },
      },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Visit.aggregate([
      { $match: { type: 'scroll_depth', createdAt: { $gte: since } } },
      { $group: { _id: '$depth', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
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
      sessions: sessionsAgg[0]?.n ?? 0,
      byDay: byDay.map((d) => ({ date: d._id, views: d.views })),
      byType,
      byDevice,
      byBrowser,
      byCountry,
      scrollDepth,
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
