import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface GeoValidationResult {
  valid: boolean;
  skipped: boolean;
}

interface GeomRow {
  geom_is_null: boolean;
  within: boolean | null;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly toleranceMeters: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.toleranceMeters = parseInt(
      this.configService.get<string>('GEO_TOLERANCE_METERS', '200'),
      10,
    );
  }

  /**
   * Validates whether (lng, lat) lies within the ULB boundary polygon.
   *
   * - If the ULB has no geometry stored → returns { valid: true, skipped: true }
   * - If within tolerance → { valid: true, skipped: false }
   * - If outside tolerance → { valid: false, skipped: false }
   */
  async validatePhotoLocation(
    ulbId: string,
    lat: number,
    lng: number,
  ): Promise<GeoValidationResult> {
    try {
      const rows = await this.dataSource.query<GeomRow[]>(
        `
        SELECT
          (geom IS NULL) AS geom_is_null,
          CASE
            WHEN geom IS NULL THEN NULL
            ELSE ST_DWithin(
              geom::geography,
              ST_MakePoint($1, $2)::geography,
              $3
            )
          END AS within
        FROM ulb
        WHERE ulb_id = $4
        `,
        [lng, lat, this.toleranceMeters, ulbId],
      );

      if (rows.length === 0) {
        // ULB not found — skip validation
        return { valid: true, skipped: true };
      }

      const row = rows[0];

      if (row.geom_is_null) {
        return { valid: true, skipped: true };
      }

      return { valid: row.within === true, skipped: false };
    } catch (err: any) {
      this.logger.warn(
        `Geo validation failed for ULB ${ulbId} at (${lat}, ${lng}): ${err?.message}. Skipping geo check.`,
      );
      return { valid: true, skipped: true };
    }
  }
}
