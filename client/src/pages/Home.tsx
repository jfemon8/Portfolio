import { useNavigate } from 'react-router-dom';
import Seo from '@/components/ui/Seo';
import { Spinner, ErrorState } from '@/components/ui/States';
import { useProfile } from '@/hooks/usePortfolio';
import Hero from '@/components/sections/Hero';
import About from '@/components/sections/About';
import Skills from '@/components/sections/Skills';
import FeaturedProjects from '@/components/sections/FeaturedProjects';
import Experience from '@/components/sections/Experience';
import Education from '@/components/sections/Education';
import Credentials from '@/components/sections/Credentials';
import Contact from '@/components/sections/Contact';

export default function Home() {
  const { data, isLoading, isError, refetch } = useProfile();
  const navigate = useNavigate();
  const profile = data?.data;

  const scrollTo = (id: string): void =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

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
      <Seo />
      <Hero
        profile={profile}
        onContact={() => scrollTo('contact')}
        onProjects={() => navigate('/projects')}
      />
      <About profile={profile} />
      <Skills />
      <FeaturedProjects />
      <Experience />
      <Education />
      <Credentials />
      <Contact profile={profile} />
    </>
  );
}
