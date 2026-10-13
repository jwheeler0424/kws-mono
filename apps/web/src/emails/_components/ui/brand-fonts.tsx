import { Font } from '@react-email/components';

import { getEmailAssetSrc } from '../../_shared';

const fonts = [
  {
    fontFamily: 'Compass Sans',
    fallbackFontFamily: 'Verdana',
    fontWeight: 400,
    url: '/assets/fonts/compass/CompassSans-Regular.ttf',
  },
  {
    fontFamily: 'Compass Sans',
    fallbackFontFamily: 'Verdana',
    fontWeight: 500,
    url: '/assets/fonts/compass/CompassSans-Medium.ttf',
  },
  {
    fontFamily: 'Compass Sans',
    fallbackFontFamily: 'Verdana',
    fontWeight: 700,
    url: '/assets/fonts/compass/CompassSans-Bold.ttf',
  },
  {
    fontFamily: 'Compass Display',
    fallbackFontFamily: 'Georgia',
    fontWeight: 400,
    url: '/assets/fonts/compass/CompassDisplay-Regular.ttf',
  },
  {
    fontFamily: 'GT Pressura Mono',
    fallbackFontFamily: 'monospace',
    fontWeight: 400,
    url: '/assets/fonts/compass/GT-Pressura-Mono-Regular.ttf',
  },
] as const;

function BrandFonts() {
  return fonts.map(({ fontFamily, fallbackFontFamily, fontWeight, url }) => (
    <Font
      key={url}
      fontFamily={fontFamily}
      fallbackFontFamily={fallbackFontFamily}
      webFont={{ url: getEmailAssetSrc(url), format: 'truetype' }}
      fontWeight={fontWeight}
      fontStyle='normal'
    />
  ));
}

export { BrandFonts };
