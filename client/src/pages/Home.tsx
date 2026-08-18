import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import Seo from '@/components/ui/Seo';
import {
  personSchema,
  websiteSchema,
  profilePageSchema,
} from '@/lib/structuredData';

import { useProfile, useSiteSettings } from '@/hooks/usePortfolio';
import { HOME_SECTIONS } from '@/config/homeSections';
import { getOrder, rememberOrder } from '@/stores/layoutHints';
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

const ORDER_HINT = 'home-sections';

export default function Home() {
  const { data } = useProfile();
  const { data: siteData, isPending: sitePending } = useSiteSettings();

  const navigate = useNavigate();

  const profile = data?.data;

  // Hash-scroll for `/#section` is handled centrally by PublicLayout.

  // HOME_SECTIONS remains the source of truth.
  const sectionEl: Record<string, ReactNode> = {
    about: <About />,
    skills: <Skills />,
    cp: <CpStats />,
    projects: <FeaturedProjects />,
    experience: <Experience />,
    education: <Education />,
    research: <Research />,
    credentials: <Credentials />,
    contact: <Contact />,
  };

  const known = HOME_SECTIONS.map((s) => s.key);

  const cfg = (siteData?.data?.sections ?? []).filter((c) =>
    known.includes(c.key)
  );

  const inCfg = new Set(cfg.map((c) => c.key));

  const resolved = cfg.length
    ? [
        ...cfg.filter((c) => c.visible).map((c) => c.key),
        ...known.filter((k) => !inCfg.has(k)),
      ]
    : known;

  // Sections mount before the settings query resolves, so the last-known order stands in rather than letting them visibly re-shuffle.
  const [hinted] = useState(() => getOrder(ORDER_HINT));
  const keys =
    sitePending && hinted ? hinted.filter((k) => known.includes(k)) : resolved;

  const orderKey = keys.join(',');
  useEffect(() => {
    if (!sitePending) rememberOrder(ORDER_HINT, orderKey.split(','));
  }, [sitePending, orderKey]);

  // Every section owns its own loading state, so none of them waits on another.
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
