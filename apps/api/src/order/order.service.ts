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

    // 3. Logic for Approval
    if (status === 'APPROVED') {
      const details = order.details as any;
      console.log(`[OrderService] Processing APPROVAL. Details:`, details);

      if (!details || !details.domain) {
        // If details missing, just update status
        console.warn(
          `[OrderService] Order ${id} missing details for auto-provisioning.`,
        );
      } else {
        try {
          console.log(`[OrderService] Attempting to provision customer...`);
          // Auto-provision customer
          const provisioningResult = await this.adminService.provisionCustomer(
            adminId || 'system',
            {
              name: details.domain, // Use domain as name initially
              domain: details.domain,
              roomCount: details.customRooms || 1,
              userLimit: details.customCapacity || 30,
              cameraEnabled: details.customCam,
              adminName: 'admin',
              adminEmail: order.email,
              adminPhone: order.phone,
            },
          );
          console.log(
            `[OrderService] Provisioning successful:`,
            provisioningResult,
          );

          // Mark as completed right away or kept as approved? Let's keep approved.
        } catch (error) {
          console.error(
            `[OrderService] Failed to provision customer for order ${id}`,
            error,
          );
          // Decide: Fail the request or just log?
          // Better to fail so admin knows it didn't work.
          throw new BadRequestException(
            `Provisioning failed: ${error.message}`,
          );
        }
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
