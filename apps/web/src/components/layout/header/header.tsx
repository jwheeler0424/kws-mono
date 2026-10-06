import { Separator } from '@kws/design/ui/separator';
import { Link, useLocation } from '@tanstack/react-router';
import React from 'react';

import { cn } from '@/lib/utils';

import { Hamburger } from './menus/hamburger';
import { mainNav } from './menus/main-nav';

interface FrontendHeaderProps extends React.ComponentProps<'header'> {
  slug?: string;
}

export function FrontendHeader({ slug, ref, ...props }: FrontendHeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();
  const pathname = slug ?? location.pathname;
  const isTransparent = pathname === '/';

  const handleClick = React.useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <header
      className={cn(
        'relative flex h-16 w-full shrink-0 items-center justify-between bg-white font-sans shadow-md transition-all duration-200 ease-linear before:absolute before:top-0 before:left-0 before:z-40 before:h-0 before:w-full before:bg-transparent sm:h-20 md:py-5',
        isTransparent &&
          'absolute top-0 left-0 z-50 bg-transparent shadow-none before:h-40 before:bg-linear-to-b before:from-black/50 after:absolute after:top-0 after:right-0 after:z-40 after:h-full after:w-full after:origin-bottom after:bg-polaris-primary after:opacity-0 after:transition-opacity after:duration-300 after:ease-linear',
        menuOpen && !isTransparent && 'bg-polaris-primary 2xsdt:bg-white',
        isTransparent &&
          menuOpen &&
          'before:opacity-0 after:bg-polaris-primary after:opacity-100 2xsdt:before:opacity-100 2xsdt:after:opacity-0',
        isTransparent && !menuOpen && 'bg-transparent 2xsdt:bg-transparent',
      )}
      ref={ref}
      {...props}>
      <div
        className={cn(
          'mx-auto flex h-full w-11/12 flex-row items-center justify-between px-2 md:px-5 2xl:px-12',
        )}>
        <div className='z-50 shrink-0'>
          <Link
            to='/'
            title='Kyle Weber at Compass'
            aria-label='Kyle Weber at Compass — Home'
            className='flex items-center no-underline!'>
            <img
              src='/assets/brand/compass-black.png'
              alt='Compass'
              width={180}
              height={24}
              className={cn(
                'h-auto w-32 sm:w-40',
                isTransparent && 'hidden',
                menuOpen && 'hidden 2xsdt:block',
                isTransparent && menuOpen && '2xsdt:hidden',
              )}
            />
            <img
              src='/assets/brand/compass-white.png'
              alt='Compass'
              width={180}
              height={24}
              className={cn(
                'hidden h-auto w-32 sm:w-40',
                isTransparent && 'block',
                menuOpen && 'block 2xsdt:hidden',
                isTransparent && menuOpen && '2xsdt:block',
              )}
            />
          </Link>
        </div>

        <nav
          className={cn(
            'absolute top-16 right-0 z-50 flex w-full origin-top scale-y-0 flex-col bg-polaris-primary px-5 pt-0 pb-3 shadow-md transition-transform duration-300 sm:top-20 sm:max-w-72',
            menuOpen ? 'scale-y-100' : 'invisible scale-y-0 2xsdt:visible',
            '2xsdt:relative 2xsdt:top-auto 2xsdt:right-auto 2xsdt:flex 2xsdt:h-full 2xsdt:w-auto 2xsdt:max-w-none 2xsdt:grow 2xsdt:scale-y-100 2xsdt:flex-row 2xsdt:items-center 2xsdt:bg-transparent 2xsdt:p-0 2xsdt:shadow-none 2xsdt:transition-none',
          )}
          id='menu'>
          <ul
            className={cn(
              'flex flex-col pt-2 transition-opacity duration-200',
              menuOpen ? 'opacity-100' : 'opacity-0',
              '2xsdt:flex 2xsdt:grow 2xsdt:flex-row 2xsdt:items-center 2xsdt:justify-end 2xsdt:gap-5 2xsdt:p-0 2xsdt:opacity-100',
            )}>
            {mainNav.navLinks.map((link, i) => {
              const isActive =
                link.slug === '/' ? pathname === '/' : pathname.startsWith(link.slug);
              return (
                <li
                  key={i}
                  className={cn(
                    'group w-fit cursor-pointer bg-size-[3px_3px] transition-colors duration-200 first:border-none',
                    '2xsdt:w-auto 2xsdt:border-none',
                  )}>
                  <Link
                    to={link.slug}
                    title={link.label}
                    onClick={handleClick}
                    className={cn(
                      'block py-3 text-left font-sans! text-lg! font-medium text-white no-underline! transition-colors duration-200 group-hover:text-neutral-300 2xsdt:block 2xsdt:p-0 2xsdt:text-center 2xsdt:text-sm! 2xsdt:text-gray-600 2xsdt:group-hover:text-polaris-primary',
                      isTransparent &&
                        'font-medium 2xsdt:block 2xsdt:p-0 2xsdt:text-center 2xsdt:text-sm 2xsdt:text-white 2xsdt:drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)] 2xsdt:group-hover:text-neutral-300',
                      isActive && 'text-white 2xsdt:text-polaris-primary',
                      isActive && menuOpen && 'text-white 2xsdt:text-polaris-primary',
                      isActive && isTransparent && '2xsdt:text-white',
                    )}>
                    {link.label}
                  </Link>
                  {isActive && pathname !== '/' && (
                    <Separator
                      className={cn(
                        'h-[1.5px] w-full bg-polaris-primary transition-all duration-200 ease-linear group-hover:bg-polaris-primary',
                        isTransparent && 'bg-white',
                        menuOpen &&
                          '-mt-2 h-1 bg-white group-hover:bg-white 2xsdt:mt-0 2xsdt:h-[1.5px] 2xsdt:bg-polaris-primary 2xsdt:group-hover:bg-polaris-primary-400',
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <Hamburger
          className={cn('z-50 2xsdt:hidden!')}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          isTransparent={isTransparent}
        />
      </div>
    </header>
  );
}
