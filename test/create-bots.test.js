/*eslint-env mocha */
var chai = require('chai')
var sinon = require('sinon')
var rewire = require('rewire')
var sinonChai = require('sinon-chai')
var helpers = rewire('../lib/helpers')
var LevelupStub = require('./stubs/levelup-stub')
var createBots = helpers.createBots
var Bot = require('../lib/bot')
var ConfigurationError = require('../lib/errors').ConfigurationError

chai.should()
chai.use(sinonChai)

describe('Create Bots', function () {
  before(function () {
    helpers.__set__('levelup', LevelupStub)
    helpers.__set__('leveldown', sinon.stub())
    helpers.__set__('subleveldown', sinon.stub())
    this.connectStub = sinon.stub()
    Bot.prototype.connect = this.connectStub
    process.env.CONFIG_FILE = process.cwd() + '/test/fixtures/test-config.json'
  })

  afterEach(function () {
    this.connectStub.reset()
  })

  it('should work when given an array of configs', function () {
    process.env.CONFIG_FILE = process.cwd() + '/test/fixtures/test-config.json'
    var bots = createBots()
    bots.length.should.equal(2)
    this.connectStub.should.have.been.called
  })

  it('should work when given an object as a config file', function () {
    process.env.CONFIG_FILE = process.cwd() + '/test/fixtures/single-test-config.json'
    var bots = createBots()
    bots.length.should.equal(1)
    this.connectStub.should.have.been.called
  })

  it('should throw a configuration error if any fields are missing', function () {
    process.env.CONFIG_FILE = process.cwd() + '/test/fixtures/bad-config.json'
    function wrap () {
      createBots()
    }
    (wrap).should.throw(ConfigurationError, 'Missing configuration field nickname')
  })

  it('should throw if a configuration file is neither an object or an array', function () {
    process.env.CONFIG_FILE = process.cwd() + '/test/fixtures/string-config.json'

    function wrap () {
      createBots()
    }
    (wrap).should.throw(ConfigurationError)
  })
})
