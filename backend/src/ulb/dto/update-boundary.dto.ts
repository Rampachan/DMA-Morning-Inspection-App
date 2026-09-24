import { IsObject } from 'class-validator';

/**
 * GeoJSON Polygon payload used to set a ULB boundary.
 * Full GeoJSON validation is handled at the service layer via PostGIS.
 */
export class UpdateBoundaryDto {
  @IsObject()
  geojson!: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}
