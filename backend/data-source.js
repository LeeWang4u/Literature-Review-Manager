require('dotenv').config();
const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'literature_review_db',
  
  // For migrations, we need to use compiled JS files
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  
  charset: 'utf8mb4',
  timezone: '+00:00',
  synchronize: false, // IMPORTANT: Set to false when using migrations
  logging: ['error', 'warn', 'migration'],
});

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });

module.exports = AppDataSource;
