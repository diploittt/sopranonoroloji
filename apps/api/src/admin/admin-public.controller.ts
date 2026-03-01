import { Controller, Post, Get, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

/**
 * Şifre sıfırlama endpoint'leri — public (auth gerektirmez)
 */
@Controller('admin')
export class AdminPublicController {
    constructor(private adminService: AdminService) { }

    @Post('forgot-password')
    async forgotPassword(@Body() body: { email: string }) {
        return this.adminService.forgotPassword(body.email);
    }

    @Post('reset-password')
    async resetPassword(
        @Body() body: { email: string; code: string; newPassword: string },
    ) {
        return this.adminService.resetPassword(body.email, body.code, body.newPassword);
    }

    // İletişim formu — public (auth gerektirmez)
    @Post('contact')
    async submitContactForm(
        @Body() body: { name: string; email: string; subject: string; message: string },
    ) {
        return this.adminService.submitContactForm(body);
    }

    // Sipariş oluşturma — public (auth gerektirmez)
    @Post('orders')
    async createOrder(
        @Body() body: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            packageName: string;
            paymentCode: string;
            hostingType?: string;
            customDomain?: string;
            roomName?: string;
            logo?: string;
            details?: any;
            amount?: number;
        },
    ) {
        return this.adminService.createOrder(body);
    }

    // Branding bilgisi — public (auth gerektirmez)
    @Get('branding')
    async getPublicBranding() {
        return this.adminService.getPublicBranding();
    }
}
