import { subDays } from "date-fns";
import { atom, useRecoilState } from "recoil";

export const ALL_CHARACTERS = '-ALL-';

export const marketTransactionsPageAtom = atom({
  key: 'marketTransactions',
  default: {
    searchText: '',
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    selectedCharacter: ALL_CHARACTERS
  }
});

const searchTextAtom = atom<string>({
  key: 'marketTransactions_searchString',
  default: '',
});

const startDateAtom = atom<Date>({
  key: 'marketTransactions_startDate',
  default: subDays(new Date(), 30),
});

const endDateAtom = atom<Date>({
  key: 'marketTransactions_endDate',
  default: new Date(),
});

const selectedCharacterAtom = atom<string>({
  key: 'marketTransactions_selectedCharacter',
  default: ALL_CHARACTERS,
});

export const useMarketTransactionsStore = () => {
  const [searchText, setSearchText] = useRecoilState(searchTextAtom);
  const [startDate, setStartDate] = useRecoilState(startDateAtom);
  const [endDate, setEndDate] = useRecoilState(endDateAtom);
  const [selectedCharacter, setSelectedCharacter] = useRecoilState(selectedCharacterAtom);

  return {
    searchText,
    setSearchText,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedCharacter,
    setSelectedCharacter,
  };
};