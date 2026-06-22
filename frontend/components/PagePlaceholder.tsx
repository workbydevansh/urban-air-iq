type PagePlaceholderProps = {
  title: string;
  description: string;
};

export default function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section>
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-air-600">
        Urban Air Quality Intelligence
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">{description}</p>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">This section is ready for feature implementation.</p>
      </div>
    </section>
  );
}
