export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-frame mx-auto px-4 md:px-10 pt-8 pb-12">
      {children}
    </div>
  );
}
