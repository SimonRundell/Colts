import { useEffect, useMemo, useRef, useState } from "react";
import "./threeCardImageFader.css";

/**
 * Default time (in milliseconds) to wait between image transitions.
 * Can be overridden via props or JSON config.
 * @constant {number}
 */
const DEFAULT_INTERVAL_MS = 5000;

/**
 * Default duration (in milliseconds) for the crossfade transition.
 * Can be overridden via props or JSON config.
 * @constant {number}
 */
const DEFAULT_FADE_MS = 3000;

/**
 * Picks a random item from a list, excluding a specific value.
 * Useful for ensuring the next selection is different from the current one.
 * 
 * @param {Array<*>} list - Array of items to pick from
 * @param {*} exclude - Value to exclude from selection
 * @returns {*|null} A random item from the list (excluding the specified value), or null if list is empty
 * 
 * @example
 * pickRandomExcluding(['a', 'b', 'c'], 'b') // returns 'a' or 'c'
 */
function pickRandomExcluding(list, exclude) {
  if (!list || list.length === 0) return null;
  if (list.length === 1) return list[0];
  let candidate = exclude;
  while (candidate === exclude) {
    const idx = Math.floor(Math.random() * list.length);
    candidate = list[idx];
  }
  return candidate;
}

/**
 * Picks a random item from a list that is not in the exclusion set.
 * Useful for selecting an image that isn't currently visible on any card.
 * 
 * @param {Array<*>} list - Array of items to pick from
 * @param {Set<*>} excludeSet - Set of values to exclude from selection
 * @returns {*|null} A random item not in the exclusion set, or null if no valid candidates exist
 * 
 * @example
 * pickRandomNotIn(['a', 'b', 'c', 'd'], new Set(['a', 'b'])) // returns 'c' or 'd'
 */
