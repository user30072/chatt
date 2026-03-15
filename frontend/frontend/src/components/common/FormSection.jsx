'use client';
export default function FormSection({ title, children }) {
  return (<div className="space-y-4"><h3 className="text-lg font-medium">{title}</h3>{children}</div>);
}
