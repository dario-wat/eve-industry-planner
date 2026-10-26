import {
  Sequelize,
  DataTypes,
  Model,
  HasManyGetAssociationsMixin,
  ForeignKey,
  BelongsToGetAssociationMixin,
} from 'sequelize';
import { EsiAccount } from './EsiAccount';
import { EsiToken } from './EsiToken';
import { Account } from '../../account/Account';
import { WalletTransaction } from '../../../features/wallet/WalletTransaction';
import { WalletJournalEntry } from 'features/wallet/WalletJournalEntry';

/**
 * EsiCharacter represents an EVE character. Up to 3 EsiCharacters are a part
 * of an EveAccount. But for the purposes of this app we can group as many
 * EsiCharacters from as many EsiAccounts into a single Account.
 */
export class EsiCharacter extends Model {
  declare characterId: number;
  declare characterName: string;
  declare owner: ForeignKey<EsiAccount['owner']>;
  declare accountId: ForeignKey<Account['id']>;

  declare getAccount: BelongsToGetAssociationMixin<Account | null>;
  declare getWalletTransactions: HasManyGetAssociationsMixin<WalletTransaction>;
  declare getWalletJournalEntries: HasManyGetAssociationsMixin<WalletJournalEntry>;

  /**
   * Returns related account or throws if not attached
   * (it should alwasy be thought).
   */
  public async genxAccount(): Promise<Account> {
    return (await this.getAccount())!;
  }

  /**
   * Checks if the EsiCharacter has a stored token with every required scope
   * (i.e. logged in). That is the token EsiTokenStore hands to eve-esi, which
   * refreshes an expired access token on demand, so the expiry of the access
   * token does not matter here.
   */
  public async isLoggedIn(): Promise<boolean> {
    return (await EsiToken.genForCharacter(this.characterId)) !== null;
  }
}

export const esiCharacterModelDefine = (sequelize: Sequelize) =>
  EsiCharacter.init(
    {
      characterId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      characterName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: EsiCharacter.name,
      tableName: 'esi_characters',
      timestamps: false,
    },
  );
