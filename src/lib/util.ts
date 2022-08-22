import useAxios from 'axios-hooks';

const LOCALHOST = 'http://localhost:8080';

// Path must begin with /
export function useLocalhostAxios(path: string) {
  return useAxios(LOCALHOST + path);
}