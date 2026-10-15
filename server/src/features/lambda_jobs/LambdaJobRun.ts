import { DataTypes, Model, Sequelize } from 'sequelize';

/** One Lambda invocation recorded by recordRun. */
export class LambdaJobRun extends Model {
  declare id: number;
  declare function_name: string;
  declare ran_at: Date;
  declare ok: boolean;
  declare duration_ms: number;
  declare result: string | null;
}

export const lambdaJobRunModelDefine = (sequelize: Sequelize) => LambdaJobRun.init(
  {
    function_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ran_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ok: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    result: DataTypes.TEXT,
  },
  {
    sequelize,
    modelName: LambdaJobRun.name,
    tableName: 'lambda_job_runs',
    timestamps: false,
  },
);
