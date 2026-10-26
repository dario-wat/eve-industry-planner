import { EsiAccount } from './EsiAccount';
import { EsiCharacter } from './EsiCharacter';
import { EsiToken } from './EsiToken';

export function esiAssocsDefine() {
  /** Each EsiAccount can have multiple (up to 3) characters. */
  EsiAccount.hasMany(
    EsiCharacter,
    {
      foreignKey: 'owner',
      onDelete: 'CASCADE',
    },
  );
  EsiCharacter.belongsTo(
    EsiAccount,
    {
      foreignKey: 'owner',
      onDelete: 'SET NULL',
    },
  );

  /**
   * Each character has one login token, kept that way by EsiTokenStore. This
   * stays hasMany because the table does not enforce it (see EsiToken).
   */
  EsiCharacter.hasMany(
    EsiToken,
    {
      foreignKey: 'characterId',
      onDelete: 'CASCADE',
    },
  );
  EsiToken.belongsTo(
    EsiCharacter,
    {
      foreignKey: 'characterId',
      onDelete: 'SET NULL',
    },
  );
}