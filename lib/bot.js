var _ = require('lodash')
var irc = require('irc')
var logger = require('winston')
var subleveldown = require('subleveldown')
var createSwarm = require('./swarm')
var errors = require('./errors')
var validateChannelMapping = require('./validators').validateChannelMapping
var emojis = require('./emoji')

var REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping']

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options - server, nickname, channelMapping, outgoingToken, incomingURL
 */
function Bot (db, options) {
  REQUIRED_FIELDS.forEach(function (field) {
    if (!options[field]) {
      throw new errors.ConfigurationError('Missing configuration field ' + field)
    }
  })
  validateChannelMapping(options.channelMapping)

  this.db = db
  this.server = options.server
  this.nickname = options.nickname
  this.ircOptions = options.ircOptions

  this.channels = _.values(options.channelMapping)

  this.channelMapping = {}

  // Remove channel passwords from the mapping
  _.forOwn(options.channelMapping, function (ircChan, friendsChan) {
    this.channelMapping[friendsChan] = ircChan.split(' ')[0]
  }, this)

  this.invertedMapping = _.invert(this.channelMapping)

  this.autoSendCommands = options.autoSendCommands || []
}

Bot.prototype.connect = function () {
  logger.debug('Connecting to IRC and Friends')

  this.swarm = createSwarm(subleveldown(this.db, 'swarm'))
  Object.keys(this.channelMapping).forEach(this.swarm.addChannel)

  var ircOptions = _.assign({
    userName: this.nickname,
    realName: this.nickname,
    channels: this.channels,
    floodProtection: true,
    floodProtectionDelay: 500
  }, this.ircOptions)

  this.ircClient = new irc.Client(this.server, this.nickname, ircOptions)
  this.attachListeners()
}

Bot.prototype.attachListeners = function () {

  this.ircClient.on('registered', function (message) {
    logger.debug('Registered event: ', message)
    var connectedAt = Date.now()

    this.autoSendCommands.forEach(function (element) {
      this.ircClient.send.apply(this.ircClient, element)
    }, this)

    this.swarm.process(function (message, cb) {
      if (message.timestamp > connectedAt) {
        logger.debug('Swarm process', message)
        this.sendToIRC(message)
      }
      cb()
    }.bind(this))

  }.bind(this))

  this.ircClient.on('error', function (error) {
    logger.error('Received error event from IRC', error)
  })

  this.swarm.on('error', function (error) {
    logger.error('Received error event from Swarm', error)
  })


  this.ircClient.on('message', this.sendToSwarm.bind(this))

  this.ircClient.on('invite', function (channel, from) {
    logger.debug('Received invite:', channel, from)
    if (!this.invertedMapping[channel]) {
      logger.debug('Channel not found in config, not joining:', channel)
    } else {
      this.ircClient.join(channel)
      logger.debug('Joining channel:', channel)
    }
  }.bind(this))
}

Bot.prototype.parseText = function (text) {
  return text
    .replace(/\n|\r\n|\r/g, ' ')
    .replace(/&amp/g, '&')
    .replace(/&lt/g, '<')
    .replace(/&gt/g, '>')
    .replace(/\:(\w+)\:/g, function (match, emoji) {
      if (emoji in emojis) {
        return emojis[emoji]
      }
      return match
    })
}

Bot.prototype.checkDuplicate = function (message) {
  if (!this.lastSent) return false

  for (var key in this.lastSent) {
    if (this.lastSent.hasOwnProperty(key)) {
      if (message[key] !== this.lastSent[key]) {
        return false
      }
    }
  }

  return true
}

Bot.prototype.sendToIRC = function (message) {
  if (this.checkDuplicate(message)) return
  var ircChannel = this.channelMapping[message.channel]
  logger.debug('Trying to send to IRC', ircChannel, message)
  if (ircChannel) {
    var text = '<' + message.username + '> ' + this.parseText(message.text)
    logger.debug('Sending message to IRC', ircChannel, text)
    this.ircClient.say(ircChannel, text)
  }
}

Bot.prototype.sendToSwarm = function (author, channel, text) {
  var swarmChannel = this.invertedMapping[channel]
  if (swarmChannel) {
    if (!swarmChannel) {
      logger.info('Tried to send a message to a channel the bot isn\'t in: ',
        swarmChannel)
      return
    }

    var message = {
      text: text,
      username: 'Anonymous ' + author,
      channel: swarmChannel,
      timestamp: Date.now()
    }
    logger.debug('Sending message to Swarm', text, channel, '->', swarmChannel, '- by', author)
    this.swarm.send(message)
    this.lastSent = message
  }
}

module.exports = Bot
