var _ = require('lodash')
var path = require('path')
var levelup = require('levelup')
var leveldown = require('leveldown')
var subleveldown = require('subleveldown')
var Bot = require('./bot')
var errors = require('./errors')

/**
 * Reads from the provided config file and returns an array of bots
 * @return {object[]}
 */
exports.createBots = function () {
  var configFile = require(path.resolve(process.cwd(), process.env.CONFIG_FILE))
  var bots = []
  var db = levelup('../friendsdb', {db: leveldown})
  db.channels = subleveldown(db, 'channels', {valueEncoding: 'json'})

  // The config file can be both an array and an object
  if (Array.isArray(configFile)) {
    configFile.forEach(function (config) {
      var bot = new Bot(db, config)
      bot.connect()
      bots.push(bot)
    })
  } else if (_.isObject(configFile)) {
    var bot = new Bot(db, configFile)
    bot.connect()
    bots.push(bot)
  } else {
    throw new errors.ConfigurationError()
  }

  return bots
}
