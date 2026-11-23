import { DataTypes, Model, Sequelize } from 'sequelize';

export type JobRunStatus = 'running' | 'success' | 'failure';

export class JobRun extends Model {
  declare id: number;
  declare job_name: string;
  declare status: JobRunStatus;
  declare started_at: Date;
  declare finished_at: Date | null;
  declare elapsed_ms: number | null;
  declare peak_rss_mb: number | null;
  declare error: string | null;
  declare summary: object | null;
}

export const jobRunModelDefine = (sequelize: Sequelize) =>
  JobRun.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      job_name: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      finished_at: DataTypes.DATE,
      elapsed_ms: DataTypes.INTEGER,
      peak_rss_mb: DataTypes.INTEGER,
      error: DataTypes.TEXT,
      summary: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: JobRun.name,
      tableName: 'app_job_runs',
      timestamps: false,
      indexes: [{ fields: ['job_name', 'started_at'] }],
    },
  );
