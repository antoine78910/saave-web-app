import { useState, useEffect } from "react";
import { Bookmark } from "@/components/BookmarkGrid";

const STORAGE_KEY = "saave-bookmarks";

// Simple search function that scores bookmarks based on query relevance
const searchBookmarks = (bookmarks: Bookmark[], query: string): Bookmark[] => {
  if (!query.trim()) {
    return bookmarks.map(b => ({ ...b, isBestMatch: false }));
  }

  const normalizedQuery = query.toLowerCase();
  
  const scoredBookmarks = bookmarks.map(bookmark => {
    let score = 0;
    const title = bookmark.title.toLowerCase();
    const description = bookmark.description.toLowerCase();
    const tags = bookmark.tags.join(' ').toLowerCase();
    const url = bookmark.url.toLowerCase();
    
    // Title matches (highest weight)
    if (title.includes(normalizedQuery)) score += 10;
    if (title.startsWith(normalizedQuery)) score += 5;
    
    // Description matches
    if (description.includes(normalizedQuery)) score += 3;
    
    // Tag matches
    if (tags.includes(normalizedQuery)) score += 7;
    
    // URL matches
    if (url.includes(normalizedQuery)) score += 2;
    
    // Word boundary matches (more precise)
    const words = normalizedQuery.split(' ');
    words.forEach(word => {
      if (word.length > 2) {
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
        if (wordRegex.test(title)) score += 8;
        if (wordRegex.test(description)) score += 4;
        if (wordRegex.test(tags)) score += 6;
      }
    });
    
    return { ...bookmark, score, isBestMatch: false };
  });
  
  // Filter out bookmarks with no score
  const filteredBookmarks = scoredBookmarks.filter(b => b.score > 0);
  
  // Sort by score descending
  filteredBookmarks.sort((a, b) => b.score - a.score);
  
  // Mark the best match
  if (filteredBookmarks.length > 0) {
    filteredBookmarks[0].isBestMatch = true;
  }
  
  return filteredBookmarks;
};

// Generate screenshot URL using a service or placeholder
const generateScreenshot = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    // Using a placeholder service for demo - in production you'd use a screenshot API
    return `https://via.placeholder.com/400x300/e5f3f0/2d7d6b?text=${encodeURIComponent(domain)}`;
  } catch {
    return `https://via.placeholder.com/400x300/e5f3f0/2d7d6b?text=Website`;
  }
};

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const MAX_BOOKMARKS = 20;

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedBookmarks = JSON.parse(stored);
        setBookmarks(parsedBookmarks);
      } else {
        // Add some sample bookmarks for demo
        const sampleBookmarks: Bookmark[] = [
          {
            id: "1",
            url: "https://github.com",
            title: "GitHub",
            description: "The world's leading software development platform",
            screenshot: generateScreenshot("https://github.com"),
            tags: ["development", "code", "git"],
            createdAt: new Date(),
          },
          {
            id: "2", 
            url: "https://tailwindcss.com",
            title: "Tailwind CSS",
            description: "A utility-first CSS framework for rapid UI development",
            screenshot: generateScreenshot("https://tailwindcss.com"),
            tags: ["css", "framework", "design"],
            createdAt: new Date(),
          }
        ];
        setBookmarks(sampleBookmarks);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleBookmarks));
      }
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
    }
  }, []);

  // Update filtered results when search query or bookmarks change
  useEffect(() => {
    const results = searchBookmarks(bookmarks, searchQuery);
    setFilteredBookmarks(results);
  }, [bookmarks, searchQuery]);

  const addBookmark = (bookmarkData: {
    url: string;
    title: string;
    description: string;
    tags: string[];
  }) => {
    if (bookmarks.length >= MAX_BOOKMARKS) {
      throw new Error(`You can only save up to ${MAX_BOOKMARKS} bookmarks`);
    }

    const newBookmark: Bookmark = {
      id: crypto.randomUUID(),
      ...bookmarkData,
      screenshot: generateScreenshot(bookmarkData.url),
      createdAt: new Date(),
    };

    const updatedBookmarks = [newBookmark, ...bookmarks];
    setBookmarks(updatedBookmarks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
  };

  const deleteBookmark = (id: string) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== id);
    setBookmarks(updatedBookmarks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
  };

  const searchBookmarksHandler = (query: string) => {
    setSearchQuery(query);
  };

  const updateBookmarkNotes = (id: string, notes: string) => {
    const updatedBookmarks = bookmarks.map(bookmark => 
      bookmark.id === id ? { ...bookmark, notes } : bookmark
    );
    setBookmarks(updatedBookmarks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
  };

  const updateBookmarkAiDescription = (id: string, aiDescription: string) => {
    const updatedBookmarks = bookmarks.map(bookmark => 
      bookmark.id === id ? { ...bookmark, aiDescription } : bookmark
    );
    setBookmarks(updatedBookmarks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
  };

  return {
    bookmarks: filteredBookmarks,
    allBookmarks: bookmarks,
    addBookmark,
    deleteBookmark,
    updateBookmarkNotes,
    updateBookmarkAiDescription,
    searchBookmarks: searchBookmarksHandler,
    searchQuery,
    maxBookmarks: MAX_BOOKMARKS,
  };
};