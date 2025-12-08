import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCloudinaryFieldsToPdfFiles1733644800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cloudinary_public_id column
    await queryRunner.addColumn(
      'pdf_files',
      new TableColumn({
        name: 'cloudinary_public_id',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    // Add cloudinary_url column
    await queryRunner.addColumn(
      'pdf_files',
      new TableColumn({
        name: 'cloudinary_url',
        type: 'varchar',
        length: '1000',
        isNullable: true,
      }),
    );

    // Make file_path nullable (since we're moving to Cloudinary)
    await queryRunner.changeColumn(
      'pdf_files',
      'file_path',
      new TableColumn({
        name: 'file_path',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove cloudinary columns
    await queryRunner.dropColumn('pdf_files', 'cloudinary_url');
    await queryRunner.dropColumn('pdf_files', 'cloudinary_public_id');

    // Make file_path non-nullable again
    await queryRunner.changeColumn(
      'pdf_files',
      'file_path',
      new TableColumn({
        name: 'file_path',
        type: 'varchar',
        length: '500',
        isNullable: false,
      }),
    );
  }
}
