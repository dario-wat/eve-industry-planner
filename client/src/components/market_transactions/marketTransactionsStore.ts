import { subDays } from "date-fns";
import { atom, useRecoilState } from "recoil";

export const marketTransactionsPageAtom = atom({
  key: 'marketTransactions',
  default: {
    searchText: '',
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
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

export const useMarketTransactionsStore = () => {
  const [searchText, setSearchText] = useRecoilState(searchTextAtom);
  const [startDate, setStartDate] = useRecoilState(startDateAtom);
  const [endDate, setEndDate] = useRecoilState(endDateAtom);

  return {
    searchText,
    setSearchText,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  };
};