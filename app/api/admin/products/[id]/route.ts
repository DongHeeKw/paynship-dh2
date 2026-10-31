import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi } from '@/lib/api/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        scrapeRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate quality info
    const isWeightEstimated = product.weightKg === 0.5;
    const isHsCodeDefault = !product.hsCode || product.hsCode === '9999.99';
    const isOriginMissing = !product.origin;

    // Build metadata
    const metadata = {
      extractionSource: product.enrichmentSource || 'unknown',
      stage: product.enrichedAt ? 2 : 1,
      stageDetails: [] as string[],
      tavilyEnriched: !!product.enrichedAt,
      isWeightEstimated,
      isHsCodeDefault,
      isOriginMissing,
    };

    // Add stage details
    if (product.enrichmentSource === 'tavily') {
      metadata.stageDetails.push('Tavily 웹검색');
    }
    if (product.enrichmentSource === 'manual') {
      metadata.stageDetails.push('수동 입력');
    }
    if (!product.enrichmentSource) {
      metadata.stageDetails.push('자동 추출');
    }

    return NextResponse.json({
      product: {
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        lastScrapedAt: product.lastScrapedAt.toISOString(),
        enrichedAt: product.enrichedAt?.toISOString() || null,
      },
      metadata,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

/**
 * Update product (manual edit)
 *
 * Supports updating:
 * - Core info: name, category, description, brand
 * - Pricing: priceKrw, salePriceKrw
 * - Shipping: weightKg, dimensions, hsCode, origin, material
 * - Meta: rating, reviewCount, inStock, options
 *
 * All manual edits are tracked in dataSources with confidence=1.0
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id } = await params;
    const body = await request.json();

    // Get existing product for data source tracking
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { dataSources: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Fields that can be manually edited
    const allowedFields = [
      // Core info
      'name', 'category', 'description', 'brand',
      // Pricing
      'priceKrw', 'salePriceKrw',
      // Shipping info
      'weightKg', 'hsCode', 'origin', 'material',
      // Meta
      'rating', 'reviewCount', 'inStock',
      // Options (JSON)
      'options',
    ];

    const updateData: Record<string, unknown> = {};
    const editedFields: string[] = [];

    for (const field of allowedFields) {
      if (field in body && body[field] !== undefined) {
        updateData[field] = body[field];
        editedFields.push(field);
      }
    }

    // Handle dimensions separately (convert individual fields to Json)
    const { dimensionL, dimensionW, dimensionH } = body;
    if (dimensionL !== undefined || dimensionW !== undefined || dimensionH !== undefined) {
      const l = parseFloat(dimensionL) || 0;
      const w = parseFloat(dimensionW) || 0;
      const h = parseFloat(dimensionH) || 0;

      if (l > 0 || w > 0 || h > 0) {
        updateData.dimensions = { l, w, h };
        editedFields.push('dimensions');
      } else {
        updateData.dimensions = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update dataSources to track manual edits
    const existingDataSources = (existingProduct.dataSources as Record<string, unknown>) || {};
    const updatedDataSources = { ...existingDataSources };

    for (const field of editedFields) {
      updatedDataSources[field] = {
        source: 'manual',
        confidence: 1.0,
        updatedAt: new Date().toISOString(),
        method: 'admin_edit',
      };
    }

    // Mark as manually edited
    updateData.enrichmentSource = 'manual';
    updateData.enrichedAt = new Date();
    updateData.extractionMethod = 'manual';
    updateData.overallConfidence = 1.0;
    updateData.dataSources = updatedDataSources;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      editedFields,
      product: {
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        lastScrapedAt: product.lastScrapedAt.toISOString(),
        enrichedAt: product.enrichedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
