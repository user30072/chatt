import React from 'react';

const sizes = {
  'sm': 'h-4 w-4',
  'md': 'h-8 w-8',
  'lg': 'h-12 w-12',
  'xl': 'h-16 w-16',
};

export default function Loading({ 
  size = 'md',
  className = '',
  color = 'black'
}) {
  const sizeClass = sizes[size] || sizes.md;
  const colorClass = color === 'black' ? 'border-black' : 
                    color === 'primary' ? 'border-primary' : 
                    `border-${color}-500`;
  
  return (
    <div className="flex justify-center py-4">
      <div className={`${sizeClass} animate-spin rounded-full border-t-2 border-b-2 ${colorClass} ${className}`}></div>
    </div>
  );
}