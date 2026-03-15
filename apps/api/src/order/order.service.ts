import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private adminService: AdminService,
  ) { }

  // Implement Order Logic
  async create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({
      data,
    });
  }

  async findAll(status?: any) {
    const where = status ? { status } : {};
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: any, adminId?: string) {
    console.log(
      `[OrderService] updateStatus called for ID: ${id}, Status: ${status}, AdminID: ${adminId}`,
    );

    // 1. Check existing order
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      console.error(`[OrderService] Order ${id} not found`);
      throw new BadRequestException('Order not found');
    }

    console.log(`[OrderService] Found order:`, JSON.stringify(order, null, 2));

    // 2. If already processed, prevent re-processing
    if (
      order.status === 'APPROVED' ||
      order.status === 'REJECTED' ||
      order.status === 'COMPLETED'
    ) {
      console.warn(`[OrderService] Order ${id} is already ${order.status}`);
      throw new BadRequestException(`Order is already ${order.status}`);
    }

    // 3. Logic for Approval — Auto-provision based on checkout form data
    if (status === 'APPROVED') {
      const details = order.details as any;
      console.log(`[OrderService] Processing APPROVAL. Order fields:`, {
        hostingType: order.hostingType,
        roomName: order.roomName,
        customDomain: order.customDomain,
        packageName: order.packageName,
        amount: order.amount,
        details,
      });

      try {
        // Determine tenant name and slug from order fields
        const isSoprano = order.hostingType !== 'own_domain';
        const tenantName = isSoprano
          ? (order.roomName || order.packageName || `tenant-${Date.now()}`)
          : (order.customDomain || order.packageName || `tenant-${Date.now()}`);

        // Determine billing period
        const billingPeriod = details?.billing === 'yearly' ? 'YEARLY' : 'MONTHLY';

        // Build slug from name
        const slug = tenantName.toLowerCase()
          .replace(/[^a-z0-9ğüşıöç]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || `tenant-${Date.now()}`;

        console.log(`[OrderService] Attempting to provision customer: ${tenantName} (${slug})`);

        const provisioningResult = await this.adminService.provisionCustomer(
          adminId || 'system',
          {
            name: tenantName,
            displayName: tenantName,
            domain: !isSoprano ? order.customDomain : null,
            hostingType: isSoprano ? 'sopranochat' : 'own_domain',
            slug: slug,
            roomCount: details?.rooms ? parseInt(details.rooms) : 4,
            userLimit: details?.capacity ? parseInt(details.capacity) : 50,
            cameraEnabled: order.packageName?.toLowerCase().includes('kamera') || details?.camera === 'Var',
            plan: order.packageName || undefined,
            billingPeriod: billingPeriod as any,
            adminName: `${order.firstName || ''} ${order.lastName || ''}`.trim() || 'admin',
            adminEmail: order.email || undefined,
            adminPhone: order.phone || undefined,
            price: order.amount ? Number(order.amount) : undefined,
            currency: 'TRY',
            customerEmail: order.email || undefined,
            customerPhone: order.phone || undefined,
            roomName: order.roomName || undefined,
            logo: order.logo || undefined,
          },
        );

        console.log(
          `[OrderService] ✅ Provisioning successful! Tenant: ${provisioningResult.tenant?.slug}, Rooms: ${provisioningResult.defaultRooms?.length}`,
        );
      } catch (error) {
        console.error(
          `[OrderService] ❌ Failed to provision customer for order ${id}`,
          error,
        );
        throw new BadRequestException(
          `Provisioning failed: ${error.message}`,
        );
      }
    } else {
      console.log(
        `[OrderService] Status is not APPROVED, skipping provisioning.`,
      );
    }

    const result = await this.prisma.order.update({
      where: { id },
      data: { status },
    });
    console.log(`[OrderService] Order status updated in DB.`);
    return result;
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }
}
