import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.logsService.findAll(limit ? Number(limit) : 100);
  }

  @Get('search')
  search(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('level') level?: string,
    @Query('category') category?: string,
    @Query('eventType') eventType?: string,
    @Query('groupId') groupId?: string,
    @Query('treatmentId') treatmentId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.logsService.search({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      level,
      category,
      eventType,
      groupId: groupId ? Number(groupId) : undefined,
      treatmentId,
      search,
      dateFrom,
      dateTo,
    });
  }

  @Get('technical')
  searchTechnical(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.logsService.searchTechnical({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      dateFrom,
      dateTo,
    });
  }

  @Get('admin')
  searchAdmin(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.logsService.searchAdmin({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      dateFrom,
      dateTo,
    });
  }

  @Post()
  create(
    @Body()
    dto: {
      level: 'info' | 'warn' | 'error';
      source: string;
      message: string;
      category?: string;
      eventType?: string;
      actorRole?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.logsService.create(dto);
  }
}
