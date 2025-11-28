import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    }

//     async sendOtp(email: string, otp: string) {
//     // Dùng nodemailer / smtp của bạn
//     await transporter.sendMail({
//       to: email,
//       subject: 'Mã OTP xác thực tài khoản',
//       html: `<h3>Mã OTP của bạn là: ${otp}</h3><p>Có hiệu lực trong 5 phút</p>`,
//     });
//   }

  async sendOtp(email: string, otp: string, fullName: string): Promise<void> {
        const otpUrl = `${process.env.FRONTEND_URL}verify-email?token=${otp}`;

        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Verify Your Email - Literature Review Manager',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Literature Review Manager!</h2>
          <p>Hi ${fullName},</p>
          <p>Thank you for signing up. Please verify your email address using OTP. OTP is valid for 5 minutes:</p>
          <div style="text-align: center; margin: 30px 0;">
            <p>Your OTP: <b>${otp}</b></p>
          </div>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Verification email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send verification email to ${email}:`, error);
            throw error;
        }
    }

    async sendVerificationEmail(email: string, token: string, fullName: string): Promise<void> {
        const verificationUrl = `${process.env.FRONTEND_URL}verify-email?token=${token}`;

        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Verify Your Email - Literature Review Manager',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Literature Review Manager!</h2>
          <p>Hi ${fullName},</p>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">Literature Review Manager</p>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Verification email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send verification email to ${email}:`, error);
            throw error;
        }
    }

    async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Welcome to Literature Review Manager!',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verified Successfully! 🎉</h2>
          <p>Hi ${fullName},</p>
          <p>Your email has been verified successfully. You can now access all features of Literature Review Manager.</p>
          <p>Get started by:</p>
          <ul>
            <li>Adding your first research paper</li>
            <li>Creating your library</li>
            <li>Managing citations and references</li>
          </ul>
          <p>Happy researching!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">Literature Review Manager</p>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Welcome email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send welcome email to ${email}:`, error);
        }
    }

    // ✅ GỬI OTP RESET MẬT KHẨU
    async sendPasswordResetOtp(email: string, otp: string, fullName: string): Promise<void> {
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Reset Your Password - Literature Review Manager',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${fullName},</p>
          <p>You requested to reset your password. Use the OTP code below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; display: inline-block;">
              <h1 style="margin: 0; color: #333; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
            </div>
          </div>
          <p><strong>This OTP will expire in 10 minutes.</strong></p>
          <p>If you didn't request a password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">Literature Review Manager</p>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Password reset OTP sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset OTP to ${email}:`, error);
            throw error;
        }
    }

    // ✅ THÔNG BÁO MẬT KHẨU ĐÃ THAY ĐỔI
    async sendPasswordChangedNotification(email: string, fullName: string): Promise<void> {
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Password Changed Successfully - Literature Review Manager',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Changed Successfully</h2>
          <p>Hi ${fullName},</p>
          <p>Your password has been changed successfully.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">Literature Review Manager</p>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Password changed notification sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send password changed notification to ${email}:`, error);
        }
    }
}

// import * as nodemailer from 'nodemailer';

// export class MailService {
//   private transporter;

//   constructor() {
//     this.transporter = nodemailer.createTransport({
//       host: 'smtp.gmail.com',
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.MAIL_USER,
//         pass: process.env.MAIL_PASS,
//       },
//     });
//   }

//   async sendVerifyEmail(email: string, token: string) {
//     const verifyLink = `http://localhost:3000/verify?token=${token}`;

//     await this.transporter.sendMail({
//       from: '"System Login" <no-reply@gmail.com>',
//       to: email,
//       subject: 'Xác nhận tài khoản',
//       html: `
//         <h2>Xác nhận đăng ký</h2>
//         <p>Bấm vào link sau để kích hoạt tài khoản:</p>
//         <a href="${verifyLink}">${verifyLink}</a>
//       `,
//     });
//   }
// }
