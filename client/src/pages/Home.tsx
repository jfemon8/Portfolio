import { Fragment, type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Seo from '@/components/ui/Seo';
import {
  personSchema,
  websiteSchema,
  profilePageSchema,
} from '@/lib/structuredData';

import { Spinner, ErrorState } from '@/components/ui/States';
import { useProfile, useSiteSettings } from '@/hooks/usePortfolio';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import { HOME_SECTIONS } from '@/config/homeSections';
import { scrollToId } from '@/lib/smoothScroll';

import HeroPremium from '@/components/sections/HeroPremium';
import About from '@/components/sections/About';
import Skills from '@/components/sections/Skills';
import CpStats from '@/components/sections/CpStats';
import FeaturedProjects from '@/components/sections/FeaturedProjects';
import Experience from '@/components/sections/Experience';
import Education from '@/components/sections/Education';
import Research from '@/components/sections/Research';
import Credentials from '@/components/sections/Credentials';
import Contact from '@/components/sections/Contact';

export default function Home() {
  const { data, isLoading, isError, refetch } = useProfile();
  const { data: siteData } = useSiteSettings();

  const navigate = useNavigate();

  const profile = data?.data;

  const st = useSiteCopy('states', {
    homeLoading: 'Loading Portfolio…',
    homeError: "Couldn't Reach The API. Is The Backend Running?",
  });

  useEffect(() => {
    // Don't try to scroll while data is still loading
    if (isLoading || isError) return;

    const hash = window.location.hash;

    // No #section in URL
    if (!hash) return;

    const id = decodeURIComponent(hash.substring(1));

    // Wait for animations/content to appear
    const timer = window.setTimeout(() => {
      const element = document.getElementById(id);

      if (!element) return;

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoading, isError, siteData]);

  /*
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner label={st.homeLoading} />
      </div>
    );
  }

  /*
   * Error state
   */
  if (isError) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <ErrorState message={st.homeError} onRetry={() => void refetch()} />
      </div>
    );
  }

  /*
   * HOME_SECTIONS remains the source of truth.
   */
  const sectionEl: Record<string, ReactNode> = {
    about: <About profile={profile} />,
    skills: <Skills />,
    cp: <CpStats />,
    projects: <FeaturedProjects />,
    experience: <Experience />,
    education: <Education />,
    research: <Research />,
    credentials: <Credentials />,
    contact: <Contact profile={profile} />,
  };

  const known = HOME_SECTIONS.map((s) => s.key);

  const cfg = (siteData?.data?.sections ?? []).filter((c) =>
    known.includes(c.key)
  );

  const inCfg = new Set(cfg.map((c) => c.key));

  const keys = cfg.length
    ? [
        ...cfg.filter((c) => c.visible).map((c) => c.key),
        ...known.filter((k) => !inCfg.has(k)),
      ]
    : known;

  /*
   * Render page
   */
  return (
    <>
      <Seo
        type="profile"
        description={profile?.tagline || undefined}
        image={profile?.avatar || undefined}
        jsonLd={[personSchema(profile), websiteSchema(), profilePageSchema()]}
      />

      <HeroPremium
        profile={profile}
        background={siteData?.data?.heroBackground || undefined}
        onContact={() => scrollToId('contact')}
        onProjects={() => navigate('/projects')}
      />

      {keys.map((k) => (
        <Fragment key={k}>{sectionEl[k]}</Fragment>
      ))}
    </>
  );
}
