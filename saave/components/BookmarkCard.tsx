import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Bookmark } from './BookmarkGrid';
import BookmarkProgressBar, { BookmarkProcessStep } from './BookmarkProgressBar';

export interface BookmarkCardProps {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
  onRetry?: (bookmark: Bookmark) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDelete?: (bookmark: Bookmark) => void;
  isDeleting?: boolean;
}

export function BookmarkCard({ bookmark, onClick, onRetry, onContextMenu, onDelete, isDeleting = false }: BookmarkCardProps) {
  const domain = bookmark.url ? new URL(bookmark.url).hostname.replace('www.', '') : '';

  const isMShots = (src?: string | null) => {
    if (!src) return false;
    try {
      const u = new URL(src);
      return u.hostname === 's.wordpress.com' && u.pathname.startsWith('/mshots/v1/');
    } catch {
      return false;
    }
  };

  const withCacheBust = (src: string, bust: number) => {
    try {
      const u = new URL(src);
      u.searchParams.set('cb', String(bust));
      return u.toString();
    } catch {
      // Fallback for non-standard URLs
      const sep = src.includes('?') ? '&' : '?';
      return `${src}${sep}cb=${bust}`;
    }
  };

  // mShots returns a placeholder first ("Generating Preview...") then updates asynchronously.
  // Next/Image can cache the placeholder via the optimizer, so we use <img> + cache-bust retries for mShots only.
  const [mshotsBust, setMshotsBust] = useState<number>(0);
  useEffect(() => {
    const src = bookmark.thumbnail || '';
    if (!isMShots(src)) return;
    const bump = () => setMshotsBust(Date.now());
    bump();
    const t1 = setTimeout(bump, 1500);
    const t2 = setTimeout(bump, 4000);
    const t3 = setTimeout(bump, 8000);
    const t4 = setTimeout(bump, 15000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    // Re-run when thumbnail changes or when processing step advances.
  }, [bookmark.thumbnail, bookmark.processingStep, bookmark.id]);

  const thumbnailSrc = useMemo(() => {
    const src = bookmark.thumbnail || '';
    if (!src) return '';
    if (!isMShots(src)) return src;
    return withCacheBust(src, mshotsBust || Date.now());
  }, [bookmark.thumbnail, mshotsBust]);

  const handleClick = () => {
    if (bookmark.status === 'error' || bookmark.status === 'loading') return;
    if (onClick) {
      onClick(bookmark);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetry) onRetry(bookmark);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(bookmark);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) onContextMenu(e);
  };

  const processSteps = [
    'scraping', 'metadata', 'screenshot', 'describe', 'summary', 'tags', 'saving', 'finished'
  ];

  if (bookmark.status === 'loading') {
    const showTitleAndFavicon = processSteps.indexOf(bookmark.processingStep as string) >= processSteps.indexOf('metadata');
    const showThumbnail = processSteps.indexOf(bookmark.processingStep as string) >= processSteps.indexOf('screenshot');

    return (
      <div className="bg-[#232526] text-white flex flex-col rounded-xl border border-gray-700 shadow-sm group w-full overflow-hidden p-0" onContextMenu={handleContextMenu}>
        <div className="aspect-video relative overflow-hidden">
          {showThumbnail && bookmark.thumbnail ? (
            <div className="relative w-full h-full">
              {isMShots(bookmark.thumbnail) ? (
                <img
                  src={thumbnailSrc}
                  alt="Screenshot"
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Image src={bookmark.thumbnail} alt="Screenshot" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              )}
              <BookmarkProgressBar
                currentStep={bookmark.processingStep as BookmarkProcessStep}
                url={bookmark.url}
                domain={domain}
                title={bookmark.title}
                favicon={bookmark.favicon}
                thumbnail={bookmark.thumbnail}
                onCancel={async () => {
                  const processingId = (bookmark as any).processingId || bookmark.id;
                  try {
                    const res = await fetch('/api/bookmarks/process/cancel', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: processingId })
                    });
                    if (!res.ok) throw new Error('cancel_failed');
                    // Optimistic: immediately remove from UI (by id and url)
                    const ev = new CustomEvent('saave:cancel-processing', { detail: { processingId, url: bookmark.url } });
                    window.dispatchEvent(ev);
                  } catch {}
                }}
              />
            </div>
          ) : (
            <div className="relative w-full h-full">
              <div className="w-full h-full bg-[#1a1a1a]" />
              <BookmarkProgressBar
                currentStep={bookmark.processingStep as BookmarkProcessStep}
                url={bookmark.url}
                domain={domain}
                title={bookmark.title}
                favicon={bookmark.favicon}
                thumbnail={bookmark.thumbnail}
                onCancel={async () => {
                  try {
                    const res = await fetch('/api/bookmarks/process/cancel', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: (bookmark as any).processingId || bookmark.id })
                    })
                    if (!res.ok) throw new Error('cancel_failed')
                    // Optimistic: immediately remove from UI
                    const ev = new CustomEvent('saave:cancel-processing', { detail: { processingId: (bookmark as any).processingId || bookmark.id } });
                    window.dispatchEvent(ev);
                  } catch {}
                }}
              />
            </div>
          )}
        </div>
        <div className="p-3 flex-1 flex flex-col">
          {showTitleAndFavicon ? (
            <div className="flex items-center gap-2 mb-2">
              {bookmark.favicon && (
                <div className="flex-shrink-0 w-5 h-5 relative">
                  <Image 
                    src={bookmark.favicon} 
                    alt="Favicon" 
                    width={20} 
                    height={20} 
                    className="rounded-sm object-contain"
                  />
                </div>
              )}
              <div className="font-semibold text-base truncate">{bookmark.title || 'Loading...'}</div>
            </div>
          ) : (
            <div className="h-6 bg-gray-700 rounded w-3/4 animate-pulse mb-2"></div>
          )}
          <div className="h-4 bg-gray-700 rounded w-full animate-pulse mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (bookmark.status === 'error') {
    return (
      <div className="bg-red-900/20 text-white flex flex-col rounded-xl border border-red-700 shadow-sm w-full overflow-hidden p-0">
        <div className="aspect-video relative overflow-hidden bg-red-800/30 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <div className="font-semibold text-base truncate text-red-300">Failed to save</div>
          <div className="text-red-400 text-sm line-clamp-2 truncate">{bookmark.url}</div>
          <div className="text-xs text-red-500 mt-1 truncate">{bookmark.error || 'An unknown error occurred.'}</div>
          <div className="mt-auto pt-2 flex justify-end gap-2">
            <button className="px-2 py-1 bg-gray-700 text-white rounded-md text-xs hover:bg-gray-600 transition flex items-center gap-1" onClick={handleRetry}><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>Retry</button>
            <button className="px-2 py-1 bg-gray-700 text-white rounded-md text-xs hover:bg-gray-600 transition flex items-center gap-1" onClick={handleDelete}><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#232526] text-white flex flex-col rounded-xl border border-gray-700 shadow-sm group w-full overflow-hidden p-0" onClick={handleClick} onContextMenu={handleContextMenu}>
      <div className="aspect-video relative overflow-hidden">
        {bookmark.thumbnail ? (
          isMShots(bookmark.thumbnail) ? (
            <img
              src={thumbnailSrc}
              alt={bookmark.title || "Thumbnail"}
              className="absolute inset-0 w-full h-full object-cover transition-all group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Image src={bookmark.thumbnail} alt={bookmark.title || "Thumbnail"} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-all group-hover:scale-105" />
          )
        ) : (
          <div className="w-full h-full bg-[#1a1a1a]" />
        )}
        
        {/* Delete button - top left */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onDelete && !isDeleting) onDelete(bookmark);
          }}
          className={`absolute top-2 left-2 bg-black/50 text-white rounded-full p-1 transition-all duration-200 z-10
            ${isDeleting ? 'opacity-90 cursor-not-allowed' : 'opacity-0 group-hover:opacity-80 hover:bg-red-600/60 hover:opacity-100'}`}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <span className="inline-block w-3 h-3 rounded-full border border-white/60 border-t-transparent animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          )}
        </button>

        {isDeleting && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-20">
            <div className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-xs text-white flex items-center gap-2 shadow-lg">
              <span className="inline-block w-3.5 h-3.5 rounded-full border border-white/70 border-t-transparent animate-spin" />
              <span>Deleting…</span>
            </div>
          </div>
        )}
        
        {/* External link button - top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(bookmark.url, '_blank', 'noopener,noreferrer');
          }}
          className="absolute top-2 right-2 bg-black/40 hover:bg-green-600/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-80 hover:opacity-100 transition-all duration-200 z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7"></path>
            <path d="M7 7h10v10"></path>
          </svg>
        </button>
      </div>
      <div className="p-3 pb-4 h-24 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {bookmark.favicon && (
              <div className="flex-shrink-0 w-5 h-5 relative">
                <Image 
                  src={bookmark.favicon} 
                  alt="Favicon" 
                  width={20} 
                  height={20} 
                  className="rounded-sm object-contain"
                />
              </div>
            )}
            <h3 className="font-semibold text-sm leading-5 text-white line-clamp-1 flex-1">{bookmark.title}</h3>
          </div>
          <div className="text-gray-300 text-xs leading-5 line-clamp-2">
            {bookmark.description || bookmark.url}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-0">
          <span className="truncate">{domain}</span>
          {bookmark.category && (
            <div 
              className="px-2 py-1 rounded-full text-xs font-medium flex-shrink-0"
              style={{ 
                backgroundColor: `${bookmark.category.color}20`, 
                color: bookmark.category.color,
                border: `1px solid ${bookmark.category.color}40`
              }}
            >
              {bookmark.category.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
