import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePublisherAccountsTable1728648000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create publisher_accounts table
    await queryRunner.createTable(
      new Table({
        name: 'publisher_accounts',
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
            name: 'publisher_name',
            type: 'enum',
            enum: ['ieee', 'springer', 'acm', 'elsevier', 'wiley', 'arxiv', 'other'],
            isNullable: false,
          },
          {
            name: 'account_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'access_token',
            type: 'text',
            isNullable: true,
            comment: 'Encrypted OAuth access token',
          },
          {
            name: 'refresh_token',
            type: 'text',
            isNullable: true,
            comment: 'Encrypted OAuth refresh token',
          },
          {
            name: 'token_expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'institution_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'institutional_credentials',
            type: 'text',
            isNullable: true,
            comment: 'Encrypted institutional login credentials',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'verification_status',
            type: 'enum',
            enum: ['pending', 'verified', 'failed', 'expired'],
            default: "'pending'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique index on user_id + publisher_name
    await queryRunner.createIndex(
      'publisher_accounts',
      new TableIndex({
        name: 'IDX_UNIQUE_USER_PUBLISHER',
        columnNames: ['user_id', 'publisher_name'],
        isUnique: true,
      }),
    );

    // Create index on user_id for faster lookups
    await queryRunner.createIndex(
      'publisher_accounts',
      new TableIndex({
        name: 'IDX_PUBLISHER_ACCOUNTS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    // Create index on is_active for filtering
    await queryRunner.createIndex(
      'publisher_accounts',
      new TableIndex({
        name: 'IDX_PUBLISHER_ACCOUNTS_IS_ACTIVE',
        columnNames: ['is_active'],
      }),
    );

    // Add foreign key constraint to users table
    await queryRunner.createForeignKey(
      'publisher_accounts',
      new TableForeignKey({
        name: 'FK_PUBLISHER_ACCOUNTS_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('publisher_accounts', 'FK_PUBLISHER_ACCOUNTS_USER');

    // Drop indexes
    await queryRunner.dropIndex('publisher_accounts', 'IDX_PUBLISHER_ACCOUNTS_IS_ACTIVE');
    await queryRunner.dropIndex('publisher_accounts', 'IDX_PUBLISHER_ACCOUNTS_USER_ID');
    await queryRunner.dropIndex('publisher_accounts', 'IDX_UNIQUE_USER_PUBLISHER');

    // Drop table
    await queryRunner.dropTable('publisher_accounts');
  }
}
