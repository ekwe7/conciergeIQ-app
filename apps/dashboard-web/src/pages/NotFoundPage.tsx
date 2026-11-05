import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-base font-semibold text-ink">Page not found</h1>
      <p className="mt-1 text-sm text-ink-3">The link may be out of date.</p>
      <Link to="/orders" className="mt-4 inline-block text-[13px] font-medium text-ink underline underline-offset-2">
        Go to live orders
      </Link>
    </div>
  );
}
