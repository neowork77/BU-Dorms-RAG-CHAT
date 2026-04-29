export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in flex-1 flex flex-col min-h-0 relative">
      {children}
    </div>
  );
}
