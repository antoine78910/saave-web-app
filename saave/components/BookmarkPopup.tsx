import React from 'react';
import Image from 'next/image';
import { Bookmark } from './BookmarkGrid';

interface BookmarkPopupProps {
  bookmark: Bookmark;
  onClose: () => void;
}

export default function BookmarkPopup({ bookmark, onClose }: BookmarkPopupProps) {
  const isMShots = (src?: string | null) => {
    if (!src) return false;
    const raw = String(src).trim();
    // Handle protocol-relative or scheme-less stored URLs (common in older data)
    if (raw.startsWith('//')) {
      return (
        raw.startsWith('//s.wordpress.com/mshots/v1/') ||
        raw.startsWith('//s0.wp.com/mshots/v1/') ||
        raw.startsWith('//i0.wp.com/s.wordpress.com/mshots/v1/')
      );
    }
    if (raw.startsWith('s.wordpress.com/mshots/v1/') || raw.startsWith('s0.wp.com/mshots/v1/')) return true;
    try {
      const u = new URL(raw);
      const host = u.hostname;
      const path = u.pathname || '';
      const isWpHost = host === 's.wordpress.com' || host === 's0.wp.com' || host.endsWith('.wp.com') || host.endsWith('wordpress.com');
      return isWpHost && path.includes('/mshots/v1/');
    } catch {
      return raw.includes('s.wordpress.com/mshots/v1/') || raw.includes('/mshots/v1/');
    }
  };

  const thumIoFromPageUrl = (pageUrl: string) =>
    `https://image.thum.io/get/width/1280/crop/720/noanimate/${encodeURIComponent(pageUrl)}`;

  const previewSrc = React.useMemo(() => {
    if (!bookmark.thumbnail) return null;
    if (!isMShots(bookmark.thumbnail)) return bookmark.thumbnail;
    // Avoid mShots "Generating Preview..." placeholders by switching to thum.io for display.
    return thumIoFromPageUrl(bookmark.url);
  }, [bookmark.thumbnail, bookmark.url]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="bg-[#2a2a2a] rounded-lg border border-gray-600 shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-600">
          <div className="flex items-center gap-3">
            {bookmark.favicon && (
              <Image 
                src={bookmark.favicon} 
                alt="Favicon" 
                width={24} 
                height={24} 
                className="rounded-sm"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold text-white truncate">{bookmark.title}</h2>
              <a 
                href={bookmark.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-green-400 hover:text-green-300 text-sm truncate block max-w-md"
              >
                {bookmark.url}
              </a>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>

        {/* Screenshot - Pleine largeur */}
        {bookmark.thumbnail && (
          <div className="border-b border-gray-600">
            <div className="px-6 pt-6 pb-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
                Screenshot
              </h3>
            </div>
            {/* Screenshot prend toute la largeur en 16:9 */}
            <div className="relative w-full bg-[#1a1a1a] overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {isMShots(bookmark.thumbnail) ? (
                <img
                  src={previewSrc || bookmark.thumbnail}
                  alt={bookmark.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Image 
                  src={bookmark.thumbnail} 
                  alt={bookmark.title} 
                  fill 
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              )}
              {/* Overlay pour voir le screenshot en grand au clic */}
              <button 
                onClick={() => window.open((previewSrc || bookmark.thumbnail)!, '_blank')}
                className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center group"
              >
                <div className="bg-black/60 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10l4 4"></path>
                  </svg>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        {bookmark.description && (
          <div className="p-6 border-b border-gray-600">
            <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              Description
            </h3>
            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
              <p className="text-gray-300 leading-relaxed">{bookmark.description}</p>
            </div>
          </div>
        )}

        {/* Tags */}
        {bookmark.tags && bookmark.tags.length > 0 && (
          <div className="p-6 border-b border-gray-600">
            <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path>
                <path d="M7 7h.01"></path>
              </svg>
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {bookmark.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm border border-green-600/30 hover:bg-green-600/30 transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 flex justify-end gap-3">
          <button 
            onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg hover:shadow-green-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7"></path>
              <path d="M7 7h10v10"></path>
            </svg>
            Open Link
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 