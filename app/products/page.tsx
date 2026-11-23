import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import ProductCatalog from '@/features/storefront/products/ProductCatalog';

export const metadata: Metadata = {
  title: 'Discover Korea | PayNShip',
  description: 'Browse beauty, stationery, home, accessories and K-pop finds from Korean seller listings. Choose a product to prepare a purchase request.',
};

export default function ProductsPage() {
  return <SiteShell variant="home"><ProductCatalog /></SiteShell>;
}
