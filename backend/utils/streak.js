const { isToday, isYesterday, parseISO, differenceInCalendarDays } = require("date-fns");

const calculateStreak = (currentStreak, lastActiveDate) => {
  const today = new Date();
  if (!lastActiveDate) {
    return {
      streakCount: 1,
      updated: true
    };
  }

  const last = typeof lastActiveDate === "string" ? parseISO(lastActiveDate) : lastActiveDate;

  if (isToday(last)) {
    return {
      streakCount: currentStreak || 1,
      updated: false
    };
  }

  if (isYesterday(last)) {
    return {
      streakCount: (currentStreak || 0) + 1,
      updated: true
    };
  }

  const diff = differenceInCalendarDays(today, last);
  if (diff > 1) {
    return {
      streakCount: 1,
      updated: true
    };
  }

  return {
    streakCount: currentStreak || 1,
    updated: false
  };
};

module.exports = {
  calculateStreak
};


