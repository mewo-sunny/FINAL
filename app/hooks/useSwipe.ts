import { PanResponder } from "react-native";

type SwipeHandlers = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  return PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 20 && Math.abs(gesture.dy) < 50,

    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 50) {
        onSwipeRight?.();
      } else if (gesture.dx < -50) {
        onSwipeLeft?.();
      }
    },
  });
}
