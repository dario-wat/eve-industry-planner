import { EsiCharacter } from 'core/esi/models/EsiCharacter';
import {
  BelongsToGetAssociationMixin,
  DataTypes,
  ForeignKey,
  Model,
  Sequelize,
} from 'sequelize';

export class WalletJournalEntry extends Model {

  declare amount: number;
  declare date: string;
  declare ref_type: string;

  declare characterId: ForeignKey<EsiCharacter['characterId']>;

  declare getEsiCharacter: BelongsToGetAssociationMixin<EsiCharacter | null>;
}

export const walletJournalEntryModelDefine =
  (sequelize: Sequelize) => WalletJournalEntry.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      amount: DataTypes.BIGINT,
      balance: DataTypes.BIGINT,
      context_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      context_id_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      date: DataTypes.STRING,
      description: DataTypes.STRING,
      first_party_id: DataTypes.BIGINT,
      reason: DataTypes.STRING,
      ref_type: DataTypes.STRING,
      second_party_id: DataTypes.BIGINT,
    },
    {
      sequelize,
      modelName: WalletJournalEntry.name,
      tableName: 'wallet_journal',
      timestamps: false,
    },
  );