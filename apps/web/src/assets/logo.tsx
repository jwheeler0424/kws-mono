import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type LogoVariant = 'colorized' | 'ghost' | 'solid';

export type LogoIconProps = ComponentProps<'svg'> & {
  variant?: LogoVariant;
};

export function LogoIcon({ className, variant }: LogoIconProps) {
  switch (variant) {
    case 'colorized':
      return <LogoIconColorized className={className} />;
    case 'ghost':
      return <LogoIconGhost className={className} />;
    case 'solid':
      return <LogoIconSolid className={className} />;
    default:
      return <LogoIconSolid className={className} />;
  }
}

export function LogoIconColorized({ className }: ComponentProps<'svg'>) {
  return (
    <svg
      width='48'
      height='48'
      viewBox='0 0 48 48'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}>
      <path opacity='0.5' d='M4 14.5264V33.4737L21.8947 21.23V2.28259L4 14.5264Z' fill='#7839EE' />
      <path
        opacity='0.5'
        d='M4 33.4737V14.5263L21.8947 26.7701V45.7175L4 33.4737Z'
        fill='#3538CD'
      />
      <path
        opacity='0.5'
        d='M44 14.5263V33.4737L26.1053 21.2299V2.28254L44 14.5263Z'
        fill='#7839EE'
      />
      <path
        opacity='0.5'
        d='M44 33.4737V14.5263L26.1053 26.7701V45.7175L44 33.4737Z'
        fill='#3538CD'
      />
    </svg>
  );
}

export function LogoIconGhost({ className }: ComponentProps<'svg'>) {
  return (
    <svg
      width='48'
      height='48'
      viewBox='0 0 48 48'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}>
      <g opacity='0.84'>
        <path
          opacity='0.5'
          d='M4 14.5264V33.4737L21.8947 21.23V2.28259L4 14.5264Z'
          fill='#EEF4FF'
        />
        <path
          opacity='0.5'
          d='M4 33.4737V14.5263L21.8947 26.7701V45.7175L4 33.4737Z'
          fill='#EEF4FF'
        />
        <path
          opacity='0.5'
          d='M44 14.5263V33.4737L26.1053 21.2299V2.28253L44 14.5263Z'
          fill='#EEF4FF'
        />
        <path
          opacity='0.5'
          d='M44 33.4737V14.5263L26.1053 26.7701V45.7175L44 33.4737Z'
          fill='#EEF4FF'
        />
      </g>
    </svg>
  );
}

