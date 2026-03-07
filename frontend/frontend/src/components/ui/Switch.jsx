import React, { forwardRef } from 'react';

const Switch = forwardRef(({
  checked,
  onChange,
  name,
  id,
  label,
  disabled = false,
  ...props
}, ref) => {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        ref={ref}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        name={name}
        id={id}
        disabled={disabled}
        {...props}
      />
      <div 
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <div 
          className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
            checked ? 'transform translate-x-5' : ''
          }`}
        ></div>
      </div>
      {label && (
        <span className={`ml-3 text-sm ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>
          {label}
        </span>
      )}
    </label>
  );
});

Switch.displayName = 'Switch';

export default Switch;