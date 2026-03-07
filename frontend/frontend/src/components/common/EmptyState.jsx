'use client';

import Button from '@/components/ui/Button';

export default function EmptyState({
  title,
  description,
  icon,
  action,
  actionText,
  actionHref,
  secondaryAction,
  secondaryActionText,
}) {
  return (
    <div className="text-center p-8 border border-gray-200 rounded-lg bg-white">
      {icon && (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="mt-2 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-6">
        {action && (
          <Button onClick={action} href={actionHref}>
            {actionText}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" className="ml-3" onClick={secondaryAction}>
            {secondaryActionText}
          </Button>
        )}
      </div>
    </div>
  );
}