import React from 'react';

import { useDeviceSize } from '@/hooks/use-device-size';
import { cn } from '@/lib/utils';

type VideoBreakpoints = {
  mobileMax: number;
  tabletMax: number;
};

export interface VideoProps extends Omit<React.ComponentPropsWithoutRef<'video'>, 'src'> {
  // Backward-compatible responsive source props.
  mobileSrc?: string;
  tabletSrc?: string;
  desktopSrc?: string;
  // Optional single source for non-responsive usage.
  src?: string;
  // If true, picks source using device size/orientation when responsive sources are provided.
  useDeviceDetection?: boolean;
  // Preserve previous behavior by default: only swap sources in portrait.
  preferPortraitSources?: boolean;
  // Customizable responsive breakpoints.
  breakpoints?: Partial<VideoBreakpoints>;
  // Convenience alias for aria-label when this video is not decorative.
  a11yLabel?: string;
  // Decorative videos are hidden from assistive tech.
  decorative?: boolean;
  // Optional captions track settings.
  captionsSrc?: string;
  captionsSrcLang?: string;
  captionsLabel?: string;
  captionsDefault?: boolean;
  // MIME type used for generated source tags.
  sourceType?: string;
}

const DEFAULT_BREAKPOINTS: VideoBreakpoints = {
  mobileMax: 540,
  tabletMax: 1024,
};

const VideoComponent: React.FC<VideoProps> = ({
  className,
  src,
  mobileSrc,
  tabletSrc,
  desktopSrc,
  useDeviceDetection = true,
  preferPortraitSources = true,
  breakpoints,
  a11yLabel,
  decorative,
  captionsSrc,
  captionsSrcLang = 'en',
  captionsLabel = 'English captions',
  captionsDefault = false,
  sourceType = 'video/mp4',
  controls = false,
  children,
  ...rest
}) => {
  const { size, isPortrait } = useDeviceSize();
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const resolvedBreakpoints = React.useMemo(
    () => ({ ...DEFAULT_BREAKPOINTS, ...breakpoints }),
    [breakpoints],
  );

  const hasResponsiveSources = Boolean(mobileSrc || tabletSrc || desktopSrc);
  const shouldAutoRenderSources = !children && hasResponsiveSources;

  const selectedSrc = React.useMemo(() => {
    if (!useDeviceDetection || !hasResponsiveSources) {
      return src ?? desktopSrc ?? tabletSrc ?? mobileSrc ?? '';
    }

    const shortestSide = Math.min(size.width, size.height);
    const allowSwap = preferPortraitSources ? isPortrait : true;

    if (allowSwap && shortestSide < resolvedBreakpoints.mobileMax) {
      return mobileSrc ?? tabletSrc ?? desktopSrc ?? src ?? '';
    }

    if (allowSwap && shortestSide <= resolvedBreakpoints.tabletMax) {
      return tabletSrc ?? desktopSrc ?? mobileSrc ?? src ?? '';
    }

    return desktopSrc ?? tabletSrc ?? mobileSrc ?? src ?? '';
  }, [
    useDeviceDetection,
    hasResponsiveSources,
    src,
    desktopSrc,
    tabletSrc,
    mobileSrc,
    size.width,
    size.height,
    preferPortraitSources,
    isPortrait,
    resolvedBreakpoints.mobileMax,
    resolvedBreakpoints.tabletMax,
  ]);

  const effectiveDecorative = decorative ?? !controls;
  const ariaLabel = a11yLabel ?? rest['aria-label'];
  const ariaHidden = effectiveDecorative ? true : rest['aria-hidden'];

  const orientationClause = preferPortraitSources ? ' and (orientation: portrait)' : '';
  const mobileMedia = `(max-width: ${Math.max(resolvedBreakpoints.mobileMax - 1, 0)}px)${orientationClause}`;
  const tabletMedia = `(min-width: ${resolvedBreakpoints.mobileMax}px) and (max-width: ${resolvedBreakpoints.tabletMax}px)${orientationClause}`;
  const desktopMedia = `(min-width: ${resolvedBreakpoints.tabletMax + 1}px)`;

  React.useEffect(() => {
    if (videoRef.current && selectedSrc) {
      videoRef.current.load();
    }
  }, [selectedSrc]);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && !effectiveDecorative && !ariaLabel && !controls) {
      console.warn(
        'VideoComponent: non-decorative videos without controls should include an accessible label (a11yLabel or aria-label).',
      );
    }
  }, [ariaLabel, controls, effectiveDecorative]);

  return (
    <video
      controls={controls}
      ref={videoRef}
      src={shouldAutoRenderSources ? undefined : selectedSrc}
      aria-hidden={ariaHidden}
      aria-label={effectiveDecorative ? undefined : ariaLabel}
      role={effectiveDecorative ? 'presentation' : rest.role}
      className={cn('h-full w-full transform-gpu object-cover will-change-transform', className)}
      {...rest}>
      {shouldAutoRenderSources && (
        <>
          {useDeviceDetection && selectedSrc && <source src={selectedSrc} type={sourceType} />}
          {desktopSrc && <source media={desktopMedia} src={desktopSrc} type={sourceType} />}
          {tabletSrc && <source media={tabletMedia} src={tabletSrc} type={sourceType} />}
          {mobileSrc && <source media={mobileMedia} src={mobileSrc} type={sourceType} />}
        </>
      )}
      <track
        kind='captions'
        src={captionsSrc}
        srcLang={captionsSrcLang}
        label={captionsLabel}
        default={captionsDefault}
      />
      {children}
    </video>
  );
};

export default VideoComponent;
