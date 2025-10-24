import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'literature_review_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // IMPORTANT: Set to false when using migrations to avoid conflicts
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  timezone: '+00:00',
  autoLoadEntities: true, // Tự động load entities
  dropSchema: false, // KHÔNG xóa schema khi restart (đặt true nếu muốn reset DB mỗi lần)
};

// For TypeORM CLI
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'literature_review_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  charset: 'utf8mb4',
  timezone: '+00:00',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
