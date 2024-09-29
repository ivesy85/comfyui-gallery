'use client';

import {
  DocumentIcon,
  HomeIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const links = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Generated Media',
    href: '/dashboard/generations',
    icon: PhotoIcon,
  },
  { name: 'Models', href: '/dashboard/models', icon: DocumentIcon },
  { name: 'Loras', href: '/dashboard/loras', icon: DocumentIcon },
  { name: 'Embeddings', href: '/dashboard/embeddings', icon: DocumentIcon },
];

export default function NavLinks() {
  const pathname = usePathname();
  console.log(pathname);

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-white/10 p-3 text-sm font-medium hover:bg-white/20 hover:text-hotpink-600 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-white/20 text-pink-600': pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
