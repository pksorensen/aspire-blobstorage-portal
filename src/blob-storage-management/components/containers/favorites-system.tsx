'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoritesSystemProps {
  containerName: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

const FAVORITES_STORAGE_KEY = 'azure-storage-container-favorites';

// Custom hook for managing favorites
function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored);
        if (Array.isArray(parsedFavorites)) {
          setFavorites(new Set(parsedFavorites));
        }
      }
    } catch (error) {
      console.warn('Failed to load favorites from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(newFavorites)));
      setFavorites(newFavorites);
    } catch (error) {
      console.warn('Failed to save favorites to localStorage:', error);
    }
  }, []);

  const addFavorite = useCallback((containerName: string) => {
    const newFavorites = new Set(favorites);
    newFavorites.add(containerName);
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  const removeFavorite = useCallback((containerName: string) => {
    const newFavorites = new Set(favorites);
    newFavorites.delete(containerName);
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  const isFavorite = useCallback((containerName: string) => {
    return favorites.has(containerName);
  }, [favorites]);

  const toggleFavorite = useCallback((containerName: string) => {
    if (isFavorite(containerName)) {
      removeFavorite(containerName);
    } else {
      addFavorite(containerName);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favorites: Array.from(favorites),
    isLoaded,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  };
}

export function FavoriteButton({ containerName, className, size = 'default' }: FavoritesSystemProps) {
  const { isFavorite, toggleFavorite, isLoaded } = useFavorites();
  const favorited = isFavorite(containerName);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(containerName);
  };

  // Don't render until favorites are loaded to prevent hydration mismatch
  if (!isLoaded) {
    return (
      <Button 
        variant="ghost" 
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'icon'}
        className={cn("opacity-0", className)}
        disabled
      >
        <Heart className={cn(
          size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
        )} />
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'icon'}
      onClick={handleToggle}
      className={cn(
        "transition-colors hover:text-red-500",
        favorited && "text-red-500",
        className
      )}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={cn(
          size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
          favorited && "fill-current"
        )} 
      />
      <span className="sr-only">
        {favorited ? 'Remove from favorites' : 'Add to favorites'}
      </span>
    </Button>
  );
}

// Component for displaying all favorites
export function FavoritesList() {
  const { favorites, isLoaded } = useFavorites();

  if (!isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading favorites...</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No favorite containers yet. Click the heart icon next to any container to add it to favorites.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">Favorite Containers</h3>
      <div className="space-y-1">
        {favorites.map((containerName) => (
          <div
            key={containerName}
            className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
          >
            <span className="font-mono text-sm">{containerName}</span>
            <FavoriteButton containerName={containerName} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook export for other components
export { useFavorites };