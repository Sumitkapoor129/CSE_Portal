export function getSemesterStartDate(admissionDate: Date | string, semesterNumber: number): Date {
  const adm = new Date(admissionDate);
  if (isNaN(adm.getTime()) || semesterNumber < 1) {
    return new Date();
  }
  const monthsToAdd = (semesterNumber - 1) * 6;
  const originalDay = adm.getUTCDate();

  const totalMonths = adm.getUTCMonth() + monthsToAdd;
  const targetYear = adm.getUTCFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  const maxDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(originalDay, maxDays);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay, 0, 0, 0, 0));
}

export function getSemesterEndDate(admissionDate: Date | string, semesterNumber: number): Date {
  const nextStart = getSemesterStartDate(admissionDate, semesterNumber + 1);
  const end = new Date(nextStart.getTime());
  end.setUTCDate(end.getUTCDate() - 1);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function calculateSemesterDates(
  admissionDate: Date | string,
  semesterNumber: number
): { startDate: Date; endDate: Date } {
  return {
    startDate: getSemesterStartDate(admissionDate, semesterNumber),
    endDate: getSemesterEndDate(admissionDate, semesterNumber),
  };
}

export function calculateCurrentSemester(
  admissionDate: Date | string | null | undefined,
  currentDate: Date | string = new Date()
): number {
  if (!admissionDate) return 1;
  const adm = new Date(admissionDate);
  if (isNaN(adm.getTime())) return 1;

  const cur = new Date(currentDate);
  if (isNaN(cur.getTime()) || cur.getTime() < adm.getTime()) return 1;

  let semester = 1;
  while (true) {
    const nextStart = getSemesterStartDate(adm, semester + 1);
    if (cur.getTime() < nextStart.getTime()) {
      return semester;
    }
    semester += 1;
    if (semester > 50) break; // safety guard
  }
  return semester;
}

export interface SemesterInfo {
  semesterNumber: number;
  label: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

export function getAllSemestersUpToCurrent(
  admissionDate: Date | string | null | undefined,
  currentDate: Date | string = new Date()
): SemesterInfo[] {
  const currentSemester = calculateCurrentSemester(admissionDate, currentDate);
  const semesters: SemesterInfo[] = [];

  for (let s = 1; s <= currentSemester; s++) {
    const { startDate, endDate } = calculateSemesterDates(admissionDate || new Date(), s);
    semesters.push({
      semesterNumber: s,
      label: `Semester ${s}`,
      startDate,
      endDate,
      isCurrent: s === currentSemester,
    });
  }

  return semesters;
}
