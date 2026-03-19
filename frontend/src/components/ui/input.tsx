// frontend/src/components/ui/input.tsx
// This file should be created/updated to support the icon prop used in Marketplace.tsx
import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type = 'text', icon, ...props }, ref) => {
    const baseClasses = "flex h-10 w-full rounded-md border border-gray-300 bg-white text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
    
    if (icon) {
      return (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <div className="text-gray-400">
              {icon}
            </div>
          </div>
          <input
            type={type}
            className={`${baseClasses} pl-10 pr-3 py-2 ${className}`}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        className={`${baseClasses} px-3 py-2 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };