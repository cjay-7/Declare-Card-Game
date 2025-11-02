// client/src/components/ui/Button.tsx
import React, { memo, forwardRef } from "react";

/**
 * Button variant types
 */
export type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "error";

/**
 * Button size types
 */
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Props for the Button component
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The visual style variant of the button
   */
  variant?: ButtonVariant;
  /**
   * The size of the button
   */
  size?: ButtonSize;
  /**
   * Whether the button is in a loading state
   */
  loading?: boolean;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * The content of the button
   */
  children: React.ReactNode;
}

/**
 * Button component with design system integration
 * 
 * This component provides a consistent button interface using the design system
 * colors, spacing, and typography. It supports multiple variants and sizes.
 * 
 * @param {ButtonProps} props - The component props
 * @returns {JSX.Element} The rendered button component
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  className = "",
  ...props
}, ref) => {
  /**
   * Gets the CSS classes for the button variant
   */
  const getVariantClasses = (): string => {
    const baseClasses = "font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    switch (variant) {
      case "primary":
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300`;
      case "secondary":
        return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300`;
      case "success":
        return `${baseClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300`;
      case "warning":
        return `${baseClasses} bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 disabled:bg-yellow-300`;
      case "error":
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300`;
      default:
        return baseClasses;
    }
  };

  /**
   * Gets the CSS classes for the button size
   */
  const getSizeClasses = (): string => {
    switch (size) {
      case "sm":
        return "px-3 py-1.5 text-sm";
      case "md":
        return "px-4 py-2 text-base";
      case "lg":
        return "px-6 py-3 text-lg";
      default:
        return "px-4 py-2 text-base";
    }
  };

  const buttonClasses = [
    getVariantClasses(),
    getSizeClasses(),
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
});

// Set display name for debugging
Button.displayName = "Button";

export default memo(Button);
