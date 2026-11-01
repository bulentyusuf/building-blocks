// The strip of tape on a sidebar panel: half on, half off its top edge, tilted.
// One per page, never on anything carrying text. The panel is `relative`.
// [→ `post-page`]
export default function Tape({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute -top-4 left-1/2 h-8 w-35 -translate-x-1/2 -rotate-3 bg-tape mix-blend-multiply [clip-path:polygon(0_4%,4%_0,8%_6%,12%_0,88%_0,92%_5%,96%_0,100%_6%,100%_96%,96%_100%,92%_94%,88%_100%,12%_100%,8%_95%,4%_100%,0_94%)] dark:mix-blend-normal ${className}`}
    />
  );
}
