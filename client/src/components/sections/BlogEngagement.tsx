import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareReply, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/date';
import { BLOG_REACTION_META, BLOG_REACTIONS } from '@/lib/blog';
import type { BlogCommentDoc, BlogEngagement, BlogReactionType } from '@/types';

type CommentNode = BlogCommentDoc & { replies: CommentNode[] };

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
  const qc = useQueryClient();
  const [activeReaction, setActiveReaction] = useState<BlogReactionType | null>(
    engagement.visitorReaction
  );
  const [replyTo, setReplyTo] = useState<BlogCommentDoc | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
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
    if (!name.trim() || !content.trim()) return;
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

      <div
        ref={formRef}
        className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">
                {replyTo ? `Reply To ${replyTo.name}` : 'Leave A Comment'}
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

          <form className="space-y-4" onSubmit={submitComment}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
            </div>
            <div>
              <label className="label">Comment</label>
              <textarea
                className="input min-h-32 resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  replyTo
                    ? `Write A Reply To ${replyTo.name}…`
                    : 'Write Your Comment…'
                }
              />
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

        <div className="space-y-4">
          {thread.length === 0 ? (
            <GlassCard className="p-6 text-sm text-muted-foreground">
              No comments yet. Start the conversation.
            </GlassCard>
          ) : (
            thread.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                depth={0}
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
  comment: CommentNode;
  depth: number;
  onReply: (comment: BlogCommentDoc) => void;
}

function CommentItem({ comment, depth, onReply }: CommentItemProps) {
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
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          onClick={() => onReply(comment)}
        >
          Reply
        </button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {comment.content}
      </p>
      {comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
