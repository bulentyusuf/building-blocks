import { clsx } from "clsx";

export default function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("max-w-5xl mx-auto px-5 pt-8 pb-12", className)}>
      {children}
    </div>
  );
}
