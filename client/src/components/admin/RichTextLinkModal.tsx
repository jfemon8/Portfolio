import { useEffect, useState, type FormEvent } from 'react';
import Modal from './Modal';
import { Button } from '@/components/ui/button';

interface RichTextLinkModalProps {
  open: boolean;
  initialUrl: string;
  initialText: string;
  onClose: () => void;
  onSubmit: (url: string, text: string) => void;
}

/** Custom replacement for window.prompt() when inserting/editing a link in RichTextEditor. */
export default function RichTextLinkModal({
  open,
  initialUrl,
  initialText,
  onClose,
  onSubmit,
}: RichTextLinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    setText(initialText);
  }, [open, initialUrl, initialText]);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), text.trim());
  };

  return (
    <Modal open={open} title="Insert link" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label">URL</label>
          <input
            autoFocus
            className="input"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Link text (optional)</label>
          <input
            className="input"
            placeholder="Text shown to readers"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!url.trim()}>
            Insert link
          </Button>
        </div>
      </form>
    </Modal>
  );
}
