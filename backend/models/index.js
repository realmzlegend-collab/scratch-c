// Central place to require all models so other files just import the models object
// Add additional models here as you create them, e.g. require('./Post');
require('./User');

module.exports = {
  User: require('./User'),
  // Export other models like: Post: require('./Post')
};
