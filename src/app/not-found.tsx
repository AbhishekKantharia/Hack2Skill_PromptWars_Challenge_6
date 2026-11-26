import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080d2b] px-6 py-12 text-slate-200">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-white">Page not found</h1>
        <p className="mt-3 text-sm text-slate-300">The page you requested does not exist.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900">
          Return home
        </Link>
      </div>
    </main>
  );
}
