# friends-irc

[![npm][npm-image]][npm-url]
[![travis][travis-image]][travis-url]

[npm-image]: https://img.shields.io/npm/v/friends-irc.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/friends-irc
[travis-image]: https://img.shields.io/travis/moose-team/friends-irc.svg?style=flat-square
[travis-url]: https://travis-ci.org/moose-team/friends-irc

Connects IRC and Friends channels by sending messages back and forth.
Based on [slack-irc](https://github.com/ekmartin/slack-irc).

## Installation and usage
Use the newest version of io.js and npm (`>= 1.8.1`, `>= 2.8.3`) and follow the [prerequisite steps](https://github.com/js-platform/node-webrtc#prerequisites)
for [node-webrtc](https://github.com/js-platform/node-webrtc) before continuing.

Install either through npm:
```bash
$ npm install -g friends-irc
$ friends-irc --config /path/to/config.json
```

or by cloning the repository:
```bash
In the repository folder:
$ npm install
$ node index.js --config /path/to/config.json
```

## Configuration
friends-irc requires a JSON-configuration file, where path can be given either through
the CLI-option `--config` or the environment variable `CONFIG_FILE`. The configuration
file needs to be an object or an array, depending on the number of IRC bots you want to run.

To set the log level to debug, export the environment variable `NODE_ENV` as `development`.

friends-irc also supports invite-only IRC channels, and will join any channels it's invited to
as long as they're present in the channel mapping.

### Example configuration
```js
[
  // Bot 1 (minimum config):
  {
    "nickname": "test2",
    "server": "irc.testbot.org",
    "channelMapping": {
      "#cats": "#bettercats"
    }
  },

  // Bot 2:
  {
    "nickname": "test",
    "server": "irc.bottest.org",
    "swarmUsernameFormat": "Anonymous Cat $username", // $username is replaced with the IRC user's username before posting to Friends 
    "autoSendCommands": [ // Commands that will be sent on connect
      ["PRIVMSG", "NickServ", "IDENTIFY password"],
      ["MODE", "test", "+x"],
      ["AUTH", "test", "password"]
    ],
    "channelMapping": { // Maps each Swarm-channel to an IRC-channel, used to direct messages to the correct place
      "friends": "#friends",
      "cats": "#fatcats channel-password" // Add channel keys after the channel name
    },
    "ircOptions": { // Optional node-irc options
      "floodProtection": false, // On by default
      "floodProtectionDelay": 1000 // 500 by default
    }
  }
]
```

`ircOptions` is passed directly to node-irc ([available options](http://node-irc.readthedocs.org/en/latest/API.html#irc.Client)).

## Tests
Run the tests with:
```bash
$ npm test
```

## Contributing
Contributions welcome! Please read the [contributing guidelines](CONTRIBUTING.md) first.

## License
[MIT](LICENSE)
