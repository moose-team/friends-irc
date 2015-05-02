/*eslint-env mocha */
var chai = require('chai')
var sinonChai = require('sinon-chai')
var sinon = require('sinon')
var rewire = require('rewire')
var irc = require('irc')
var logger = require('winston')
var Bot = rewire('../lib/bot')
var SwarmStub = require('./stubs/swarm-stub')
var ClientStub = require('./stubs/irc-client-stub')
var config = require('./fixtures/single-test-config.json')

chai.should()
chai.use(sinonChai)

describe('Bot Events', function () {
  before(function () {
    this.infoSpy = sinon.spy(logger, 'info')
    this.debugSpy = sinon.spy(logger, 'debug')
    this.errorSpy = sinon.spy(logger, 'error')
    irc.Client = ClientStub
    Bot.__set__('createSwarm', SwarmStub)
    Bot.__set__('subleveldown', sinon.stub())
    Bot.prototype.sendToIRC = sinon.stub()
    Bot.prototype.sendToSwarm = sinon.stub()

    this.dbStub = sinon.stub()
    this.bot = new Bot(this.dbStub, config)
    this.bot.connect()
  })

  afterEach(function () {
    Bot.prototype.sendToIRC.reset()
    Bot.prototype.sendToSwarm.reset()
    ClientStub.prototype.send.reset()
    ClientStub.prototype.join.reset()
    this.infoSpy.reset()
    this.debugSpy.reset()
    this.errorSpy.reset()
  })

  it('should try to send autoSendCommands on registered IRC event', function () {
    this.bot.ircClient.emit('registered')
    ClientStub.prototype.send.should.have.been.calledTwice
    ClientStub.prototype.send.getCall(0).args.should.deep.equal(config.autoSendCommands[0])
    ClientStub.prototype.send.getCall(1).args.should.deep.equal(config.autoSendCommands[1])
  })

  it('should error log on error events', function () {
    var swarmError = new Error('swarm')
    var ircError = new Error('irc')
    this.bot.swarm.emit('error', swarmError)
    this.bot.ircClient.emit('error', ircError)
    this.errorSpy.getCall(0).args[0].should.equal('Received error event from Swarm')
    this.errorSpy.getCall(0).args[1].should.equal(swarmError)
    this.errorSpy.getCall(1).args[0].should.equal('Received error event from IRC')
    this.errorSpy.getCall(1).args[1].should.equal(ircError)
  })

  it('should send messages to swarm', function () {
    var channel = '#channel'
    var author = 'user'
    var text = 'hi'
    this.bot.ircClient.emit('message', channel, author, text)
    Bot.prototype.sendToSwarm.should.have.been.calledWithExactly(channel, author, text)
  })

  it('should join channels when invited', function () {
    var channel = '#irc'
    var author = 'user'
    this.bot.ircClient.emit('invite', channel, author)
    var firstCall = this.debugSpy.getCall(0)
    firstCall.args[0].should.equal('Received invite:')
    firstCall.args[1].should.equal(channel)
    firstCall.args[2].should.equal(author)

    ClientStub.prototype.join.should.have.been.calledWith(channel)
    var secondCall = this.debugSpy.getCall(1)
    secondCall.args[0].should.equal('Joining channel:')
    secondCall.args[1].should.equal(channel)
  })

  it('should not join channels that aren\'t in the channel mapping', function () {
    var channel = '#wrong'
    var author = 'user'
    this.bot.ircClient.emit('invite', channel, author)
    var firstCall = this.debugSpy.getCall(0)
    firstCall.args[0].should.equal('Received invite:')
    firstCall.args[1].should.equal(channel)
    firstCall.args[2].should.equal(author)

    ClientStub.prototype.join.should.not.have.been.called
    var secondCall = this.debugSpy.getCall(1)
    secondCall.args[0].should.equal('Channel not found in config, not joining:')
    secondCall.args[1].should.equal(channel)
  })
})
