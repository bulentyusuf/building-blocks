import { clsx } from "clsx";

/**
 * `className` appends, it does not merge — clsx concatenates and knows nothing
 * about Tailwind, so an override lands beside the default rather than replacing
 * it, and the winner is decided by source order in the generated stylesheet.
 * Tailwind emits utilities in ascending value order, so a spacing override can
 * only ever INCREASE a value: a smaller one silently loses.
 *
 * That is why the top inset is a prop rather than a class. Wide pages sit
 * under a full-bleed band that has already drawn the boundary, so they need
 * LESS space above their content than a bare page does, and `className` cannot
 * express that. app/wide-page.tsx sets the wide rhythm; nothing else passes
 * this.
 */
const TOP_PAD = {
  default: "pt-8",
  tight: "pt-6",
  none: "pt-0",
} as const;

export default function Container({
  children,
  className,
  topPad = "default",
}: {
  children: React.ReactNode;
  className?: string;
  topPad?: keyof typeof TOP_PAD;
}) {
  return (
    <div
      className={clsx(
        "max-w-page mx-auto px-5 pb-12",
        TOP_PAD[topPad],
        className,
      )}
    >
      {children}
    </div>
  );
}
