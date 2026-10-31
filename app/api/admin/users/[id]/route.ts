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

    // Fetch user with preferences
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
        preferences: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get session stats
    const sessionCount = await prisma.chatSession.count({
      where: { userId: id },
    });

    // Get last activity
    const lastSession = await prisma.chatSession.findFirst({
      where: { userId: id },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    // Get order stats
    const orderStats = await prisma.quote.aggregate({
      where: {
        userId: id,
        orders: { some: {} },
      },
      _count: { id: true },
      _sum: { totalUsd: true },
    });

    // Get recent sessions with message counts from normalized Message table
    const recentSessions = await prisma.chatSession.findMany({
      where: { userId: id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    // Get orders
    const orders = await prisma.order.findMany({
      where: {
        quote: { userId: id },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        quote: {
          select: {
            totalUsd: true,
          },
        },
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt.toISOString(),
        lastActiveAt: lastSession?.updatedAt?.toISOString() || null,
        preferences: user.preferences,
        stats: {
          sessionCount,
          orderCount: orderStats._count.id,
          totalSpent: orderStats._sum.totalUsd || 0,
        },
      },
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        title: s.title,
        startTime: s.createdAt.toISOString(),
        lastActive: s.updatedAt.toISOString(),
        messageCount: s._count.messages,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        totalUsd: o.quote?.totalUsd ?? null,
      })),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
