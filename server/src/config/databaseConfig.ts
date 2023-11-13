import { Dialect } from 'sequelize/types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const localDatabaseConfig = {
  name: 'eve_industry_planner_db',
  username: 'root',
  password: 'KMkk%^FLt7%WyhHg8HcfMkShdH$tYw5Sq',
  host: 'localhost',
  port: 3306,
  dialect: 'mysql' as Dialect,
};

const awsDatabaseConfig = {
  name: 'eve_industry_planner_db',
  username: 'root',
  password: 'KMkk%^FLt7%WyhHg8HcfMkShdH$tYw5Sq',
  host: 'eve-industry-planner-db.cgr23aa1xkf3.us-west-2.rds.amazonaws.com',
  port: 3306,
  dialect: 'mysql' as Dialect,
};

export default awsDatabaseConfig;