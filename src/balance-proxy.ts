import { SerialPortPublisher } from './serial-port-publisher'

const debug = require('debug')('proxy')

////////////////////////////////////////////////////////////////////////////////
//
// Glue for each WebSocket connection.
//
// This bridges the RxJS publications from the serial port singleton and  the
// WebSocket client.
//
// Each connection will have its own BalanceProxy instance.
//
////////////////////////////////////////////////////////////////////////////////

export class BalanceProxy {
    private subscription: any

    constructor(private connection: any, private serial: SerialPortPublisher) {
        this.subscription = null
        this.subscribe()
    }

    ////////////////////////////////////////
    //
    // Balance methods
    //
    ////////////////////////////////////////


    private balanceNext = (data) => {
        this.send(data)
    }

    private subscribe = () => {
        if (!this.subscription)
            this.subscription = this.serial.publisher.subscribe(this.balanceNext)
    }

    private unsubscribe = () => {
        if (this.subscription)
            this.subscription.unsubscribe()
    }

    ////////////////////////////////////////
    //
    // WebSocket methods
    //
    ////////////////////////////////////////

    public closeWebSocketHandler = () => {
        this.unsubscribe()
        debug('WebSocket connection closed.')
    }

    public errorWebSocketHandler = (error) => {
        debug('WebSocket connection error: ', error)
    }

    public messageWebSocketHandler = (message) => {
        let receivedJson: any
        try {
            receivedJson = JSON.parse(message)
        } catch (e) {
            debug('Failed to parse JSON from WebSocket: ', e.message)
            return
        }

        if (!receivedJson.command) {
            debug('JSON from WebSocket does not have the required `command` attribute.')
            return
        }

        if (receivedJson.command === 'list')
            this.serial.list()

        else if (receivedJson.command === 'connect' ||
            receivedJson.command === 'open')
            this.serial.open(receivedJson.device)

        else if (receivedJson.command === 'disconnect' ||
            receivedJson.command === 'close')
            this.serial.close()

        else if (receivedJson.command === 'status')
            this.serial.sendStatus()

        else
            this.send({
                error: `BalanceProxy doesn't recognize the command "${receivedJson.command}"`
            })
    }

    public send = (json: any) => {
        try {
            this.connection.send(JSON.stringify(json))
        }
        catch (e) {
            debug('Failed to send data to client: ', e.message)
        }
    }
}
