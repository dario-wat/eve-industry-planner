export const THE_FORGE = 10000002;

export const PITH_X_TYPE_SHIELD_BOOST_AMPLIFIER = 19295;
export const JITA = 30000142;
export const PERIMETER = 30000144;
export const JITA_4_4 = 60003760;

/** 0.0% Neutral States Market HQ and Tranquility Trading Tower. */
export const PERIMETER_MARKET_STRUCTURES: readonly number[] = [1044752365771, 1042508032148];

/** Short names traders use for structures. */
export const STRUCTURE_NICKNAMES: Readonly<Record<number, string>> = {
  1044752365771: '0.0%',
  1042508032148: 'TTT',
};

/** Where the trade calculator offers to buy and sell. */
export const TRADE_LOCATIONS: readonly number[] = [JITA_4_4, ...PERIMETER_MARKET_STRUCTURES];
