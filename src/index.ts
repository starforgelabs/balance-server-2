import { BalanceProxy } from './balance-proxy'
import { SerialPortPublisher } from './serial-port-publisher'

const debug = require('debug')('app:main')
const nconf = require('nconf')
const WS = require('ws')

////////////////////////////////////////////////////////////////////////////////
//
// Configuration
//
////////////////////////////////////////////////////////////////////////////////

nconf.argv().env().defaults({'port': 3333})

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
debug(`Listening on port ${port}.`)
const server = new WS.Server({port: port})

server.on('connection', (connection: any) => {
    const balanceServer = new BalanceProxy(connection, serialPortSingleton)
    debug('Connection received.')

    // Trap the balanceServer instance in the following closures:

    connection.on('close', () => balanceServer.closeWebSocketHandler())

    connection.on('error', (error: any) => balanceServer.errorWebSocketHandler(error))

    connection.on('message', (message: string) => {
        debug('Message' + message)
        balanceServer.messageWebSocketHandler(message)
    })
})

server.on('error', (error: any) => debug('Error event: ', error))

