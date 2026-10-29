import s from './Logo.module.css';

/** `*regi` — one text run, two spans, so kerning stays natural (tokens.md). */
export function Logo({ size = 'nav', as: Tag = 'span' }: { size?: 'nav' | 'card' | 'hero'; as?: 'span' | 'h1' }) {
  return (
    <Tag className={`${s.logo} ${s[size]}`} aria-label="regi">
      <span className={s.star} aria-hidden>*</span>
      <span aria-hidden>regi</span>
    </Tag>
  );
}
