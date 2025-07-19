import Image from 'next/image';
import { Bookmark } from './BookmarkGrid';

export interface BookmarkCardProps {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
  onRetry?: (bookmark: Bookmark) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDelete?: (bookmark: Bookmark) => void;
}

// Constantes pour les étapes de progression
export const STEPS = {
  idle: 'Idle',
  scraping: 'Scraping content',
  metadata: 'Extracting metadata',
  screenshot: 'Taking screenshot',
  describe: 'Describing screenshot',
  summary: 'Summarizing page',
  tags: 'Finding relevant tags',
  saving: 'Saving',
  finished: 'Finished'
};

export function BookmarkCard({ bookmark, onClick, onRetry, onContextMenu, onDelete }: BookmarkCardProps) {
  const domain = bookmark.url ? new URL(bookmark.url).hostname.replace('www.', '') : '';

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
    'scraping', 'metadata', 'screenshot', 'summary', 'tags', 'saving', 'finished'
  ];



  const renderPlaceholder = () => (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-4"
      style={{
        backgroundColor: '#212121',
        backgroundImage: `repeating-linear-gradient(45deg, #282828, #282828 10px, #212121 10px, #212121 20px)`
      }}
    />
  );

  const renderLoadingPlaceholder = () => {
    const currentStep = bookmark.processingStep as string;
    const currentIndex = processSteps.indexOf(currentStep);
    const stepName = STEPS[currentStep as keyof typeof STEPS] || 'Initializing...';
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / processSteps.length) * 100 : 0;
    
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center p-6 relative"
        style={{
          backgroundColor: '#1a1a1a',
          backgroundImage: `repeating-linear-gradient(45deg, #252525, #252525 10px, #1a1a1a 10px, #1a1a1a 20px)`
        }}
      >
        {/* Icône de l'étape actuelle */}
        <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mb-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>
        </div>
        
        {/* Nom de l'étape avec effet brillant */}
        <div className="relative mb-4">
          <div className="text-lg font-semibold text-green-400 relative overflow-hidden">
            {stepName}
            {/* Effet brillant animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shine"></div>
          </div>
        </div>
        
        {/* Barre de progression globale */}
        <div className="w-full max-w-xs mb-3">
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            >
              {/* Effet de brillant sur la barre */}
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Compteur d'étapes */}
        <div className="text-xs text-gray-400 font-medium">
          Step {currentIndex + 1} of {processSteps.length}
        </div>
      </div>
    );
  };

  if (bookmark.status === 'loading') {
    const showTitleAndFavicon = processSteps.indexOf(bookmark.processingStep as string) >= processSteps.indexOf('metadata');
    const showThumbnail = processSteps.indexOf(bookmark.processingStep as string) >= processSteps.indexOf('screenshot');

    return (
      <div className="bg-[#232526] text-white flex flex-col rounded-xl border border-gray-700 shadow-sm group w-full overflow-hidden p-0" onContextMenu={handleContextMenu}>
        <div className="aspect-video relative overflow-hidden">
          {showThumbnail && bookmark.thumbnail ? (
            <Image src={bookmark.thumbnail} alt="Screenshot" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
          ) : renderLoadingPlaceholder()}
          
          {/* Cancel button - top right for loading bookmarks */}
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 bg-gray-800/80 hover:bg-green-600/80 text-white rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 text-xs font-medium backdrop-blur-sm"
            title="Cancel processing"
          >
            Cancel
          </button>
        </div>
        <div className="p-3 flex-1 flex flex-col">
          {showTitleAndFavicon ? (
            <div className="flex items-center gap-2 mb-2">
              {bookmark.favicon && <Image src={bookmark.favicon} alt="Favicon" width={16} height={16} className="rounded-sm" />}
              <div className="font-semibold text-base truncate">{bookmark.title || 'Loading...'}</div>
            </div>
          ) : (
            <div className="h-6 bg-gray-700 rounded w-3/4 animate-pulse mb-2"></div>
          )}
          <div className="h-4 bg-gray-700 rounded w-full animate-pulse mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6 animate-pulse"></div>
          <div className="flex items-center justify-between gap-1 text-xs text-gray-500 mt-2">
            <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
            
            {/* Cancel button alternative - bottom right */}
            <button
              onClick={handleDelete}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs transition flex items-center gap-1"
              title="Cancel processing"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Cancel
            </button>
          </div>
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
    <div className="bg-[#232526] text-white flex flex-col rounded-xl border border-gray-700 shadow-sm group w-full overflow-hidden p-0" onClick={handleClick}>
      <div className="relative aspect-video overflow-hidden">
        {bookmark.thumbnail ? (
          <Image src={bookmark.thumbnail} alt={bookmark.title || "Thumbnail"} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-all group-hover:scale-105" />
        ) : renderPlaceholder()}
        
        {/* Delete button - top left */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onDelete) onDelete(bookmark);
          }}
          className="absolute top-2 left-2 bg-black/40 hover:bg-red-600/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-80 hover:opacity-100 transition-all duration-200 z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
        
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
      <div className="p-3 h-24 flex flex-col justify-between">
        <div>
          <div className="font-semibold text-base truncate mb-1">{bookmark.title}</div>
          <div className={`text-muted-foreground line-clamp-2 ${
            bookmark.description && bookmark.description.length > 80 
              ? 'text-xs' 
              : 'text-sm'
          }`}>{bookmark.description}</div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
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
