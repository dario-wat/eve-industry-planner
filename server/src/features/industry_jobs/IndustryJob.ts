import { DataTypes, Model, Sequelize } from 'sequelize';

/**
 * Model used for storing old EVE industry job into the DB.
 * ESI will fetch jobs only back 90 days, but I want to store more, so
 * this will help with retention.
 */
export class IndustryJob extends Model { }

export const industryJobModelDefine = (sequelize: Sequelize) => IndustryJob.init(
  {
    job_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
    },
    activity_id: DataTypes.STRING,
    blueprint_id: DataTypes.BIGINT,
    blueprint_location_id: DataTypes.BIGINT,
    blueprint_type_id: DataTypes.BIGINT,
    cost: DataTypes.BIGINT,
    duration: DataTypes.BIGINT,
    end_date: DataTypes.STRING,
    facility_id: DataTypes.BIGINT,
    installer_id: DataTypes.BIGINT,
    licensed_runs: DataTypes.BIGINT,
    output_location_id: DataTypes.BIGINT,
    probability: DataTypes.DOUBLE,
    product_type_id: DataTypes.BIGINT,
    runs: DataTypes.BIGINT,
    start_date: DataTypes.STRING,
    station_id: DataTypes.BIGINT,
    status: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: IndustryJob.name,
    tableName: 'industry_jobs',
    timestamps: false,
  }
);