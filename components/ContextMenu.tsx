import React, { useEffect } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onCopyLink: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onDelete, onCopyLink, onClose }) => {
  useEffect(() => {
    const handleClick = () => {
      onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: y,
        left: x,
        background: "#232526",
        color: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 1000,
        padding: 8,
        minWidth: 120,
      }}
      onClick={event => event.stopPropagation()}
    >
      <div
        style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: 6 }}
        onClick={() => { onDelete(); onClose(); }}
      >
        <span style={{ marginRight: 8 }}>🗑️</span> Delete
      </div>
      <div
        style={{ display: "flex", alignItems: "center", cursor: "pointer", marginTop: 8, padding: 6 }}
        onClick={() => { onCopyLink(); onClose(); }}
      >
        <span style={{ marginRight: 8 }}>🔗</span> Copy Link
      </div>
    </div>
  );
};

export default ContextMenu;
