import { BalanceProxy } from './balance-proxy'
import {
    ISerialPortService,
    SerialPortService
} from "./serial/serial-port-service"

const debug = require('debug')('app:main')
const nconf = require('nconf')
const path = require('path')
const ws = require('ws')

////////////////////////////////////////////////////////////////////////////////
//
// Configuration
//
////////////////////////////////////////////////////////////////////////////////

nconf.argv()
    .env()
    .file({
        file: path.join(__dirname, '../config.json')
    })
    .defaults({
        port: 3333
    })

////////////////////////////////////////////////////////////////////////////////
//
// Discord logging configuration
//
////////////////////////////////////////////////////////////////////////////////

import { MiscellaneousPacket } from "./packets/miscellaneous-packet"
import { IPacketLogger, PacketLogger } from "./packets/logging/packet-logger"
let name = nconf.get('Name')
let webhookId = nconf.get('WebhookId')
let webhookToken = nconf.get('WebhookToken')

let packetLoggerSingleton: IPacketLogger = new PacketLogger()
packetLoggerSingleton.configure(name, webhookId, webhookToken)

////////////////////////////////////////////////////////////////////////////////
//
// Serial port singleton
//
// We will connect to *one* balance and publish data from it to all connections.
//
////////////////////////////////////////////////////////////////////////////////

const serialPortSingleton: ISerialPortService = new SerialPortService()

////////////////////////////////////////////////////////////////////////////////
//
// Start up the WebSocket server.
//
////////////////////////////////////////////////////////////////////////////////

let port = nconf.get('port')
const server = new ws.Server({port: port})
debug(`Listening on port ${port}.`)
packetLoggerSingleton.log(new MiscellaneousPacket(`Server started. Listening on port ${port}`))

server.on('connection', (connection: any) => {
    // This instance gets trapped
    // in the closures of the 'on' event handlers below.
    const glue = new BalanceProxy(
        connection,
        serialPortSingleton,
        packetLoggerSingleton
    )

    debug('Connection received.')

    connection.on('close', () => glue.handleWebSocketClose())
    connection.on('error', (error: any) => glue.handleWebSocketError(error))
    connection.on('message', (message: string) => glue.handleWebSocketMessage(message))
})

server.on('error', (error: any) => debug('Error event: ', error))

