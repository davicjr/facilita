import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(
      body.username,
      body.password,
    );

    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);

    return {
      user,
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
    };
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  async refresh(
    @Body() body: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = req.cookies?.refresh_token as string | undefined;
    const refreshToken = body.refreshToken || cookieToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { user, tokens } = await this.authService.refresh(refreshToken);

    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);

    return {
      user,
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
    };
  }

  @Post('logout')
  async logout(
    @Body() body: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = req.cookies?.refresh_token as string | undefined;
    const refreshToken = body.refreshToken || cookieToken;

    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(res);

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: Record<string, any>) {
    return user;
  }

  private setRefreshCookie(
    res: Response,
    refreshToken: string,
    expiresAt: Date,
  ) {
    const secure = this.configService.get('COOKIE_SECURE') === 'true';
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    const maxAge = Math.max(expiresAt.getTime() - Date.now(), 0);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge,
      path: '/api/auth/refresh',
      domain: domain || undefined,
    });
  }

  private clearRefreshCookie(res: Response) {
    const secure = this.configService.get('COOKIE_SECURE') === 'true';
    const domain = this.configService.get<string>('COOKIE_DOMAIN');

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/auth/refresh',
      domain: domain || undefined,
    });
  }
}