function pickRandomNotIn(list, excludeSet) {
  if (!list || list.length === 0) return null;
  const candidates = list.filter((x) => !excludeSet.has(x));
  if (candidates.length === 0) return null;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

/**
 * Card component that displays two overlapping images with crossfade capability.
 * Uses absolute positioning and opacity transitions to smoothly fade between images.
 * 
 * @param {Object} props
 * @param {string|null} props.aSrc - Source URL for the first image layer
 * @param {string|null} props.bSrc - Source URL for the second image layer
 * @param {boolean} props.showA - If true, show layer A; otherwise show layer B
 * @param {number} props.fadeMs - Duration of the fade transition in milliseconds
 * @returns {JSX.Element} A card containing two crossfading image layers
 * 
 * @description
 * The card maintains two image layers (A and B) to enable smooth crossfading.
 * Only one layer is visible at a time (controlled by the `visible` class).
 * Images are conditionally rendered to avoid empty src attributes.
 */
function Card({ aSrc, bSrc, showA, fadeMs }) {
  return (
    <div className="tcf-card">
      {aSrc && (
        <img
          className={"tcf-layer " + (showA ? "visible" : "")}
          src={aSrc}
          alt=""
          style={{ transitionDuration: `${fadeMs}ms` }}
        />
      )}
      {bSrc && (
        <img
          className={"tcf-layer " + (!showA ? "visible" : "")}
          src={bSrc}
          alt=""
          style={{ transitionDuration: `${fadeMs}ms` }}
        />
      )}
    </div>
  );
}

/**
 * ThreeCardImageFader Component
 * 
 * A React component that displays three side-by-side image cards (each ~33% viewport width)
 * with continuous random crossfade transitions. One random card fades to a new random image
 * at regular intervals, creating an engaging slideshow effect.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.configSource="/images.json"] - Path or URL to the JSON configuration file
 * @param {number} [props.defaultIntervalMs=5000] - Default interval between transitions in milliseconds (fallback if not in JSON)
 * @param {number} [props.defaultFadeMs=3000] - Default fade transition duration in milliseconds (fallback if not in JSON)
 * @param {string} [props.className=""] - Additional CSS class names to apply to the container
 * @param {React.CSSProperties} [props.style={}] - Inline styles to apply to the container
 * 
 * @returns {JSX.Element} Three-card image fader component
 * 
 * @example
 * // Basic usage with default config
 * <ThreeCardImageFader />
 * 
 * @example
 * // Custom config path and timing
 * <ThreeCardImageFader 
 *   configSource="/data/gallery.json"
 *   defaultIntervalMs={7000}
 *   defaultFadeMs={4000}
 * />
 * 
 * @example
 * // With custom styling
 * <ThreeCardImageFader 
 *   className="hero-slideshow"
 *   style={{ height: '80vh', borderRadius: '8px' }}
 * />
 * 
 * @description
 * ## JSON Configuration Format
 * 
 * The component supports two JSON formats:
 * 
 * ### Full format (recommended):
 * ```json
 * {
 *   "images": ["/path/to/image1.png", "/path/to/image2.png"],
 *   "INTERVAL_MS": 5000,
 *   "FADE_MS": 3000
 * }
 * ```
 * 
 * ### Legacy array format:
 * ```json
 * ["/path/to/image1.png", "/path/to/image2.png"]
 * ```
 * 
 * ## Behavior
 * - Loads image list and timing config from JSON on mount
 * - Initializes three cards with random images
 * - Every `INTERVAL_MS` milliseconds:
 *   - Selects one random card (0, 1, or 2)
 *   - Picks a new image that is NOT currently visible on any card
 *   - Crossfades that card to the new image over `FADE_MS` milliseconds
 * - Images are contained and cropped using `object-fit: cover`
 * - Responsive layout maintains three columns on all screen sizes
 * 
 * ## Image Selection Logic
 * 1. Builds a set of currently visible images across all three cards
 * 2. Selects a random image that is NOT in that set (avoids duplicates)
 * 3. Fallback: if no unique image available, picks any image different from the target card
 * 4. Ultimate fallback: if only one image exists, keeps the current image
 * 
 * ## State Management
 * - `images`: Array of image URLs from config
 * - `intervalMs`: Time between transitions
 * - `fadeMs`: Crossfade duration
 * - `cards`: Array of 3 card objects, each with:
 *   - `a`: First image layer URL
 *   - `b`: Second image layer URL
 *   - `showA`: Boolean indicating which layer is currently visible
 * 
 * ## Performance Considerations
 * - Uses `useMemo` to prevent unnecessary re-renders
 * - Interval is cleaned up and restarted when config changes
 * - Images are conditionally rendered to avoid empty src attributes
 * - Component unmount properly cleans up timers
 */
export default function ThreeCardImageFader({
  configSource = "/images.json",
  defaultIntervalMs = 5000,
  defaultFadeMs = 3000,
  className = "",
  style = {},
}) {
  // State: array of image URLs loaded from config
  const [images, setImages] = useState([]);
  
  // State: time between transitions (ms)
  const [intervalMs, setIntervalMs] = useState(defaultIntervalMs);
  
  // State: duration of crossfade animation (ms)
  const [fadeMs, setFadeMs] = useState(defaultFadeMs);
  
  // State: array of three card objects, each maintaining two image layers for crossfading
  const [cards, setCards] = useState([
    { a: null, b: null, showA: true },
    { a: null, b: null, showA: true },
    { a: null, b: null, showA: true },
  ]);

  // Ref: holds the interval timer ID for cleanup
  const timerRef = useRef(null);

  /**
   * Effect: Load configuration from JSON file or API
   * Fetches the config, parses it, and updates state with images and timing values.
   * Supports both object format (with images array and timing) and legacy array format.
   */
  useEffect(() => {
    let isMounted = true;
    fetch(configSource)
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        
        // Legacy format: plain array of image URLs
        if (Array.isArray(data)) {
          setImages(data);
          setIntervalMs(defaultIntervalMs);
          setFadeMs(defaultFadeMs);
        } 
        // Modern format: object with images array and optional timing
        else if (data && typeof data === "object") {
          const imgs = Array.isArray(data.images) ? data.images : [];
          const interval = Number(data.INTERVAL_MS ?? data.intervalMs);
          const fade = Number(data.FADE_MS ?? data.fadeMs);
          setImages(imgs);
          setIntervalMs(Number.isFinite(interval) && interval > 0 ? interval : defaultIntervalMs);
          setFadeMs(Number.isFinite(fade) && fade > 0 ? fade : defaultFadeMs);
        } 
        // Invalid format: reset to defaults
        else {
          setImages([]);
          setIntervalMs(defaultIntervalMs);
          setFadeMs(defaultFadeMs);
        }
      })
      .catch(() => {
        // On fetch error: reset to defaults
        setImages([]);
        setIntervalMs(defaultIntervalMs);
        setFadeMs(defaultFadeMs);
      });
    return () => {
      isMounted = false;
    };
  }, [configSource, defaultIntervalMs, defaultFadeMs]);

  /**
   * Effect: Initialize cards with random images once config loads
   * Sets each card to display a random image from the loaded list.
   */
  useEffect(() => {
    if (!images || images.length === 0) return;
    setCards((prev) =>
      prev.map(() => {
        const initial = images[Math.floor(Math.random() * images.length)];
        return { a: initial, b: initial, showA: true };
      })
    );
  }, [images]);

  /**
   * Effect: Set up the continuous crossfade loop
   * Creates an interval that randomly selects a card and fades it to a new image.
   * Ensures the new image is not currently visible on any card (no duplicates).
   */
  useEffect(() => {
    if (!images || images.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCards((prev) => {
        // Pick a random card to transition (0, 1, or 2)
        const target = Math.floor(Math.random() * 3);
        
        // Build set of currently visible images across all cards
        const visibleSet = new Set(
          prev
            .map((c) => (c.showA ? c.a : c.b))
            .filter(Boolean)
        );

        const next = [...prev];
        const currentCard = prev[target];
        if (!currentCard) return prev;

        const currentVisible = currentCard.showA ? currentCard.a : currentCard.b;
        
        // Try to pick an image not currently visible on any card
        let newImg = pickRandomNotIn(images, visibleSet);
        
        // Fallback: at least avoid selecting the same as the current card
        if (!newImg) newImg = pickRandomExcluding(images, currentVisible);
        
        // Ultimate fallback: if only one image exists, keep current
        if (!newImg) newImg = currentVisible;

        // Create updated card without mutating prev state
        // Write new image to the hidden layer, then flip visibility
        let updated;
        if (currentCard.showA) {
          updated = { ...currentCard, b: newImg, showA: false };
        } else {
          updated = { ...currentCard, a: newImg, showA: true };
        }
        next[target] = updated;
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images, intervalMs]);

  /**
   * Memoized render of the three-card container
   * Prevents unnecessary re-renders when unrelated state changes
   */
  const content = useMemo(
    () => (
      <div className={`tcf-container ${className}`.trim()} style={style}>
        {cards.map((c, i) => (
          <Card key={i} aSrc={c.a} bSrc={c.b} showA={c.showA} fadeMs={fadeMs} />)
        )}
      </div>
    ),
    [cards, fadeMs, className, style]
  );

  return content;
}
