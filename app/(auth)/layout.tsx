export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-apollo-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="apollo-brand-mark">A</div>
          <div className="text-2xl" style={{ fontWeight: 600, letterSpacing: "0.3px" }}>
            Apollo
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
