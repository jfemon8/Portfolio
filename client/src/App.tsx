import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLayout from '@/components/layout/PublicLayout';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import RequireRole from '@/components/admin/RequireRole';
import { Spinner } from '@/components/ui/States';
import Home from '@/pages/Home';

const Projects = lazy(() => import('@/pages/Projects'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'));
const Tools = lazy(() => import('@/pages/Tools'));
const ToolDetail = lazy(() => import('@/pages/ToolDetail'));
const Jobs = lazy(() => import('@/pages/Jobs'));
const JobDetail = lazy(() => import('@/pages/JobDetail'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Admin (code-split — never loaded by public visitors)
const AdminLogin = lazy(() => import('@/pages/admin/Login'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const ProfileManager = lazy(() => import('@/pages/admin/ProfileManager'));
const ExperienceManager = lazy(() => import('@/pages/admin/ExperienceManager'));
const ProjectsManager = lazy(() => import('@/pages/admin/ProjectsManager'));
const SkillsManager = lazy(() => import('@/pages/admin/SkillsManager'));
const EducationManager = lazy(() => import('@/pages/admin/EducationManager'));
const CredentialsManager = lazy(
  () => import('@/pages/admin/CredentialsManager')
);
const BlogManager = lazy(() => import('@/pages/admin/BlogManager'));
const BlogEditor = lazy(() => import('@/pages/admin/BlogEditor'));
const MessagesManager = lazy(() => import('@/pages/admin/MessagesManager'));
const AnalyticsManager = lazy(() => import('@/pages/admin/AnalyticsManager'));
const SettingsManager = lazy(() => import('@/pages/admin/SettingsManager'));
const SiteCopyManager = lazy(() => import('@/pages/admin/SiteCopyManager'));
const ToolsManager = lazy(() => import('@/pages/admin/ToolsManager'));
const UsersManager = lazy(() => import('@/pages/admin/UsersManager'));
const AuditLogViewer = lazy(() => import('@/pages/admin/AuditLogViewer'));
const MediaLibrary = lazy(() => import('@/pages/admin/MediaLibrary'));
const JobsManager = lazy(() => import('@/pages/admin/JobsManager'));

const Fallback = (
  <div className="grid min-h-screen place-items-center">
    <Spinner />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={Fallback}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/jobs" element={<Jobs />} />
          <Route path="/tools/jobs/:id" element={<JobDetail />} />
          <Route path="/tools/:slug" element={<ToolDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<ProfileManager />} />
          <Route path="experience" element={<ExperienceManager />} />
          <Route path="projects" element={<ProjectsManager />} />
          <Route path="skills" element={<SkillsManager />} />
          <Route path="education" element={<EducationManager />} />
          <Route path="credentials" element={<CredentialsManager />} />
          <Route path="blog" element={<BlogManager />} />
          <Route path="blog/new" element={<BlogEditor />} />
          <Route path="blog/:id/edit" element={<BlogEditor />} />
          <Route path="messages" element={<MessagesManager />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="analytics" element={<AnalyticsManager />} />
          <Route
            path="users"
            element={
              <RequireRole roles={['superAdmin']}>
                <UsersManager />
              </RequireRole>
            }
          />
          <Route
            path="audit"
            element={
              <RequireRole roles={['superAdmin']}>
                <AuditLogViewer />
              </RequireRole>
            }
          />
          <Route path="site-copy" element={<SiteCopyManager />} />
          <Route path="tools" element={<ToolsManager />} />
          <Route path="jobs" element={<JobsManager />} />
          <Route path="settings" element={<SettingsManager />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
