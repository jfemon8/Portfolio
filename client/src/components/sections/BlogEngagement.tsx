import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareReply, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/admin/ConfirmModal';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/date';
import { BLOG_REACTION_META, BLOG_REACTIONS } from '@/lib/blog';
import type { BlogCommentDoc, BlogEngagement, BlogReactionType } from '@/types';

type CommentNode = BlogCommentDoc & { replies: CommentNode[] };

type CommentErrors = {
  name?: string;
  email?: string;
  content?: string;
};

const validateCommentName = (value: string): string | undefined =>
  value.trim() ? undefined : 'Please enter your name.';

const validateCommentEmail = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    ? undefined
    : 'Please enter a valid email address.';
};

const validateCommentContent = (value: string): string | undefined =>
  value.trim() ? undefined : 'Please enter a comment.';

const validateCommentFields = (
  name: string,
  email: string,
  content: string
): CommentErrors => ({
  name: validateCommentName(name),
  email: validateCommentEmail(email),
  content: validateCommentContent(content),
});

const buildTree = (comments: BlogCommentDoc[]): CommentNode[] => {
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((comment) => {
    nodes.set(comment._id, { ...comment, replies: [] });
  });

  comments.forEach((comment) => {
    const node = nodes.get(comment._id);
    if (!node) return;
    const parentId = comment.parentComment;
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.replies.push(node);
      return;
    }
    roots.push(node);
  });

  return roots;
};

interface BlogEngagementProps {
  slug: string;
  visitorKey: string;
  engagement: BlogEngagement;
}

