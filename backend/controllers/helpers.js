const resolveUserId = (req) => {
  if (req.query && req.query.userId) {
    const parsed = Number(req.query.userId);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (req.body && req.body.userId) {
    const parsed = Number(req.body.userId);
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

