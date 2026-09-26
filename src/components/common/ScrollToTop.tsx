import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically scrolls window to top on route navigation
 * ensuring seamless user experience across the entire site.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  // Filter state is mirrored into the query string. Query-only changes must
  // preserve the user's scroll position (for example, while dragging salary).
  }, [pathname]);

  return null;
};
