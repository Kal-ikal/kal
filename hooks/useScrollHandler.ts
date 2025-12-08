import { useRef } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useTabBarStore } from '@/hooks/useTabBarStore';

export const useScrollHandler = () => {
  const setIsVisible = useTabBarStore((state) => state.setIsVisible);
  const lastOffsetY = useRef(0);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastOffsetY.current;

    // Threshold to avoid jitter
    if (Math.abs(diff) > 20) {
      if (diff > 0 && currentY > 50) {
        // Scrolling Down -> Hide
        setIsVisible(false);
      } else if (diff < 0) {
        // Scrolling Up -> Show
        setIsVisible(true);
      }
      lastOffsetY.current = currentY;
    }
  };

  return { onScroll };
};