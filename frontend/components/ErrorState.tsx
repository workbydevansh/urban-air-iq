type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({ message = "Unable to load air quality data.", onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <h2 className="font-semibold text-red-800">Air quality data unavailable</h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}
