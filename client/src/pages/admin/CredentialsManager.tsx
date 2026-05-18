import { useState } from 'react';
import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import type { CertificationDoc, PublicationDoc } from '@/types';

const certConfig: ResourceConfig<CertificationDoc> = {
  title: 'Certifications & Achievements',
  subtitle: 'Certificates, awards and competitive-programming milestones.',
  singular: 'credential',
  base: 'certifications',
  defaults: { title: '', issuer: '', category: 'certification', order: 0 },
  fields: [
    { name: 'title', label: 'Title', type: 'text', full: true },
    { name: 'issuer', label: 'Issuer', type: 'text' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'certification', label: 'Certification' },
        { value: 'achievement', label: 'Achievement' },
      ],
    },
    { name: 'credentialUrl', label: 'Credential URL', type: 'url', full: true },
    { name: 'order', label: 'Order', type: 'number' },
  ],
  labelOf: (i) => i.title,
  renderItem: (i) => (
    <>
      <p className="font-semibold text-ink">{i.title}</p>
      <p className="text-xs text-ink-dim">
        {i.issuer} · <span className="capitalize">{i.category}</span>
      </p>
    </>
  ),
};

const pubConfig: ResourceConfig<PublicationDoc> = {
  title: 'Publications',
  subtitle: 'Research papers & articles.',
  singular: 'publication',
  base: 'publications',
  modalSize: 'lg',
  defaults: {
    title: '',
    venue: '',
    authors: '',
    year: '',
    url: '',
    abstract: '',
    order: 0,
  },
  fields: [
    { name: 'title', label: 'Title', type: 'text', full: true },
    { name: 'venue', label: 'Venue / Journal', type: 'text' },
    { name: 'year', label: 'Year', type: 'text' },
    { name: 'authors', label: 'Authors', type: 'text', full: true },
    { name: 'url', label: 'Link', type: 'url', full: true },
    {
      name: 'abstract',
      label: 'Abstract',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    { name: 'order', label: 'Order', type: 'number' },
  ],
  labelOf: (i) => i.title,
  renderItem: (i) => (
    <>
      <p className="font-semibold text-ink">{i.title}</p>
      <p className="text-xs text-ink-dim">
        {i.venue} {i.year && `· ${i.year}`}
      </p>
    </>
  ),
};

export default function CredentialsManager() {
  const [tab, setTab] = useState<'certs' | 'pubs'>('certs');
  return (
    <div>
      <div className="mb-6 flex gap-2">
        {(
          [
            { k: 'certs', l: 'Certifications & Achievements' },
            { k: 'pubs', l: 'Publications' },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
              tab === t.k
                ? 'border-primary/50 bg-primary/10 text-primary shadow-glow'
                : 'border-border/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>
      {tab === 'certs' ? (
        <ResourceManager config={certConfig} />
      ) : (
        <ResourceManager config={pubConfig} />
      )}
    </div>
  );
}
