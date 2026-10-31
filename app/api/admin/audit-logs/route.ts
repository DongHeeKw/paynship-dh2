import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, requireAdminForApi } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const action = searchParams.get('action');
    const target = searchParams.get('target');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }

    if (target) {
      where.target = target;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [total, logs] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          target: true,
          targetId: true,
          adminUserId: true,
          adminUserEmail: true,
          changes: true,
          requestMeta: true,
          createdAt: true,
          adminUser: {
            select: {
              email: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        target: log.target,
        targetId: log.targetId,
        adminUserId: log.adminUserId,
        adminUserEmail: log.adminUserEmail || log.adminUser?.email || null,
        changes: log.changes,
        requestMeta: log.requestMeta,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, 'Admin Audit Logs GET', 'Failed to fetch admin audit logs');
  }
}
