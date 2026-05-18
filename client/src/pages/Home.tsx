import { useNavigate } from 'react-router-dom';
import Seo from '@/components/ui/Seo';
import { personSchema, websiteSchema } from '@/lib/structuredData';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useProfile } from '@/hooks/usePortfolio';
import { scrollToId } from '@/lib/smoothScroll';
import HeroPremium from '@/components/sections/HeroPremium';
import About from '@/components/sections/About';
import Skills from '@/components/sections/Skills';
import CpStats from '@/components/sections/CpStats';
import FeaturedProjects from '@/components/sections/FeaturedProjects';
import Experience from '@/components/sections/Experience';
import Education from '@/components/sections/Education';
import Credentials from '@/components/sections/Credentials';
import Contact from '@/components/sections/Contact';

export default function Home() {
  const { data, isLoading, isError, refetch } = useProfile();
  const navigate = useNavigate();
  const profile = data?.data;

  if (isLoading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner label="Loading portfolio…" />
      </div>
    );
  if (isError)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <ErrorState
          message="Couldn't reach the API. Is the backend running?"
          onRetry={() => void refetch()}
        />
      </div>
    );

  return (
    <>
      <Seo
        description={profile?.tagline || undefined}
        image={profile?.avatar || undefined}
        jsonLd={[personSchema(profile), websiteSchema()]}
      />
      <HeroPremium
        profile={profile}
        onContact={() => scrollToId('contact')}
        onProjects={() => navigate('/projects')}
      />
      <About profile={profile} />
      <Skills />
      <CpStats />
      <FeaturedProjects />
      <Experience />
      <Education />
      <Credentials />
      <Contact profile={profile} />
    </>
  );
}
