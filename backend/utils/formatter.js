const formatUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    isAdmin: Boolean(user.isAdmin)
  };
};

module.exports = {
  formatUser
};


