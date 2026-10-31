import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { requireAdminForApi } from '@/lib/api/auth-middleware';

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

// Calculate quality level based on estimated values
function getQualityLevel(product: {
  weightKg: number;
  dimensions?: unknown;
  hsCode: string | null;
  origin: string | null;
}): 'high' | 'medium' | 'low' {
  const isWeightEstimated = !product.weightKg || product.weightKg === 0.5;
  const isDimensionsMissing = !product.dimensions;
  const isHsCodeDefault = !product.hsCode || product.hsCode === '9999.99';
  const isOriginMissing = !product.origin;

  const estimatedCount = [isWeightEstimated, isDimensionsMissing, isHsCodeDefault, isOriginMissing].filter(
    Boolean
  ).length;

  if (estimatedCount === 0) return 'high';
  if (estimatedCount <= 2) return 'medium';
  return 'low';
}

// Calculate Shopify sync status
function getSyncStatus(product: {
  canonicalProductId: string | null;
  shopifyProductId: string | null;
}): 'synced' | 'unsynced' {
  if (product.canonicalProductId && product.shopifyProductId) {
    return 'synced';
  }
  return 'unsynced';
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const category = searchParams.get('category');
    const domain = searchParams.get('domain');
    const quality = searchParams.get('quality');
    const weightStatus = searchParams.get('weightStatus');
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');
    const syncStatus = searchParams.get('syncStatus'); // 'synced' | 'unsynced' | null

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (category) {
      const categories = category.split(',').filter(Boolean);
      if (categories.length > 0) {
        where.category = { in: categories };
      }
    }

    if (domain) {
      const domains = domain.split(',').filter(Boolean);
      if (domains.length > 0) {
        where.OR = domains.map((d) => ({
          sourceUrl: { contains: d },
        }));
      }
    }

    if (priceMin || priceMax) {
      where.priceKrw = {};
      if (priceMin) where.priceKrw.gte = parseFloat(priceMin);
      if (priceMax) where.priceKrw.lte = parseFloat(priceMax);
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Weight status filter
    if (weightStatus === 'confirmed') {
      where.weightKg = { not: 0.5 };
    } else if (weightStatus === 'estimated') {
      where.weightKg = 0.5;
    }

    // Shopify sync status filter
    if (syncStatus === 'synced') {
      where.canonicalProductId = { not: null };
    } else if (syncStatus === 'unsynced') {
      where.canonicalProductId = null;
    }

    // Parallel: Get total count and products simultaneously
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          priceKrw: true,
          category: true,
          weightKg: true,
          dimensions: true,
          hsCode: true,
          origin: true,
          sourceUrl: true,
          createdAt: true,
          enrichmentSource: true,
          // Shopify sync fields
          canonicalProductId: true,
          shopifyProductId: true,
          shopifySyncedAt: true,
        },
      }),
    ]);
    const totalPages = Math.ceil(total / limit);

    // Add computed fields and apply quality filter
    let processedProducts = products.map((product) => ({
      ...product,
      domain: extractDomain(product.sourceUrl),
      quality: getQualityLevel(product),
      weightSource: product.weightKg === 0.5 ? 'estimated' : 'extracted',
      createdAt: product.createdAt.toISOString(),
      // Shopify sync status (computed)
      syncStatus: getSyncStatus(product),
      shopifySyncedAt: product.shopifySyncedAt?.toISOString() || null,
    }));

    // Apply quality filter (post-query since it's computed)
    if (quality) {
      processedProducts = processedProducts.filter((p) => p.quality === quality);
    }

    // Calculate stats - all in parallel
    const [todayCount, avgResult, syncedCount, unsyncedCount, estimatedWeightCount] = await Promise.all([
      prisma.product.count({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.product.aggregate({
        where: { isActive: true },
        _avg: { priceKrw: true },
      }),
      // Synced products (have canonicalProductId)
      prisma.product.count({
        where: {
          isActive: true,
          canonicalProductId: { not: null },
        },
      }),
      // Unsynced products (no canonicalProductId)
      prisma.product.count({
        where: {
          isActive: true,
          canonicalProductId: null,
        },
      }),
      // Estimated weight products
      prisma.product.count({
        where: {
          isActive: true,
          weightKg: 0.5,
        },
      }),
    ]);

    const estimatedRatio = total > 0 ? (estimatedWeightCount / total) * 100 : 0;

    // Calculate average confidence (based on quality distribution)
    const highQualityCount = processedProducts.filter((p) => p.quality === 'high').length;
    const mediumQualityCount = processedProducts.filter((p) => p.quality === 'medium').length;
    const sampleSize = processedProducts.length || 1;
    const avgConfidence =
      ((highQualityCount * 1 + mediumQualityCount * 0.7) / sampleSize) * 100;

    return NextResponse.json({
      products: processedProducts,
      pagination: {
        page,
        limit,
        total: quality ? processedProducts.length : total,
        totalPages: quality ? Math.ceil(processedProducts.length / limit) : totalPages,
      },
      stats: {
        total,
        todayCount,
        avgConfidence: Math.round(avgConfidence),
        estimatedRatio: Math.round(estimatedRatio * 10) / 10,
        // Shopify sync stats
        syncedCount,
        unsyncedCount,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
