import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCitationParsingFields1732252800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new fields for AI citation parsing and hierarchical citations
    await queryRunner.addColumn(
      'citations',
      new TableColumn({
        name: 'citation_depth',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'citations',
      new TableColumn({
        name: 'parsed_authors',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'citations',
      new TableColumn({
        name: 'parsed_title',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'citations',
      new TableColumn({
        name: 'parsed_year',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'citations',
      new TableColumn({
        name: 'parsing_confidence',
        type: 'decimal',
        precision: 3,
        scale: 2,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'citations',
      new TableColumn({
        name: 'raw_citation',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'citations',
      new TableColumn({
        name: 'note_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Create index on citation_depth for efficient querying
    await queryRunner.query(
      `CREATE INDEX idx_citation_depth ON citations (citation_depth)`,
    );

    // Create index on note_id for joins
    await queryRunner.query(
      `CREATE INDEX idx_citation_note ON citations (note_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX idx_citation_depth ON citations`);
    await queryRunner.query(`DROP INDEX idx_citation_note ON citations`);

    // Drop columns
    await queryRunner.dropColumn('citations', 'note_id');
    await queryRunner.dropColumn('citations', 'raw_citation');
    await queryRunner.dropColumn('citations', 'parsing_confidence');
    await queryRunner.dropColumn('citations', 'parsed_year');
    await queryRunner.dropColumn('citations', 'parsed_title');
    await queryRunner.dropColumn('citations', 'parsed_authors');
    await queryRunner.dropColumn('citations', 'citation_depth');
  }
}
