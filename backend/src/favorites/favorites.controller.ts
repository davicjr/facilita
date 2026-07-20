import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntityType } from '@prisma/client';

@ApiTags('Favoritos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Adicionar item aos favoritos' })
  @ApiResponse({
    status: 201,
    description: 'Item favoritado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Item não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Item já está nos favoritos',
  })
  async create(@Request() req: any, @Body() createFavoriteDto: CreateFavoriteDto) {
    return this.favoritesService.create(req.user, createFavoriteDto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar meus favoritos' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: EntityType,
    description: 'Filtrar por tipo de entidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de favoritos retornada com sucesso',
  })
  async findMyFavorites(
    @Request() req: any,
    @Query('type') type?: EntityType,
  ) {
    if (type) {
      return this.favoritesService.findByUserAndType(req.user, type);
    }
    return this.favoritesService.findAllByUser(req.user);
  }

  @Get('me/count')
  @ApiOperation({ summary: 'Contar meus favoritos' })
  @ApiResponse({
    status: 200,
    description: 'Total de favoritos',
  })
  async countMyFavorites(@Request() req: any) {
    const count = await this.favoritesService.countByUser(req.user);
    return { count };
  }

  @Get('check/:entityType/:entityId')
  @ApiOperation({ summary: 'Verificar se um item está favoritado' })
  @ApiResponse({
    status: 200,
    description: 'Status de favorito retornado',
  })
  async checkFavorited(
    @Request() req: any,
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    const isFavorited = await this.favoritesService.isFavorited(
      req.user,
      entityType,
      entityId,
    );
    return { isFavorited };
  }

  @Get('entity/:entityType/:entityId/count')
  @ApiOperation({ summary: 'Contar quantas vezes um item foi favoritado' })
  @ApiResponse({
    status: 200,
    description: 'Total de vezes que o item foi favoritado',
  })
  async countByEntity(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    const count = await this.favoritesService.countByEntity(
      entityType,
      entityId,
    );
    return { count };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover favorito por ID' })
  @ApiResponse({
    status: 200,
    description: 'Favorito removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Favorito não encontrado',
  })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.favoritesService.remove(id, req.user.id);
  }

  @Delete('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Remover favorito por entidade' })
  @ApiResponse({
    status: 200,
    description: 'Favorito removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Favorito não encontrado',
  })
  async removeByEntity(
    @Request() req: any,
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.favoritesService.removeByEntity(
      req.user.id,
      entityType,
      entityId,
    );
  }
}
