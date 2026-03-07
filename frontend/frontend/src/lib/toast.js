// Simple toast utility
export function useToast() {
  return {
    toast: (props) => {
      console.log('Toast:', props);
      // Fallback implementation without real UI
      alert(props.description || props.title || 'Notification');
    }
  };
} 