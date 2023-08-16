import { DataTypes, Model, Sequelize } from 'sequelize';

export enum ErrorSeverity {
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Model for App logs. There is no really real-time logging service or anything
 * like that, after all this is not a real app. So all logs go directly
 * into MySQL.
 */
export class AppLog extends Model {

  public static async warn(event: string, data: unknown): Promise<void> {
    await AppLog.create({
      event,
      severity: ErrorSeverity.WARN,
      text: JSON.stringify(data),
      stack_trace: new Error().stack,
    });
  }
}

export const appLogModelDefine = (sequelize: Sequelize) => AppLog.init(
  {
    event: DataTypes.STRING,
    severity: DataTypes.STRING,
    text: DataTypes.TEXT('long'),
    stack_trace: DataTypes.TEXT('long'),
  },
  {
    sequelize,
    modelName: AppLog.name,
    tableName: 'app_logs',
  },
);