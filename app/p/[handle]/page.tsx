/**
 * PayNShip v2.1 — Product Detail Page (PDP)
 *
 * URL: /p/[handle]
 * 역할: Shopify Product를 조회해서 상품 상세 + 장바구니 담기 버튼.
 * SSR (Server Component) → 초기 데이터 주입 후 Client Component에서 인터랙션.
 */

import { notFound } from 'next/navigation';
import { getProductByHandle } from '@/lib/shopify/queries-v2/product';
import { ProductDetailClient } from '@/features/product-v21/ui/ProductDetailClient';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle: rawHandle } = await params;
  const handle = decodeURIComponent(rawHandle);
  const product = await getProductByHandle(handle).catch(() => null);
  if (!product) {
    return { title: 'Not Found — PayNShip' };
  }
  return {
    title: `${product.title} — PayNShip`,
    description: product.descriptionHtml.replace(/<[^>]+>/g, '').slice(0, 160),
    openGraph: {
      title: product.title,
      description: product.vendor,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { handle: rawHandle } = await params;
  const handle = decodeURIComponent(rawHandle);

  const product = await getProductByHandle(handle).catch(err => {
    console.error('[PDP] fetch failed:', err);
    return null;
  });

  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
