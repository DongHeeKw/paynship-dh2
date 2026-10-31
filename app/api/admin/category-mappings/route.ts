/**
 * Category Mappings Admin API
 *
 * GET: Fetch all category mappings
 * PATCH: Bulk update category mappings
 *
 * @module app/api/admin/category-mappings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/helpers';
import { invalidateCategoryMappingsCache } from '@/lib/business';
import logger from '@/lib/utils/logger';

// GET /api/admin/category-mappings - Fetch all mappings
export async function GET() {
  try {
    const { error, isAdmin } = await requireAdmin();

    if (error || !isAdmin) {
      return NextResponse.json(
        { error: error || 'Admin access required' },
        { status: 403 }
      );
    }

    const mappings = await prisma.categoryMapping.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    logger.error('[Category Mappings GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch category mappings' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/category-mappings - Bulk update mappings
export async function PATCH(req: NextRequest) {
  try {
    const { error, isAdmin, adminRole } = await requireAdmin('super_admin');

    if (error || !isAdmin) {
      return NextResponse.json(
        {
          error: error || 'Admin access required',
          code: 'ADMIN_ROLE_REQUIRED',
          minimumRole: 'super_admin',
          currentRole: adminRole ?? null,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { mappings } = body;

    if (!Array.isArray(mappings)) {
      return NextResponse.json(
        { error: 'Invalid request: mappings array required' },
        { status: 400 }
      );
    }

    // Validate each mapping
    for (const mapping of mappings) {
      if (!mapping.id || !mapping.category) {
        return NextResponse.json(
          { error: 'Each mapping must have id and category' },
          { status: 400 }
        );
      }

      // Validate numeric fields
      if (mapping.estimatedWeightKg !== undefined) {
        if (typeof mapping.estimatedWeightKg !== 'number' || mapping.estimatedWeightKg < 0.01 || mapping.estimatedWeightKg > 100) {
          return NextResponse.json(
            { error: `Invalid weight for ${mapping.category} (must be 0.01-100 kg)` },
            { status: 400 }
          );
        }
      }

      if (mapping.dimensionL !== undefined || mapping.dimensionW !== undefined || mapping.dimensionH !== undefined) {
        const l = mapping.dimensionL ?? 0;
        const w = mapping.dimensionW ?? 0;
        const h = mapping.dimensionH ?? 0;
        if (l < 1 || l > 200 || w < 1 || w > 200 || h < 1 || h > 200) {
          return NextResponse.json(
            { error: `Invalid dimensions for ${mapping.category} (must be 1-200 cm)` },
            { status: 400 }
          );
        }
      }

      if (mapping.hsCodePrefix !== undefined) {
        if (typeof mapping.hsCodePrefix !== 'string' || !/^\d{2}$/.test(mapping.hsCodePrefix)) {
          return NextResponse.json(
            { error: `Invalid HS code prefix for ${mapping.category} (must be 2 digits)` },
            { status: 400 }
          );
        }
      }
    }

    // Bulk update using transaction
    const updates = await prisma.$transaction(
      mappings.map((mapping: {
        id: string;
        estimatedWeightKg?: number;
        dimensionL?: number;
        dimensionW?: number;
        dimensionH?: number;
        hsCodePrefix?: string;
        isActive?: boolean;
      }) =>
        prisma.categoryMapping.update({
          where: { id: mapping.id },
          data: {
            ...(mapping.estimatedWeightKg !== undefined && { estimatedWeightKg: mapping.estimatedWeightKg }),
            ...(mapping.dimensionL !== undefined && { dimensionL: mapping.dimensionL }),
            ...(mapping.dimensionW !== undefined && { dimensionW: mapping.dimensionW }),
            ...(mapping.dimensionH !== undefined && { dimensionH: mapping.dimensionH }),
            ...(mapping.hsCodePrefix !== undefined && { hsCodePrefix: mapping.hsCodePrefix }),
            ...(mapping.isActive !== undefined && { isActive: mapping.isActive }),
          },
        })
      )
    );

    // Invalidate cache
    invalidateCategoryMappingsCache();

    logger.info('CategoryMappings', `Updated ${updates.length} category mappings`);

    return NextResponse.json({
      success: true,
      updated: updates.length,
      mappings: updates,
    });
  } catch (error) {
    logger.error('[Category Mappings PATCH Error]', error);
    return NextResponse.json(
      { error: 'Failed to update category mappings' },
      { status: 500 }
    );
  }
}
