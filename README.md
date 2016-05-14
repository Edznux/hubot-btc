# hubot-btc

Hubot script for bitcoin management.

## dependency

- hubot-redis-brain

## Commands available

- add <address> : Attach address to your user
- rm | delete | remove <address or index> : Detach <address> from the current user. Index is provided by the "list" command.
- list : list addresses from the current user
- check <address> : Get balance from the address provided
- balance : Get the balance of the current user
- transaction : List latest transaction of the current user
- price : value of bitoin
- p : alias for price

## Installation

Download the latest version from npm

```
npm install hubot-bitoin
```
Add dependency to your hubot external script:
external-scripts.json
```
[
  //....
  "hubot-redis-brain",
  "hubot-bitoin"
  //....
]

```


## TODO

- [ ] Refactoring
- [ ] i18n
