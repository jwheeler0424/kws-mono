/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { useDeviceSize } from '@/hooks/use-device-size';

import Video from './video';

vi.mock('@/hooks/use-device-size', () => ({
  useDeviceSize: vi.fn<typeof useDeviceSize>(),
}));

let load: MockInstance<HTMLMediaElement['load']>;
let play: MockInstance<HTMLMediaElement['play']>;

beforeEach(() => {
  vi.mocked(useDeviceSize).mockReturnValue({
    size: { width: 390, height: 844 },
    isPortrait: true,
  });
  load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('responsive video autoplay', () => {
  it('offers the browser only the matching viewport source list and reloads on rotation', () => {
    const mobileSrc = [
      { src: '/intro-mobile-high.mp4', type: 'video/mp4; codecs="hvc1.2.4.L120.90"' },
      { src: '/intro-mobile-low.mp4', type: 'video/mp4; codecs="avc1.640028"' },
    ];
    const desktopSrc = [
      { src: '/intro-desktop-high.mp4', type: 'video/mp4; codecs="hvc1.2.4.L120.90"' },
      { src: '/intro-desktop-low.mp4', type: 'video/mp4; codecs="avc1.640028"' },
    ];
    const { container, rerender } = render(
      <Video
        autoPlay
        muted
        playsInline
        mobileSrc={mobileSrc}
        tabletSrc={mobileSrc}
        desktopSrc={desktopSrc}
      />,
    );
    const sources = () =>
      Array.from(container.querySelectorAll('source'), (source) => ({
        src: source.getAttribute('src'),
        type: source.getAttribute('type'),
      }));

    expect(sources()).toEqual(mobileSrc);
    expect(container.querySelector('video')?.hasAttribute('src')).toBe(false);
    vi.mocked(useDeviceSize).mockReturnValue({
      size: { width: 844, height: 390 },
      isPortrait: false,
    });
    rerender(
      <Video
        autoPlay
        muted
        playsInline
        mobileSrc={mobileSrc}
        tabletSrc={mobileSrc}
        desktopSrc={desktopSrc}
      />,
    );
    expect(sources()).toEqual(desktopSrc);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('sets Safari playback properties before loading the portrait source', () => {
    load.mockImplementation(function (this: HTMLMediaElement) {
      expect(this.autoplay).toBe(true);
      expect(this.loop).toBe(true);
      expect(this.muted).toBe(true);
      expect(this.defaultMuted).toBe(true);
      expect((this as HTMLVideoElement).playsInline).toBe(true);
      expect(this.hasAttribute('muted')).toBe(true);
    });
    const { container } = render(
      <Video
        autoPlay
        loop
        muted
        playsInline
        mobileSrc='/portrait.mp4'
        desktopSrc='/landscape.mp4'
      />,
    );

    expect(container.querySelector('source')?.getAttribute('src')).toBe('/portrait.mp4');
    expect(load).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledOnce();
  });

  it('retries playback when ready and after returning to the page', () => {
    const { container } = render(<Video autoPlay muted playsInline src='/portrait.mp4' />);
    const video = container.querySelector('video')!;
    fireEvent.loadedData(video);
    fireEvent.canPlay(video);
    fireEvent(document, new Event('visibilitychange'));
    fireEvent(window, new Event('pageshow'));

    expect(play).toHaveBeenCalledTimes(5);
  });

  it('reloads and resumes when the responsive source changes', () => {
    const { container, rerender } = render(
      <Video
        autoPlay
        loop
        muted
        playsInline
        mobileSrc='/portrait.mp4'
        desktopSrc='/landscape.mp4'
      />,
    );
    vi.mocked(useDeviceSize).mockReturnValue({
      size: { width: 1440, height: 900 },
      isPortrait: false,
    });
    rerender(
      <Video
        autoPlay
        loop
        muted
        playsInline
        mobileSrc='/portrait.mp4'
        desktopSrc='/landscape.mp4'
      />,
    );

    expect(container.querySelector('source')?.getAttribute('src')).toBe('/landscape.mp4');
    expect(container.querySelector('video')?.autoplay).toBe(true);
    expect(container.querySelector('video')?.loop).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
    expect(play).toHaveBeenCalledTimes(2);
    expect(play.mock.invocationCallOrder[1]!).toBeGreaterThan(load.mock.invocationCallOrder[1]!);
  });

  it('offers a direct user-gesture fallback when autoplay is blocked', async () => {
    play.mockRejectedValueOnce(new DOMException('Autoplay blocked', 'NotAllowedError'));
    const { container } = render(<Video autoPlay muted playsInline src='/portrait.mp4' />);

    const button = await screen.findByRole('button', { name: 'Play video' });
    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(2);
    fireEvent.playing(container.querySelector('video')!);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Play video' })).toBeNull());
  });

  it('does not force playback on non-autoplay videos', () => {
    render(<Video controls src='/video.mp4' />);
    expect(play).not.toHaveBeenCalled();
  });
});
