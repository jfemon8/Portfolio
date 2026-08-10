import { lazy, type ComponentType } from 'react';
import type { ToolKey } from '@/types';

// The single place a new tool gets wired up: a component under components/tools + one entry here + a ToolKey enum value (client + server types + Tool.key schema enum).
export const TOOL_COMPONENTS: Record<ToolKey, ComponentType> = {
  'jwt-decoder': lazy(() => import('@/components/tools/JwtDecoder')),
  'json-formatter': lazy(() => import('@/components/tools/JsonFormatter')),
  'regex-tester': lazy(() => import('@/components/tools/RegexTester')),
  'cp-profile-comparer': lazy(
    () => import('@/components/tools/CpProfileComparer')
  ),
  'cf-rating-predictor': lazy(
    () => import('@/components/tools/CfRatingPredictor')
  ),
};
