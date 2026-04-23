const fibonacci: number[] = [
  0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610,
];

type Predicate = (n: number) => boolean;

const createFilterer = (filter: Predicate) => (array: number[]) =>
  array.filter(filter);

const createDoubleFilterer = (filter1: Predicate) => (filter2: Predicate) => (array: number[]) =>
  array.filter((n) => filter1(n) && filter2(n));

const isEven: Predicate = (n: number) => n % 2 === 0;
const isOver10: Predicate = (n: number) => n > 10;
const isEvenAndOver10: Predicate = (n: number) => isEven(n) && isOver10(n);

const evenFilter = createFilterer(isEven);
const over10Filter = createFilterer(isOver10);
const evenAndOverFilter = createDoubleFilterer(isEven)(isOver10);

const evenNumbers: number[] = evenFilter(fibonacci);
const numbersOver10: number[] = over10Filter(fibonacci);
const evenAndOver10Numbers: number[] = evenAndOverFilter(fibonacci);


console.log(evenNumbers);

