import { useEffect } from 'react';

export const useKeyboardShortcuts = ({
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onSelectAll,
  onDeselect,
  onCopy,
  onPaste
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in a text field
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA' || 
          document.activeElement.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo: Ctrl + Z
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        onUndo?.();
      }

      // Redo: Ctrl + Y or Ctrl + Shift + Z
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        onRedo?.();
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete?.();
      }

      // Duplicate: Ctrl + D
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        onDuplicate?.();
      }

      // Copy: Ctrl + C
      if (ctrl && e.key === 'c') {
        e.preventDefault();
        onCopy?.();
      }

      // Paste: Ctrl + V
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        onPaste?.();
      }

      // Select All: Ctrl + A
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        onSelectAll?.();
      }

      // Deselect: Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onDeselect?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onDelete, onDuplicate, onSelectAll, onDeselect, onCopy, onPaste]);
};
