var events = require('events')
var sinon = require('sinon')

function SwarmStub () {
  var emitter = new events.EventEmitter()

  emitter.addChannel = sinon.stub()
  emitter.process = sinon.stub()
  emitter.send = sinon.stub()

  return emitter
}

module.exports = SwarmStub
