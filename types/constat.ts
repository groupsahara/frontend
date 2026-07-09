export interface IStore {
  count: number;
  inc: () => void;
  dec: () => void;
  setCount: (n: number) => void;
}