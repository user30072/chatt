import React from 'react';

const variants = {
  'default': 'bg-gray-100 text-gray-800',
  'primary': 'bg-primary-100 text-primary-800',
  'success': 'bg-green-100 text-green-800',
  'danger': 'bg-red-100 text-red-800',
  'warning': 'bg-amber-100 text-amber-800',
  'info': 'bg-blue-100 text-blue-800',
};

const sizes = {
  'sm': 'text-xs px-2 py-0.5',
  'md': 'text-sm px-2.5 py-0.5',
  'lg': 'text-base px-3 py-1',
};

export default function Badge({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  rounded = true,
  ...props
}) {
  const baseClasses = 'inline-flex items-center font-medium';
  const variantClasses = variants[variant] || variants.default;
  const sizeClasses = sizes[size] || sizes.md;
  const roundedClasses = rounded ? 'rounded-full' : 'rounded';
  
  const classes = `${baseClasses} ${variantClasses} ${sizeClasses} ${roundedClasses} ${className}`;
  
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}