import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { IndustryJob } from './IndustryJob';

export function industryJobAssocsDefine(): void {
  /** Each Character has many industry jobs */
  EsiCharacter.hasMany(
    IndustryJob,
    {
      foreignKey: 'characterId',
      onDelete: 'CASCADE',
    },
  );
  IndustryJob.belongsTo(
    EsiCharacter,
    {
      foreignKey: 'characterId',
      onDelete: 'SET NULL',
    },
  );
}