import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

@Controller('submissions')
@UseGuards(RolesGuard)
export class SubmissionController {
  private readonly logger = new Logger(SubmissionController.name);

  constructor(private readonly submissionService: SubmissionService) {}

  /**
   * POST /api/v1/submissions
   * Commissioner only. Multipart form:
   *   - field "photos" → up to 10 image files
   *   - field "data"   → JSON string of CreateSubmissionDto
   */
  @Post()
  @Roles(Role.COMMISSIONER)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      limits: { fileSize: 20 * 1024 * 1024 },
      storage: undefined, // use memory storage (multer default)
    }),
  )
  async create(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('data') rawData: any,
  ) {
    try {
      this.logger.log(
        `Received submission request from user ${user?.sub}, ULB ${user?.ulb_id}, files count: ${files?.length ?? 0}`,
      );

      if (!rawData) {
        throw new BadRequestException('Missing "data" field in multipart body.');
      }

      let parsed: unknown;
      if (typeof rawData === 'string') {
        try {
          parsed = JSON.parse(rawData);
        } catch {
          throw new BadRequestException('"data" field is not valid JSON string.');
        }
      } else {
        parsed = rawData;
      }

      const dto = plainToInstance(CreateSubmissionDto, parsed);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const errorMessages = errors.map((e) => Object.values(e.constraints ?? {})).flat();
        this.logger.warn(`Validation failed: ${errorMessages.join(', ')}`);
        throw new BadRequestException(errorMessages);
      }

      return await this.submissionService.create(user, dto, files);
    } catch (err: any) {
      this.logger.error(`Error in submission create: ${err?.message}`, err?.stack);
      if (err instanceof HttpException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Submission failed: ${err?.message || 'Unknown server error'}`,
      );
    }
  }

  /**
   * GET /api/v1/submissions?date=YYYY-MM-DD
  /**
   * GET /api/v1/submissions?date=YYYY-MM-DD
   * Admin / director / commissioner.
   */
  @Get()
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.COMMISSIONER)
  async findAll(@Query('date') date?: string) {
    try {
      const targetDate = date ?? new Date().toISOString().split('T')[0];
      return await this.submissionService.findAllByDate(targetDate);
    } catch (err: any) {
      this.logger.error(`Error in findAll submissions: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException(`Failed to load submissions: ${err?.message}`);
    }
  }

  /**
   * GET /api/v1/submissions/my?date=YYYY-MM-DD
   * Commissioner sees only own submissions.
   */
  @Get('my')
  @Roles(Role.COMMISSIONER)
  findMy(
    @CurrentUser() user: JwtPayload,
    @Query('date') date?: string,
  ) {
    return this.submissionService.findMySubmissions(user.sub, date);
  }

  /**
   * GET /api/v1/submissions/analytics?date=YYYY-MM-DD
   * Admin / director / commissioner. Returns hierarchical compliance analytics.
   */
  @Get('analytics')
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.COMMISSIONER)
  async getAnalytics(@Query('date') date?: string) {
    try {
      const targetDate = date ?? new Date().toISOString().split('T')[0];
      return await this.submissionService.getAnalytics(targetDate);
    } catch (err: any) {
      this.logger.error(`Error in getAnalytics: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException(`Failed to load analytics: ${err?.message}`);
    }
  }

  /**
   * GET /api/v1/submissions/:id
   * Admin / director / commissioner. Returns signed photo URLs.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.COMMISSIONER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionService.findOne(id);
  }
}
