import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { requireAdminForApi } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status'); // 'active' | 'dormant'
    const hasOrders = searchParams.get('hasOrders');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where });
    const totalPages = Math.ceil(total / limit);

    // Fetch users with aggregated data
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
        preferences: {
          select: {
            defaultCountry: true,
            language: true,
          },
        },
        _count: {
          select: {
            chatSessions: true,
            quotes: true,
          },
        },
      },
    });

    // Get last activity and order stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Get last session activity
        const lastSession = await prisma.chatSession.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        });

        // Get order count and total spent (via Quote which has totalUsd)
        const orderStats = await prisma.quote.aggregate({
          where: {
            userId: user.id,
            orders: { some: {} }, // Only count quotes that have orders
          },
          _count: { id: true },
          _sum: { totalUsd: true },
        });

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt.toISOString(),
          lastActiveAt: lastSession?.updatedAt?.toISOString() || null,
          sessionCount: user._count.chatSessions,
          orderCount: orderStats._count.id,
          totalSpent: orderStats._sum.totalUsd || 0,
          preferences: user.preferences,
        };
      })
    );

    // Apply status filter (post-query since it depends on lastActiveAt)
    let filteredUsers = usersWithStats;
    if (status === 'active') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filteredUsers = usersWithStats.filter(
        (u) => u.lastActiveAt && new Date(u.lastActiveAt) > sevenDaysAgo
      );
    } else if (status === 'dormant') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filteredUsers = usersWithStats.filter(
        (u) => !u.lastActiveAt || new Date(u.lastActiveAt) < thirtyDaysAgo
      );
    }

    // Apply hasOrders filter
    if (hasOrders === 'true') {
      filteredUsers = filteredUsers.filter((u) => u.orderCount > 0);
    } else if (hasOrders === 'false') {
      filteredUsers = filteredUsers.filter((u) => u.orderCount === 0);
    }

    return NextResponse.json({
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
