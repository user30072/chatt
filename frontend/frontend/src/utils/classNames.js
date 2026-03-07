/**
 * Utility function to conditionally join class names together
 * @param  {...string} classes - Class names to be joined
 * @returns {string} - Joined class names with proper spacing
 */
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
} 