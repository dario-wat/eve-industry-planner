import { DataTypes, Model, Sequelize } from 'sequelize';

export enum ErrorSeverity {
  WARN = 'warn',
  ERROR = 'error',
}

export class AppLog extends Model {

  public static async warn(event: string, data: any): Promise<void> {
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