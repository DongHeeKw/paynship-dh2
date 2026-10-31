interface Props { mode: 'enter' | 'exit'; className?: string }

export default function PreviewModeLink({ mode, className }: Props) {
  // A full page load replaces AuthProvider between modes. Public product inputs
  // travel via the bounded same-tab draft, never through this URL or its fragment.
  const href = mode === 'enter' ? '/dev/preview' : '/';
  return <a href={href} className={className}>{mode === 'enter' ? 'Open local UI preview' : 'Exit preview'}</a>;
}
