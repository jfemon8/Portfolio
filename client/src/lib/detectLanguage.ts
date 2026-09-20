// Shared by articleSchema and prerender.ts so a Bengali post's structured data never claims `inLanguage: "en"`.
const BENGALI = /[ঀ-৿]/g;
const LATIN = /[a-z]/gi;

// A quarter of the alphabetic characters being Bengali beats a character-count majority, since this blog's Bengali posts routinely carry enough English technical terms to tip a raw count.
const BENGALI_SHARE_THRESHOLD = 0.25;

export const detectLanguage = (text: string): 'bn' | 'en' => {
  const bengali = (text.match(BENGALI) ?? []).length;
  const latin = (text.match(LATIN) ?? []).length;
  const total = bengali + latin;
  return total > 0 && bengali / total >= BENGALI_SHARE_THRESHOLD ? 'bn' : 'en';
};
