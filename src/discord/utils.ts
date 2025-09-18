import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import relativeTime from "dayjs/plugin/relativeTime.js";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale("fr");

export const dateDiff = (startDate: Date): string => {
  const start = dayjs(startDate);
  const end = dayjs();
  const diff = dayjs.duration(end.diff(start));
  return `${diff.years()} ans, ${diff.months()} mois, ${diff.days()} jours, ${diff.hours()} heures, ${diff.minutes()} minutes et ${diff.seconds()} secondes`;
};
