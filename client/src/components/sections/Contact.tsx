import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, Phone, MapPin, Send, Loader2, type LucideIcon } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Section';
import Reveal from '@/components/ui/Reveal';
import { api } from '@/lib/api';
import type { ApiError, ProfileDoc } from '@/types';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface InfoItem {
  icon: LucideIcon;
  label: string;
  value?: string;
  href?: string;
}

export default function Contact({ profile }: { profile?: ProfileDoc }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>();

  const onSubmit = async (values: ContactForm): Promise<void> => {
    try {
      const { data } = await api.post<{ message: string }>(
        '/messages',
        values
      );
      toast.success(data.message || 'Message sent!');
      reset();
    } catch (err) {
      toast.error(
        (err as ApiError).message || 'Failed to send. Please try again.'
      );
    }
  };

  const info: InfoItem[] = [
    {
      icon: Mail,
      label: 'Email',
      value: profile?.email,
      href: `mailto:${profile?.email}`,
    },
    {
      icon: Phone,
      label: 'Phone',
      value: profile?.phone,
      href: `tel:${profile?.phone}`,
    },
    { icon: MapPin, label: 'Location', value: profile?.location },
  ];

  return (
    <Section id="contact">
      <SectionHeading
        index="07."
        title="Get in touch"
        subtitle="Have a project, role or just want to say hi? My inbox is open."
      />

      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <div className="space-y-4">
            {info.map((c) => (
              <a
                key={c.label}
                href={c.href || undefined}
                className="glass glass-hover flex items-center gap-4 p-5"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-neon/30 bg-bg-elevated text-neon">
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-ink-dim">
                    {c.label}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{c.value}</p>
                </div>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="glass space-y-4 p-6 sm:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  placeholder="Your name"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-neon-pink">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  placeholder="you@example.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email',
                    },
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-neon-pink">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                placeholder="What's this about?"
                {...register('subject')}
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                rows={5}
                className="input resize-none"
                placeholder="Tell me about your project or opportunity…"
                {...register('message', {
                  required: 'Message is required',
                  minLength: { value: 10, message: 'At least 10 characters' },
                })}
              />
              {errors.message && (
                <p className="mt-1 text-xs text-neon-pink">
                  {errors.message.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  Send message <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </Reveal>
      </div>
    </Section>
  );
}
