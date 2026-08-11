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
  'bigo-benchmark': lazy(() => import('@/components/tools/BigOBenchmark')),
  'password-crack-time': lazy(
    () => import('@/components/tools/PasswordCrackTime')
  ),
  'resume-ats-xray': lazy(() => import('@/components/tools/ResumeAtsXray')),
  'pdf-power-tools': lazy(() => import('@/components/tools/PdfPowerTools')),
  'music-remover': lazy(() => import('@/components/tools/MusicRemover')),
};
