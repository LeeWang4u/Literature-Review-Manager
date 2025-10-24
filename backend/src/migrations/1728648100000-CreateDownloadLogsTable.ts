import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDownloadLogsTable1728648100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create download_logs table
    await queryRunner.createTable(
      new Table({
        name: 'download_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'paper_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'publisher_account_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'download_method',
            type: 'enum',
            enum: ['manual', 'publisher_oauth', 'institutional', 'open_access', 'arxiv'],
            isNullable: false,
          },
          {
            name: 'download_status',
            type: 'enum',
            enum: ['success', 'failed', 'pending'],
            isNullable: false,
          },
          {
            name: 'file_size_bytes',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'attempted_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create composite index on user_id + paper_id for faster lookups
    await queryRunner.createIndex(
      'download_logs',
      new TableIndex({
        name: 'IDX_DOWNLOAD_LOGS_USER_PAPER',
        columnNames: ['user_id', 'paper_id'],
      }),
    );

    // Create index on download_status for filtering
    await queryRunner.createIndex(
      'download_logs',
      new TableIndex({
        name: 'IDX_DOWNLOAD_LOGS_STATUS',
        columnNames: ['download_status'],
      }),
    );

    // Create index on attempted_at for time-based queries
    await queryRunner.createIndex(
      'download_logs',
      new TableIndex({
        name: 'IDX_DOWNLOAD_LOGS_ATTEMPTED_AT',
        columnNames: ['attempted_at'],
      }),
    );

    // Create index on publisher_account_id for account-based queries
    await queryRunner.createIndex(
      'download_logs',
      new TableIndex({
        name: 'IDX_DOWNLOAD_LOGS_PUBLISHER_ACCOUNT',
        columnNames: ['publisher_account_id'],
      }),
    );

    // Add foreign key constraint to users table
    await queryRunner.createForeignKey(
      'download_logs',
      new TableForeignKey({
        name: 'FK_DOWNLOAD_LOGS_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key constraint to papers table
    await queryRunner.createForeignKey(
      'download_logs',
      new TableForeignKey({
        name: 'FK_DOWNLOAD_LOGS_PAPER',
        columnNames: ['paper_id'],
        referencedTableName: 'papers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key constraint to publisher_accounts table
    await queryRunner.createForeignKey(
      'download_logs',
      new TableForeignKey({
        name: 'FK_DOWNLOAD_LOGS_PUBLISHER_ACCOUNT',
        columnNames: ['publisher_account_id'],
        referencedTableName: 'publisher_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('download_logs', 'FK_DOWNLOAD_LOGS_PUBLISHER_ACCOUNT');
    await queryRunner.dropForeignKey('download_logs', 'FK_DOWNLOAD_LOGS_PAPER');
    await queryRunner.dropForeignKey('download_logs', 'FK_DOWNLOAD_LOGS_USER');

    // Drop indexes
    await queryRunner.dropIndex('download_logs', 'IDX_DOWNLOAD_LOGS_PUBLISHER_ACCOUNT');
    await queryRunner.dropIndex('download_logs', 'IDX_DOWNLOAD_LOGS_ATTEMPTED_AT');
    await queryRunner.dropIndex('download_logs', 'IDX_DOWNLOAD_LOGS_STATUS');
    await queryRunner.dropIndex('download_logs', 'IDX_DOWNLOAD_LOGS_USER_PAPER');

    // Drop table
    await queryRunner.dropTable('download_logs');
  }
}
