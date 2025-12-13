const resolveUserId = (req) => {
  if (req.query.userId) {
    const parsed = Number(req.query.userId);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const envGuest = Number(process.env.GUEST_USER_ID);
  if (!Number.isNaN(envGuest) && envGuest > 0) {
    return envGuest;
  }

  return null;
};

module.exports = {
  resolveUserId
};

