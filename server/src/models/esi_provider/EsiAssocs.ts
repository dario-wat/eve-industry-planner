import { EsiAccount } from './EsiAccount';
import { EsiCharacter } from './EsiCharacter';
import { EsiToken } from './EsiToken';

export default function esiAssocsDefine() {
  EsiAccount.hasMany(EsiCharacter, { foreignKey: 'ownerId' });
  EsiToken.belongsTo(EsiCharacter, { foreignKey: 'characterId' });
  EsiCharacter.belongsTo(EsiAccount, { foreignKey: 'ownerId' });
  EsiCharacter.hasMany(EsiToken, { foreignKey: 'characterId' });
}