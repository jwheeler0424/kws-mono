import { PlayIcon } from 'lucide-react';
import React from 'react';

import { useDeviceSize } from '@/hooks/use-device-size';
import { cn } from '@/lib/utils';

type VideoBreakpoints = {
  mobileMax: number;
  tabletMax: number;
};

type VideoSource = { src: string; type: string };
type VideoSources = string | readonly VideoSource[];

export interface VideoProps extends Omit<React.ComponentPropsWithoutRef<'video'>, 'src'> {
  // Backward-compatible responsive source props.
  mobileSrc?: VideoSources;
  tabletSrc?: VideoSources;
  desktopSrc?: VideoSources;
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
  autoPlay = false,
  loop = false,
  muted = false,
  playsInline = false,
  children,
  ...rest
}) => {
  const { size, isPortrait } = useDeviceSize();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [autoplayBlocked, setAutoplayBlocked] = React.useState(false);

  const resolvedBreakpoints = React.useMemo(
    () => ({ ...DEFAULT_BREAKPOINTS, ...breakpoints }),
    [breakpoints],
  );

  const hasResponsiveSources = Boolean(mobileSrc || tabletSrc || desktopSrc);
  const shouldAutoRenderSources = !children && hasResponsiveSources;

  const selectedSource = React.useMemo(() => {
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

  const selectedSources = React.useMemo(
    () =>
      typeof selectedSource === 'string'
        ? selectedSource
          ? [{ src: selectedSource, type: sourceType }]
          : []
        : selectedSource,
    [selectedSource, sourceType],
  );
  const selectedSrc = selectedSources[0]?.src;

  const effectiveDecorative = decorative ?? !controls;
  const ariaLabel = a11yLabel ?? rest['aria-label'];
  const ariaHidden = effectiveDecorative ? true : rest['aria-hidden'];

  const orientationClause = preferPortraitSources ? ' and (orientation: portrait)' : '';
  const mobileMedia = `(max-width: ${Math.max(resolvedBreakpoints.mobileMax - 1, 0)}px)${orientationClause}`;
  const tabletMedia = `(min-width: ${resolvedBreakpoints.mobileMax}px) and (max-width: ${resolvedBreakpoints.tabletMax}px)${orientationClause}`;
  const desktopMedia = `(min-width: ${resolvedBreakpoints.tabletMax + 1}px)`;

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;

    video.autoplay = autoPlay;
    video.loop = loop;
    video.defaultMuted = muted;
    video.muted = muted;
    video.playsInline = playsInline;
    if (muted) video.setAttribute('muted', '');
    else video.removeAttribute('muted');

    const play = () => {
      if (!autoPlay || document.visibilityState === 'hidden') return;
      void video.play()?.catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setAutoplayBlocked(true);
        }
      });
    };
    const onPlaying = () => setAutoplayBlocked(false);

    video.addEventListener('loadeddata', play);
    video.addEventListener('canplay', play);
    video.addEventListener('playing', onPlaying);
    document.addEventListener('visibilitychange', play);
    window.addEventListener('pageshow', play);
    if (selectedSources.length) video.load();
    play();

    return () => {
      active = false;
      video.removeEventListener('loadeddata', play);
      video.removeEventListener('canplay', play);
      video.removeEventListener('playing', onPlaying);
      document.removeEventListener('visibilitychange', play);
      window.removeEventListener('pageshow', play);
    };
  }, [selectedSources, autoPlay, loop, muted, playsInline]);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && !effectiveDecorative && !ariaLabel && !controls) {
      console.warn(
        'VideoComponent: non-decorative videos without controls should include an accessible label (a11yLabel or aria-label).',
      );
    }
  }, [ariaLabel, controls, effectiveDecorative]);

  return (
    <>
      <video
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        ref={videoRef}
        src={shouldAutoRenderSources ? undefined : selectedSrc}
        aria-hidden={ariaHidden}
        aria-label={effectiveDecorative ? undefined : ariaLabel}
        role={effectiveDecorative ? 'presentation' : rest.role}
        className={cn('h-full w-full transform-gpu object-cover will-change-transform', className)}
        {...rest}>
        {shouldAutoRenderSources && (
          <>
            {useDeviceDetection
              ? selectedSources.map((source) => (
                  <source key={source.src} src={source.src} type={source.type} />
                ))
              : [
                  { sources: desktopSrc, media: desktopMedia },
                  { sources: tabletSrc, media: tabletMedia },
                  { sources: mobileSrc, media: mobileMedia },
                ].flatMap(({ sources, media }) =>
                  (typeof sources === 'string'
                    ? [{ src: sources, type: sourceType }]
                    : (sources ?? [])
                  ).map((source) => (
                    <source
                      key={`${media}:${source.src}`}
                      media={media}
                      src={source.src}
                      type={source.type}
                    />
                  )),
                )}
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
      {autoPlay && autoplayBlocked && !controls ? (
        <button
          type='button'
          aria-label='Play video'
          title='Play video'
          className='absolute right-6 bottom-6 z-20 flex size-12 items-center justify-center rounded-full border border-white/50 bg-white/90 text-black shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
          onClick={() => {
            void videoRef.current?.play()?.catch(() => undefined);
          }}>
          <PlayIcon className='size-5' />
        </button>
      ) : null}
    </>
  );
};

export default VideoComponent;