export function LogoIconSolid({ className }: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox='0 0 54 54'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={cn('size-9', className)}>
      <g filter='url(#filter0_ddiii_12483_12621)'>
        <g clipPath='url(#clip0_12483_12621)'>
          <rect x='3' width='48' height='48' rx='12' fill='#3538CD' />
          <rect
            width='48'
            height='48'
            transform='translate(3)'
            fill='url(#paint0_linear_12483_12621)'
          />
          <g filter='url(#filter1_d_12483_12621)'>
            <path
              opacity='0.7'
              d='M12 16.8948V31.1053L25.4211 21.9225V7.71194L12 16.8948Z'
              fill='url(#paint1_linear_12483_12621)'
            />
            <path
              opacity='0.7'
              d='M12 31.1053V16.8947L25.4211 26.0776V40.2881L12 31.1053Z'
              fill='url(#paint2_linear_12483_12621)'
            />
            <path
              opacity='0.7'
              d='M42 16.8947V31.1053L28.5789 21.9224V7.7119L42 16.8947Z'
              fill='url(#paint3_linear_12483_12621)'
            />
            <path
              opacity='0.7'
              d='M42 31.1053V16.8947L28.5789 26.0776V40.2881L42 31.1053Z'
              fill='url(#paint4_linear_12483_12621)'
            />
          </g>
        </g>
        <rect
          x='4'
          y='1'
          width='46'
          height='46'
          rx='11'
          stroke='url(#paint5_linear_12483_12621)'
          strokeWidth={2}
        />
      </g>
      <defs>
        <filter
          id='filter0_ddiii_12483_12621'
          x='0'
          y='-3'
          width='54'
          height='57'
          filterUnits='userSpaceOnUse'
          colorInterpolationFilters='sRGB'>
          <feFlood floodOpacity={0} result='BackgroundImageFix' />
          <feColorMatrix
            in='SourceAlpha'
            type='matrix'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
            result='hardAlpha'
          />
          <feOffset dy='1' />
          <feGaussianBlur stdDeviation='0.5' />
          <feComposite in2='hardAlpha' operator='out' />
          <feColorMatrix
            type='matrix'
            values='0 0 0 0 0.162923 0 0 0 0 0.162923 0 0 0 0 0.162923 0 0 0 0.08 0'
          />
          <feBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_12483_12621' />
          <feColorMatrix
            in='SourceAlpha'
            type='matrix'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
            result='hardAlpha'
          />
          <feMorphology
            radius='1'
            operator='erode'
            in='SourceAlpha'
            result='effect2_dropShadow_12483_12621'
          />
          <feOffset dy='3' />
          <feGaussianBlur stdDeviation='2' />
          <feComposite in2='hardAlpha' operator='out' />
          <feColorMatrix
            type='matrix'
            values='0 0 0 0 0.164706 0 0 0 0 0.164706 0 0 0 0 0.164706 0 0 0 0.14 0'
          />
          <feBlend
            mode='normal'
            in2='effect1_dropShadow_12483_12621'
            result='effect2_dropShadow_12483_12621'
          />
          <feBlend
            mode='normal'
            in='SourceGraphic'
            in2='effect2_dropShadow_12483_12621'
            result='shape'
          />
          <feColorMatrix
            in='SourceAlpha'
            type='matrix'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
            result='hardAlpha'
          />
          <feOffset dy='-3' />
          <feGaussianBlur stdDeviation='1.5' />
          <feComposite in2='hardAlpha' operator='arithmetic' k2='-1' k3='1' />
          <feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0' />
          <feBlend mode='normal' in2='shape' result='effect3_innerShadow_12483_12621' />
          <feColorMatrix
            in='SourceAlpha'
            type='matrix'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
            result='hardAlpha'
          />
          <feOffset dy='3' />
          <feGaussianBlur stdDeviation='1.5' />
          <feComposite in2='hardAlpha' operator='arithmetic' k2='-1' k3='1' />
          <feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0' />
          <feBlend
            mode='normal'
            in2='effect3_innerShadow_12483_12621'
            result='effect4_innerShadow_12483_12621'
          />
          <feColorMatrix
            in='SourceAlpha'
            type='matrix'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
            result='hardAlpha'
          />
          <feMorphology
            radius='1'
            operator='erode'
            in='SourceAlpha'
            result='effect5_innerShadow_12483_12621'
          />
          <feOffset />
          <feComposite in2='hardAlpha' operator='arithmetic' k2='-1' k3='1' />
          <feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0' />
          <feBlend
            mode='normal'
            in2='effect4_innerShadow_12483_12621'
            result='effect5_innerShadow_12483_12621'
          />
        </filter>
        <filter
          id='filter1_d_12483_12621'
          x='9'
          y='5.25'
          width='36'
          height='42'
          filterUnits='userSpaceOnUse'
          colorInterpolationFilters='sRGB'>
          <feFlood floodOpacity={0} result='BackgroundImageFix' />
          <feColorMatrix
            in='SourceAlpha'
            type='matrix'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
            result='hardAlpha'
          />
          <feMorphology
            radius='1.5'
            operator='erode'
            in='SourceAlpha'
            result='effect1_dropShadow_12483_12621'
          />
          <feOffset dy='2.25' />
          <feGaussianBlur stdDeviation='2.25' />
          <feComposite in2='hardAlpha' operator='out' />
          <feColorMatrix
            type='matrix'
            values='0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0.1 0'
          />
          <feBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_12483_12621' />
          <feBlend
            mode='normal'
            in='SourceGraphic'
            in2='effect1_dropShadow_12483_12621'
            result='shape'
          />
        </filter>
        <linearGradient
          id='paint0_linear_12483_12621'
          x1='24'
          y1='5.96047e-07'
          x2='26'
          y2='48'
          gradientUnits='userSpaceOnUse'>
          <stop stopColor='white' stopOpacity={0} />
          <stop offset='1' stopColor='white' stopOpacity={0.12} />
        </linearGradient>
        <linearGradient
          id='paint1_linear_12483_12621'
          x1='18.7105'
          y1='7.71194'
          x2='18.7105'
          y2='31.1053'
          gradientUnits='userSpaceOnUse'>
          <stop stopColor='#F5F8FF' stopOpacity={0.8} />
          <stop offset='1' stopColor='#F5F8FF' stopOpacity={0.5} />
        </linearGradient>
        <linearGradient
          id='paint2_linear_12483_12621'
          x1='18.7105'
          y1='40.2881'
          x2='18.7105'
          y2='16.8947'
          gradientUnits='userSpaceOnUse'>
          <stop stopColor='#F5F8FF' stopOpacity={0.8} />
          <stop offset='1' stopColor='#F5F8FF' stopOpacity={0.5} />
        </linearGradient>
        <linearGradient
          id='paint3_linear_12483_12621'
          x1='35.2895'
          y1='7.7119'
          x2='35.2895'
          y2='31.1053'
          gradientUnits='userSpaceOnUse'>
          <stop stopColor='#F5F8FF' stopOpacity={0.8} />
          <stop offset='1' stopColor='#F5F8FF' stopOpacity={0.5} />
        </linearGradient>
        <linearGradient
          id='paint4_linear_12483_12621'
          x1='35.2895'
          y1='40.2881'
          x2='35.2895'
          y2='16.8947'
          gradientUnits='userSpaceOnUse'>
          <stop stopColor='#F5F8FF' stopOpacity={0.8} />
          <stop offset='1' stopColor='#F5F8FF' stopOpacity={0.5} />
        </linearGradient>
        <linearGradient
          id='paint5_linear_12483_12621'
          x1='27'
          y1='0'
          x2='27'
          y2='48'
          gradientUnits='userSpaceOnUse'>
          <stop stopColor='white' stopOpacity={0.12} />
          <stop offset='1' stopColor='white' stopOpacity={0} />
        </linearGradient>
        <clipPath id='clip0_12483_12621'>
          <rect x='3' width='48' height='48' rx='12' fill='white' />
        </clipPath>
      </defs>
    </svg>
  );
}
