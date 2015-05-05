/*eslint-env mocha */
var chai = require('chai')
var sinonChai = require('sinon-chai')
var sinon = require('sinon')
var rewire = require('rewire')
var irc = require('irc')
var Bot = rewire('../lib/bot')
var SwarmStub = require('./stubs/swarm-stub')
var ClientStub = require('./stubs/irc-client-stub')
var config = require('./fixtures/single-test-config.json')

chai.should()
chai.use(sinonChai)

describe('Bot', function () {
  before(function () {
    irc.Client = ClientStub
    Bot.__set__('createSwarm', SwarmStub)
    Bot.__set__('subleveldown', sinon.stub())
    this.dbStub = sinon.stub()
    this.bot = new Bot(this.dbStub, config)
    this.bot.connect()
  })

  afterEach(function () {
    this.bot.swarm.send.reset()
    ClientStub.prototype.say.reset()
  })

  it('should invert the channel mapping', function () {
    this.bot.invertedMapping['#irc'].should.equal('swarm')
  })

  it('should send correct message objects to swarm', function () {
    var message = {
      text: 'testmessage',
      username: 'testuser'
    }

    this.bot.sendToSwarm(message.username, '#irc', message.text)
    var calledMessage = this.bot.swarm.send.getCall(0).args[0]
    calledMessage.text.should.equal(message.text)
    calledMessage.username.should.equal('Anonymous ' + message.username + ' (IRC)')
    calledMessage.channel.should.equal('swarm')
  })

  it('should format usernames before sending to swarm', function () {
    var message = {
      text: 'testmessage',
      username: 'testuser'
    }

    var oldFormat = this.bot.swarmUsernameFormat
    this.bot.swarmUsernameFormat = 'Crazy $username'

    this.bot.sendToSwarm(message.username, '#irc', message.text)
    var calledMessage = this.bot.swarm.send.getCall(0).args[0]
    calledMessage.username.should.equal('Crazy ' + message.username)

    this.bot.swarmUsernameFormat = oldFormat
  })

  it('should not send messages to swarm if the channel isn\'t in the channel mapping',
  function () {
    this.bot.sendToSwarm('user', '#wrongchan', 'message')
    this.bot.swarm.send.should.not.have.been.called
  })

  it('should send correct messages to irc', function () {
    var text = 'testmessage'
    var message = {
      channel: 'swarm',
      username: 'testuser',
      text: text
    }
    this.bot.lastSent = false
    this.bot.sendToIRC(message)
    var ircText = '<testuser> ' + text
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText)
  })

  it('should not send messages to irc if the channel isn\'t in the channel mapping',
  function () {
    this.bot.swarm.returnWrongStubInfo = true
    var message = {
      channel: 'wrongchannel'
    }
    this.bot.lastSent = false
    this.bot.sendToIRC(message)
    ClientStub.prototype.say.should.not.have.been.called
  })

  it('should parse text from swarm', function () {
    this.bot.parseText('hi\nhi\r\nhi\r').should.equal('hi hi hi ')
    this.bot.parseText('>><<').should.equal('>><<')
  })

  it('should parse emojis correctly', function () {
    this.bot.parseText(':smile:').should.equal(':)')
    this.bot.parseText(':train:').should.equal(':train:')
  })
})
