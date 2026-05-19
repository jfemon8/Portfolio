import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import toast from 'react-hot-toast';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import { useSiteCopy } from '@/hooks/useSiteCopy';
import Reveal from '@/components/motion/Reveal';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { ApiError, ProfileDoc } from '@/types';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface InfoItem {
  id: string;
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
  const [sent, setSent] = useState(false);
  const reduce = useReducedMotion();
  const f = useSiteCopy('forms', {
    nameLabel: 'Name',
    namePlaceholder: 'Your name',
    nameRequired: 'Name is required',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    emailRequired: 'Email is required',
    emailInvalid: 'Enter a valid email',
    subjectLabel: 'Subject',
    subjectPlaceholder: "What's this about?",
    messageLabel: 'Message',
    messagePlaceholder: 'Tell me about your project or opportunity…',
    messageRequired: 'Message is required',
    messageMin: 'At least 10 characters',
    send: 'Send message',
    sending: 'Sending…',
    sentTitle: 'Message sent',
    sentBody:
      "Thanks for reaching out — I'll get back to you as soon as I can.",
    sendAnother: 'Send another',
    sentToast: 'Message sent!',
    failToast: 'Failed to send. Please try again.',
    infoEmail: 'Email',
    infoPhone: 'Phone',
    infoLocation: 'Location',
  });

  const onSubmit = async (values: ContactForm): Promise<void> => {
    try {
      const { data } = await api.post<{ message: string }>('/messages', values);
      toast.success(data.message || f.sentToast);
      reset();
      setSent(true);
    } catch (err) {
      toast.error((err as ApiError).message || f.failToast);
    }
  };

  const info: InfoItem[] = [
    {
      id: 'email',
      icon: Mail,
      label: f.infoEmail,
      value: profile?.email,
      href: `mailto:${profile?.email}`,
    },
    {
      id: 'phone',
      icon: Phone,
      label: f.infoPhone,
      value: profile?.phone,
      href: `tel:${profile?.phone}`,
    },
    {
      id: 'location',
      icon: MapPin,
      label: f.infoLocation,
      value: profile?.location,
    },
  ];
  const copy = useSectionCopy('contact', {
    index: '07.',
    title: 'Get in touch',
    subtitle: 'Have a project, role or just want to say hi? My inbox is open.',
  });

  return (
    <Section id="contact">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <div className="space-y-4">
            {info.map((c) => (
              <a key={c.id} href={c.href || undefined}>
                <GlassCard interactive className="flex items-center gap-4 p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/30 bg-card/60 text-neon">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      {c.label}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.value}
                    </p>
                  </div>
                </GlassCard>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassCard className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="sent"
                  initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <motion.span
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 18,
                    }}
                    className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-neon"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                  </motion.span>
                  <h3 className="text-xl font-bold text-foreground">
                    {f.sentTitle}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    {f.sentBody}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6"
                    onClick={() => setSent(false)}
                  >
                    {f.sendAnother}
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">{f.nameLabel}</label>
                      <input
                        className="input"
                        placeholder={f.namePlaceholder}
                        {...register('name', { required: f.nameRequired })}
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="label">{f.emailLabel}</label>
                      <input
                        className="input"
                        placeholder={f.emailPlaceholder}
                        {...register('email', {
                          required: f.emailRequired,
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: f.emailInvalid,
                          },
                        })}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="label">{f.subjectLabel}</label>
                    <input
                      className="input"
                      placeholder={f.subjectPlaceholder}
                      {...register('subject')}
                    />
                  </div>
                  <div>
                    <label className="label">{f.messageLabel}</label>
                    <textarea
                      rows={5}
                      className="input resize-none"
                      placeholder={f.messagePlaceholder}
                      {...register('message', {
                        required: f.messageRequired,
                        minLength: {
                          value: 10,
                          message: f.messageMin,
                        },
                      })}
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.message.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {f.sending}
                      </>
                    ) : (
                      <>
                        {f.send} <Send className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </GlassCard>
        </Reveal>
      </div>
    </Section>
  );
}
