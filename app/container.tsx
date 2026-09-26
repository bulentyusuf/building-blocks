export default function Container({ children }: { children: React.ReactNode }) {
  return <div className="max-w-5xl mx-auto px-5 pt-8 pb-12">{children}</div>;
}
