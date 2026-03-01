import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {
    console.log('OrderController initialized');
  }

  // Public endpoint for creating orders
  @Post()
  create(@Body() createOrderDto: any) {
    return this.orderService.create(createOrderDto);
  }

  // Admin only: Get all orders
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('owner', 'superadmin', 'admin')
  @Get()
  findAll(@Query('status') status: string) {
    return this.orderService.findAll(status);
  }

  // Admin only: Update order status
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('owner', 'superadmin', 'admin')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Req() req: any,
  ) {
    return this.orderService.updateStatus(id, status, req.user.userId);
  }
}
