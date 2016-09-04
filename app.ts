/// <reference path="typings/node/node.d.ts" />
/// <reference path="node_modules/rxjs/Rx.d.ts" />

/// <reference path="./api.d.ts" />
import {BalanceProxy} from './balance-proxy'
import {SerialPortPublisher} from './serial-port-publisher'

const debug = require('debug')('app')
const nconf = require('nconf')
const WS = require("ws")

////////////////////////////////////////////////////////////////////////////////
//
// Configuration
//
////////////////////////////////////////////////////////////////////////////////

nconf.argv().env().defaults({
    'port': 3333
})

////////////////////////////////////////////////////////////////////////////////
//
// Serial port singleton
//
// We will connect to *one* balance and publish data from it to all connections.
//
////////////////////////////////////////////////////////////////////////////////

const serialPortSingleton = new SerialPortPublisher()

////////////////////////////////////////////////////////////////////////////////
//
// Start up the WebSocket server.
//
////////////////////////////////////////////////////////////////////////////////

let port = nconf.get('port')
debug("Listening on port " + port)
const server = new WS.Server({port: port})

server.on("connection", (connection) => {
    const balanceServer = new BalanceProxy(connection, serialPortSingleton)
    debug("Connection received.")

    // Trap the balanceServer instance in the following closures:

    connection.on("close", () => {
        balanceServer.closeWebSocketHandler()
    })

    connection.on("error", (error) => {
        balanceServer.errorWebSocketHandler(error)
    })

    connection.on("message", (message) => {
        debug("Message" + message)
        balanceServer.messageWebSocketHandler(message)
    })
})

server.on("error", (error) => {
    debug("Error event: ", error)
})

