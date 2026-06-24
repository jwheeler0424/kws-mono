import { Separator } from '@kws/design/ui/separator';
import { Link, useLocation } from '@tanstack/react-router';
import React from 'react';

import { cn, formatCompanyName, titlePretty } from '@/lib/utils';

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
  const companyName = formatCompanyName('Polaris Pacific NW Residential');

  const handleClick = React.useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <header
      className={cn(
        'relative flex h-16 w-full items-center justify-between bg-white font-sans shadow-md transition-all duration-200 ease-linear before:absolute before:top-0 before:left-0 before:z-40 before:h-0 before:w-full before:bg-transparent sm:h-24 md:py-5 2xsdt:h-20',
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
        <h1 className={cn('z-50')}>
          <Link
            to='/'
            title={titlePretty(companyName.join(' '))}
            className={cn(
              'flex w-fit items-center font-title! text-[1.675rem] leading-[0.73]! text-polaris-primary! uppercase no-underline! transition-colors duration-200 ease-linear hover:text-polaris-primary-400! sm:text-[2rem]! 2xsdt:text-polaris-primary! 2xsdt:hover:text-polaris-primary-400!',
              isTransparent &&
                'text-white! drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] hover:text-polaris-primary! 2xsdt:text-white!',
              menuOpen && 'text-white! hover:text-white!',
              isTransparent &&
                menuOpen &&
                'text-white! drop-shadow-none hover:text-white! 2xsdt:text-white! 2xsdt:hover:text-polaris-primary!',
            )}>
            Polaris
            <br />
            Pacific
          </Link>
        </h1>

        <nav
          className={cn(
            'absolute top-16 right-0 z-50 flex w-full origin-top scale-y-0 flex-col bg-polaris-primary px-5 pt-0 pb-3 shadow-md transition-transform duration-300 sm:top-24 sm:max-w-72',
            menuOpen ? 'scale-y-100' : 'scale-y-0',
            '2xsdt:relative 2xsdt:top-auto 2xsdt:right-auto 2xsdt:flex 2xsdt:h-full 2xsdt:w-auto 2xsdt:max-w-none 2xsdt:grow 2xsdt:scale-y-100 2xsdt:flex-row 2xsdt:items-center 2xsdt:bg-transparent 2xsdt:p-0 2xsdt:shadow-none 2xsdt:transition-none',
          )}
          id='menu'>
          <ul
            className={cn(
              'flex flex-col pt-2 transition-opacity duration-200',
              menuOpen ? 'opacity-100' : 'opacity-0',
              '2xsdt:flex 2xsdt:grow 2xsdt:flex-row 2xsdt:items-center 2xsdt:justify-center 2xsdt:gap-8 2xsdt:p-0 2xsdt:opacity-100',
            )}>
            {mainNav.navLinks.map((link, i) => {
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
                      'block py-6 text-left font-title! text-[13vw]! font-medium text-white uppercase no-underline! transition-all duration-200 ease-linear group-hover:text-polaris-primary sm:py-5 sm:text-[6vw]! md:py-4 md:text-[4vw]! lg:text-[3.5vw]! 2xsdt:block 2xsdt:p-0 2xsdt:text-center 2xsdt:font-sans! 2xsdt:text-sm! 2xsdt:text-gray-600 2xsdt:normal-case 2xsdt:group-hover:text-polaris-primary',
                      isTransparent &&
                        'font-medium 2xsdt:block 2xsdt:p-0 2xsdt:text-center 2xsdt:text-sm 2xsdt:text-white 2xsdt:drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)] 2xsdt:group-hover:text-polaris-primary',
                      pathname === link.slug && 'text-polaris-primary 2xsdt:text-polaris-primary',
                      pathname === link.slug && menuOpen && 'text-white 2xsdt:text-polaris-primary',
                      pathname === link.slug && isTransparent && '2xsdt:text-white',
                    )}>
                    {link.label}
                  </Link>
                  {pathname === link.slug && pathname !== '/' && (
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
