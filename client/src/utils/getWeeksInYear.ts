/**
 * Определяет количество недель в указанном году по стандарту ISO
 * ISO неделя 1 - это неделя, содержащая первый четверг года
 * Год может содержать 52 или 53 недели
 */
export function getWeeksInYear(year: number): number {
  // Первый день года
  const firstDayOfYear = new Date(year, 0, 1);
  // День недели первого дня года (0 - воскресенье, 1 - понедельник, ...)
  const firstDayOfYearDay = firstDayOfYear.getDay();
  
  // Если год начинается с четверга (4) или если это високосный год и 
  // год начинается со среды (3), то в году 53 недели
  if (
    firstDayOfYearDay === 4 || 
    (firstDayOfYearDay === 3 && isLeapYear(year))
  ) {
    return 53;
  }
  
  // Иначе в году 52 недели
  return 52;
}

/**
 * Проверяет, является ли год високосным
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Получает количество недель для указанной даты (базируясь на году данной даты)
 */
export function getWeeksForDate(date: Date): number {
  return getWeeksInYear(date.getFullYear());
}