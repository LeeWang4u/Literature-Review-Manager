import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { User } from '../users/user.entity';
import { randomUUID } from 'crypto';
import { EmailService } from '../mail/mail.service';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    avatarUrl: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // async register(registerDto: RegisterDto): Promise<AuthResponse> {
  //   const user = await this.usersService.create(registerDto);
  //   return this.generateAuthResponse(user);
  // }

  // async login(loginDto: LoginDto): Promise<AuthResponse> {
  //   const user = await this.validateUser(loginDto.email, loginDto.password);

  //   if (!user) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }

  //   // Update last login
  //   await this.usersService.updateLastLogin(user.id);

  //   return this.generateAuthResponse(user);
  // }


  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const verifyToken = this.jwtService.sign(
      {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
        otp,
      },
      { expiresIn: '5m' },
    );

    await this.emailService.sendOtp(dto.email, otp, dto.fullName);

    return {
      message: 'OTP đã được gửi về email',
      verifyToken,
    };
  }

  // ✅ XÁC THỰC OTP → TẠO USER
  async verifyOtp(verifyToken: string, otp: string) {
    let payload: any;
  

    try {
      payload = this.jwtService.verify(verifyToken);
    } catch (e) {
      throw new BadRequestException('Token đã hết hạn');
    }


    if (payload.otp !== otp) {
      throw new BadRequestException('OTP không đúng');
    }
  
    await this.usersService.create({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      affiliation: payload.affiliation,
    });

    return { message: 'Xác thực email thành công' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Tạo token mới
    const verificationToken = randomUUID();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    await this.usersService.updateVerificationToken(
      user.id,
      verificationToken,
      verificationExpires,
    );

    // Gửi lại email
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.fullName,
    );

    return { message: 'Verification email sent. Please check your inbox.' };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return this.generateAuthResponse(user);
  }

  // async validateUser(email: string, password: string): Promise<User | null> {
  //   const user = await this.usersService.findByEmail(email);

  //   if (!user) {
  //     // Email không tồn tại - trả về null (sẽ hiển thị "Invalid credentials")
  //     return null;
  //   }

  //   const isPasswordValid = await bcrypt.compare(password, user.password);

  //   if (!isPasswordValid) {
  //     // Password sai - throw specific error
  //     throw new UnauthorizedException('Wrong password');
  //   }

  //   if (!user.isActive) {
  //     throw new UnauthorizedException('User account is inactive');
  //   }

  //   return user;
  // }

  async validateUser(email: string, password: string): Promise<User | null> {
  const user = await this.usersService.findByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Wrong password');
  }

  // Kiểm tra email đã xác nhận chưa

  // Kiểm tra tài khoản có kích hoạt không
  if (!user.isActive) {
    throw new UnauthorizedException('User account is inactive');
  }

  return user;
}

  private generateAuthResponse(user: User): AuthResponse {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // Change password (for logged-in users)
  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Don't allow same password
    const isSamePassword = await bcrypt.compare(changePasswordDto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Update to new password
    await this.usersService.changePassword(userId, changePasswordDto.newPassword);

    return { message: 'Password changed successfully' };
  }

  // ✅ QUÊN MẬT KHẨU - GỬI OTP
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ resetToken: string; message: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    if (!user.isActive) {
      throw new BadRequestException('Tài khoản chưa được kích hoạt');
    }

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log('🔑 Generated OTP for password reset:', otp);

    // Tạo reset token chứa email và OTP
    const resetToken = this.jwtService.sign(
      {
        email: dto.email,
        otp,
        type: 'reset-password',
      },
      { expiresIn: '10m' }, // Token hết hạn sau 10 phút
    );

    // Gửi OTP qua email
    await this.emailService.sendPasswordResetOtp(dto.email, otp, user.fullName);

    return {
      resetToken,
      message: 'OTP đã được gửi về email của bạn',
    };
  }

  // ✅ RESET MẬT KHẨU VỚI OTP
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    let payload: any;

    try {
      payload = this.jwtService.verify(dto.resetToken);
    } catch (e) {
      throw new BadRequestException('Token đã hết hạn hoặc không hợp lệ');
    }

    // Kiểm tra loại token
    if (payload.type !== 'reset-password') {
      throw new BadRequestException('Token không hợp lệ');
    }

    // Kiểm tra OTP
    if (payload.otp !== dto.otp) {
      throw new BadRequestException('OTP không đúng');
    }

    // Tìm user
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Cập nhật mật khẩu
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Gửi email thông báo
    await this.emailService.sendPasswordChangedNotification(user.email, user.fullName);

    return { message: 'Mật khẩu đã được cập nhật thành công' };
  }
}
