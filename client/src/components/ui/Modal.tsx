// client/src/components/ui/Modal.tsx
import React, { memo, useEffect, useCallback } from "react";

/**
 * Props for the Modal component
 */
interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Function to call when the modal should be closed
   */
  onClose: () => void;
  /**
   * The title of the modal
   */
  title?: string;
  /**
   * The content of the modal
   */
  children: React.ReactNode;
  /**
   * Whether the modal can be closed by clicking outside
   */
  closeOnOverlayClick?: boolean;
  /**
   * Whether the modal can be closed with the Escape key
   */
  closeOnEscape?: boolean;
  /**
   * Size of the modal
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Modal component with design system integration
 * 
 * This component provides a consistent modal interface using the design system.
 * It includes proper accessibility features and keyboard navigation.
 * 
 * @param {ModalProps} props - The component props
 * @returns {JSX.Element} The rendered modal component
 * 
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   title="Game Instructions"
 *   size="lg"
 * >
 *   <p>Modal content goes here...</p>
 * </Modal>
 * ```
 */
const Modal: React.FC<ModalProps> = memo(({
  isOpen,
  onClose,
  title,
  children,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  size = "md",
  className = "",
}) => {
  /**
   * Gets the CSS classes for the modal size
   */
  const getSizeClasses = (): string => {
    switch (size) {
      case "sm":
        return "max-w-md";
      case "md":
        return "max-w-lg";
      case "lg":
        return "max-w-2xl";
      case "xl":
        return "max-w-4xl";
      default:
        return "max-w-lg";
    }
  };

  /**
   * Handles Escape key press
   */
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape" && closeOnEscape) {
      onClose();
    }
  }, [onClose, closeOnEscape]);

  /**
   * Handles overlay click
   */
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  }, [onClose, closeOnOverlayClick]);

  /**
   * Sets up keyboard event listeners
   */
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      // Restore body scroll when modal is closed
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscapeKey]);

  // Don't render if modal is not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className={`
          bg-white rounded-lg shadow-xl w-full ${getSizeClasses()}
          max-h-[90vh] overflow-y-auto ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2
              id="modal-title"
              className="text-xl font-semibold text-gray-900"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer (optional) */}
        {!title && (
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// Set display name for debugging
Modal.displayName = "Modal";

export default Modal;