export default function BlogEngagement({
  slug,
  visitorKey,
  engagement,
}: BlogEngagementProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canModerate = user?.role === 'admin' || user?.role === 'superAdmin';
  const [activeReaction, setActiveReaction] = useState<BlogReactionType | null>(
    engagement.visitorReaction
  );
  const [replyTo, setReplyTo] = useState<BlogCommentDoc | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<CommentErrors>({});
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveReaction(engagement.visitorReaction);
  }, [engagement.visitorReaction]);

  const reactionCounts = useMemo(() => {
    const counts = Object.fromEntries(
      BLOG_REACTIONS.map((r) => [r, 0])
    ) as Record<BlogReactionType, number>;
    engagement.reactions.forEach((item) => {
      counts[item._id] = item.count;
    });
    return counts;
  }, [engagement.reactions]);

  const thread = useMemo(
    () => buildTree(engagement.comments),
    [engagement.comments]
  );

  const validateAll = (): CommentErrors =>
    validateCommentFields(name, email, content);

  const clearError = (field: keyof CommentErrors): void => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const reactionMutation = useMutation({
    mutationFn: async (reaction: BlogReactionType) =>
      (await api.post(`/blog/slug/${slug}/reactions`, { reaction, visitorKey }))
        .data,
    onSuccess: (_data, reaction) => {
      setActiveReaction(reaction);
      qc.invalidateQueries({ queryKey: ['blog', 'post', slug] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { message?: string })?.message || 'Could not save reaction'
      );
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/blog/slug/${slug}/comments`, {
          name,
          email: email.trim() || undefined,
          content,
          parentCommentId: replyTo?._id,
        })
      ).data,
    onSuccess: () => {
      toast.success(replyTo ? 'Reply posted' : 'Comment posted');
      setContent('');
      setEmail('');
      setName('');
      setErrors({});
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['blog', 'post', slug] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { message?: string })?.message || 'Could not post comment'
      );
    },
  });

  const submitComment = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const nextErrors = validateAll();
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.content) return;
    commentMutation.mutate();
  };

  const focusComposer = (): void => {
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  return (
    <div className="mt-16 border-t border-border/60 pt-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-foreground">
          Reactions & Comments
        </h2>
        <span className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          {engagement.totalReactions} Reactions · {engagement.totalComments}{' '}
          Comments
        </span>
      </div>

      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {BLOG_REACTIONS.map((reaction) => {
            const meta = BLOG_REACTION_META[reaction];
            const selected = activeReaction === reaction;
            return (
              <button
                key={reaction}
                type="button"
                onClick={() => void reactionMutation.mutate(reaction)}
                disabled={reactionMutation.isPending}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                  selected
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border/70 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span className="text-xs text-muted-foreground/70">
                  {reactionCounts[reaction]}
                </span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <div ref={formRef} className="mt-6 space-y-6">
        <GlassCard className="w-full p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">
                {replyTo ? `Reply To ${replyTo.name}` : 'Leave a comment'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Share a thought or reply directly to someone in the thread.
              </p>
            </div>
            {replyTo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
              >
                Cancel Reply
              </Button>
            )}
          </div>

          <form className="space-y-4" onSubmit={submitComment} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) clearError('name');
                  }}
                  onBlur={() => {
                    setErrors((current) => ({
                      ...current,
                      name: validateCommentName(name),
                    }));
                  }}
                  placeholder="Your name"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) clearError('email');
                  }}
                  onBlur={() => {
                    setErrors((current) => ({
                      ...current,
                      email: validateCommentEmail(email),
                    }));
                  }}
                  placeholder="you@example.com"
                  type="text"
                  inputMode="email"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="label">Comment</label>
              <textarea
                className="input min-h-32 resize-y"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errors.content) clearError('content');
                }}
                onBlur={() => {
                  setErrors((current) => ({
                    ...current,
                    content: validateCommentContent(content),
                  }));
                }}
                placeholder={
                  replyTo
                    ? `Write A Reply To ${replyTo.name}…`
                    : 'Write Your Comment…'
                }
              />
              {errors.content && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.content}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {replyTo ? (
                <button
                  type="button"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={focusComposer}
                >
                  <MessageSquareReply className="mr-1 inline-block h-4 w-4" />
                  Replying to {replyTo.name}
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Be constructive and keep it brief.
                </span>
              )}
              <Button
                type="submit"
                disabled={
                  commentMutation.isPending || !name.trim() || !content.trim()
                }
              >
                <Send className="h-4 w-4" />
                {commentMutation.isPending
                  ? 'Posting…'
                  : replyTo
                    ? 'Post Reply'
                    : 'Post Comment'}
              </Button>
            </div>
          </form>
        </GlassCard>

        <div className="w-full space-y-4">
          {thread.length === 0 ? (
            <GlassCard className="p-6 text-sm text-muted-foreground">
              No comments yet. Start the conversation.
            </GlassCard>
          ) : (
            thread.map((comment) => (
              <CommentItem
                key={comment._id}
                slug={slug}
                visitorKey={visitorKey}
                comment={comment}
                depth={0}
                canModerate={canModerate}
                onReply={(item) => {
                  setReplyTo(item);
                  focusComposer();
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentItemProps {
  slug: string;
  visitorKey: string;
  comment: CommentNode;
  depth: number;
  canModerate: boolean;
  onReply: (comment: BlogCommentDoc) => void;
}

function CommentItem({
  slug,
  visitorKey,
  comment,
  depth,
  canModerate,
  onReply,
}: CommentItemProps) {
  const showConfirm = useConfirm();
  const qc = useQueryClient();
  const [activeReaction, setActiveReaction] = useState<BlogReactionType | null>(
    comment.visitorReaction ?? null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(comment.name);
  const [editEmail, setEditEmail] = useState(comment.email ?? '');
  const [editContent, setEditContent] = useState(comment.content);
  const [editErrors, setEditErrors] = useState<CommentErrors>({});

  useEffect(() => {
    setActiveReaction(comment.visitorReaction ?? null);
  }, [comment.visitorReaction]);

  useEffect(() => {
    setEditName(comment.name);
    setEditEmail(comment.email ?? '');
    setEditContent(comment.content);
    setEditErrors({});
    setIsEditing(false);
  }, [comment._id, comment.name, comment.email, comment.content]);

  const reactionCounts = useMemo(() => {
    const counts = Object.fromEntries(
      BLOG_REACTIONS.map((r) => [r, 0])
    ) as Record<BlogReactionType, number>;
    (comment.reactions ?? []).forEach((item) => {
      counts[item._id] = item.count;
    });
    return counts;
  }, [comment.reactions]);

  const validateEditAll = (): CommentErrors =>
    validateCommentFields(editName, editEmail, editContent);

  const reactionMutation = useMutation({
    mutationFn: async (reaction: BlogReactionType) =>
      (
        await api.post(`/blog/slug/${slug}/comments/${comment._id}/reactions`, {
          reaction,
          visitorKey,
        })
      ).data,
    onSuccess: (_data, reaction) => {
      setActiveReaction(reaction);
      qc.invalidateQueries({ queryKey: ['blog', 'post', slug] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { message?: string })?.message || 'Could not save reaction'
      );
    },
  });

  const editMutation = useMutation({
    mutationFn: async () =>
      (
        await api.put(`/blog/admin/comments/${comment._id}`, {
          name: editName,
          email: editEmail.trim() || undefined,
          content: editContent,
        })
      ).data,
    onSuccess: () => {
      toast.success('Comment updated');
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ['blog', 'post', slug] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { message?: string })?.message || 'Could not update comment'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      (await api.delete(`/blog/admin/comments/${comment._id}`)).data,
    onSuccess: () => {
      toast.success('Comment deleted');
      qc.invalidateQueries({ queryKey: ['blog', 'post', slug] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { message?: string })?.message || 'Could not delete comment'
      );
    },
  });

  const submitEdit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const nextErrors = validateEditAll();
    setEditErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.content) return;
    editMutation.mutate();
  };

  const cancelEdit = (): void => {
    setEditName(comment.name);
    setEditEmail(comment.email ?? '');
    setEditContent(comment.content);
    setEditErrors({});
    setIsEditing(false);
  };

  const confirmDelete = (): void => {
    void (async () => {
      const ok = await showConfirm({
        title: 'Delete comment?',
        message:
          'This comment and every nested reply will be permanently removed.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (ok) deleteMutation.mutate();
    })();
  };

  return (
    <GlassCard
      className={cn('p-5', depth > 0 && 'ml-4 border-l-2 border-primary/20')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-foreground">{comment.name}</h4>
          <p className="text-xs text-muted-foreground/70">
            {formatDate(comment.createdAt)}
            {comment.email ? ` · ${comment.email}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            onClick={() => onReply(comment)}
          >
            Reply
          </button>
          {canModerate && !isEditing && (
            <>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <form className="mt-4 space-y-4" onSubmit={submitEdit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (editErrors.name) {
                    setEditErrors((current) => ({
                      ...current,
                      name: undefined,
                    }));
                  }
                }}
                onBlur={() => {
                  setEditErrors((current) => ({
                    ...current,
                    name: validateCommentName(editName),
                  }));
                }}
                placeholder="Your name"
              />
              {editErrors.name && (
                <p className="mt-1 text-xs text-destructive">
                  {editErrors.name}
                </p>
              )}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                value={editEmail}
                onChange={(e) => {
                  setEditEmail(e.target.value);
                  if (editErrors.email) {
                    setEditErrors((current) => ({
                      ...current,
                      email: undefined,
                    }));
                  }
                }}
                onBlur={() => {
                  setEditErrors((current) => ({
                    ...current,
                    email: validateCommentEmail(editEmail),
                  }));
                }}
                placeholder="you@example.com"
                type="text"
                inputMode="email"
              />
              {editErrors.email && (
                <p className="mt-1 text-xs text-destructive">
                  {editErrors.email}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="label">Comment</label>
            <textarea
              className="input min-h-32 resize-y"
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                if (editErrors.content) {
                  setEditErrors((current) => ({
                    ...current,
                    content: undefined,
                  }));
                }
              }}
              onBlur={() => {
                setEditErrors((current) => ({
                  ...current,
                  content: validateCommentContent(editContent),
                }));
              }}
            />
            {editErrors.content && (
              <p className="mt-1 text-xs text-destructive">
                {editErrors.content}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button type="submit" disabled={editMutation.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {comment.content}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {BLOG_REACTIONS.map((reaction) => {
          const meta = BLOG_REACTION_META[reaction];
          const selected = activeReaction === reaction;
          return (
            <button
              key={reaction}
              type="button"
              onClick={() => void reactionMutation.mutate(reaction)}
              disabled={reactionMutation.isPending}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                selected
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border/70 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="text-2xs text-muted-foreground/70">
                {reactionCounts[reaction]}
              </span>
            </button>
          );
        })}
      </div>

      {comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              slug={slug}
              visitorKey={visitorKey}
              comment={reply}
              depth={depth + 1}
              canModerate={canModerate}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
