import React, { useEffect } from "react";

interface BookmarkContextMenuProps {
  x: number;
  y: number;
  bookmark: { id: string; url: string };
  onDelete: (bookmark: { id: string; url: string }) => void;
  onCopyLink: (bookmark: { id: string; url: string }) => void;
  onClose: () => void;
}

const BookmarkContextMenu: React.FC<BookmarkContextMenuProps> = ({ x, y, bookmark, onDelete, onCopyLink, onClose }) => {
  const [showToast, setShowToast] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  // Assure que le toast reste visible même après la fermeture du menu
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Copie l'URL et montre le toast
    onCopyLink(bookmark);
    setShowToast(true);
    
    // Après un délai, cache le toast
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };
  // Effet supprimé car géré autrement - la confirmation se ferme seulement si on clique en dehors du menu

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const menu = document.getElementById('bookmark-context-menu');
      if (menu && !menu.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <>
      <div
        id="bookmark-context-menu"
        style={{
          position: "fixed",
          top: y,
          left: x,
          background: "#232526",
          color: "#fff",
          borderRadius: 5,
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          zIndex: 1000,
          padding: 2,
          minWidth: 72,
          maxWidth: 140,
        }}
        onClick={e => e.stopPropagation()}
      >
      {!showConfirm ? (
        <div
          className="bookmark-menu-btn"
          style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: '4px 6px', borderRadius: 4, transition: 'background 0.2s', marginTop: 2, marginBottom: 2 }}
          onClick={() => setShowConfirm(true)}
          onMouseEnter={e => e.currentTarget.style.background = '#22c55e'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ marginRight: 8 }}>🗑️</span> Delete
        </div>
      ) : (
        <div
          className="bookmark-menu-btn"
          style={{
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer', 
            background: '#8B4A19', 
            color: '#F7E7B3', 
            borderRadius: 4, 
            fontWeight: 600, 
            fontSize: 13, 
            padding: '4px 6px', 
            margin: '2px 0', 
            marginBottom: 2, 
            marginTop: 2,
            transition: 'background 0.2s',
          }}
          onClick={(e) => {
            e.stopPropagation(); // Empêche la propagation de l'événement
            onDelete(bookmark);
          }}
        >
          <span style={{ fontSize: 14, marginRight: 6 }}>ⓘ</span> Are you sure?
        </div>
      )}
      <div
        className="bookmark-menu-btn"
        style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: '4px 6px', borderRadius: 4, transition: 'background 0.2s', marginTop: 2, marginBottom: 2 }}
        onClick={handleCopy}
        onMouseEnter={e => e.currentTarget.style.background = '#22c55e'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ marginRight: 8 }}>🔗</span> Copy Link
      </div>
      </div>
      
      {/* Toast indépendant du menu pour rester visible même après fermeture du menu */}
      {showToast && (
        <div style={{
          position: 'fixed',
          left: x + 15, 
          top: Math.max(y - 48, 16),
          background: '#232526',
          color: '#22c55e',
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          fontSize: 15,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 3000,
          pointerEvents: 'none',
          transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          opacity: showToast ? 1 : 0,
          transform: showToast ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
          animationName: 'fadeInSlideUp',
          animationDuration: '0.5s',
          animationTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}>
          <span style={{ marginRight: 10 }}>✓</span> Lien copié !
        </div>
      )}
    </>
  );
};


export default BookmarkContextMenu;
