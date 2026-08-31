// Shared by articleSchema (client) and prerender.ts (build-time) so a Bengali post's structured
// data never claims `inLanguage: "en"` — this site's blog mixes both scripts across posts.
const BENGALI = /[ঀ-৿]/g;
const LATIN = /[a-z]/gi;

// A straight character-count majority under-detects Bengali here: this blog's usual style is
// Bengali sentences threaded with English technical terms ("PowerShell দিয়ে... Activation"),
// which routinely tips the raw Latin-letter count past the Bengali one despite the post reading
// as Bengali. A quarter of the alphabetic characters being Bengali is a stronger, tested signal.
const BENGALI_SHARE_THRESHOLD = 0.25;

export const detectLanguage = (text: string): 'bn' | 'en' => {
  const bengali = (text.match(BENGALI) ?? []).length;
  const latin = (text.match(LATIN) ?? []).length;
  const total = bengali + latin;
  return total > 0 && bengali / total >= BENGALI_SHARE_THRESHOLD ? 'bn' : 'en';
};
