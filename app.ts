/// <reference path="typings/node/node.d.ts" />
/// <reference path="node_modules/rxjs/Rx.d.ts" />

/// <reference path="./api.d.ts" />
import {BalanceProxy} from './balance-proxy'
import {SerialPortPublisher} from './serial-port-publisher'

const debug = require('debug')('app')
const WS = require("ws")

////////////////////////////////////////////////////////////////////////////////
//
// Wrapper for the SerialPort object, pushing messages out through RxJS.
//
////////////////////////////////////////////////////////////////////////////////


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

const PORT = 3333
const server = new WS.Server({port: PORT})

server.on("connection", (connection) => {
    const balanceServer = new BalanceProxy(connection, serialPortSingleton)
    debug_socket("Connection received.")

    // Trap the balanceServer instance in the following closures:

    connection.on("close", () => {
        balanceServer.closeWebSocketHandler()
    })

    connection.on("error", (error) => {
        balanceServer.errorWebSocketHandler(error)
    })

    connection.on("message", (message) => {
        debug_socket("Message" + message)
        balanceServer.messageWebSocketHandler(message)
    })
})

server.on("error", (error) => {
    debug_socket("Error event: ", error)
})

