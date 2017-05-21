import { SerialError } from './serial/serial-error'
import { SerialPortPublisher } from './serial-port-publisher'
import { IPacket } from "./serial/packet"

const debug = require('debug')('app:proxy')
const uuid = require('uuid/v4')

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
    private uuid: string
    private sequence: number = 0

    constructor(private connection: any, private serial: SerialPortPublisher) {
        this.subscription = null
        this.subscribe()
        this.uuid = uuid()
    }

    ////////////////////////////////////////
    //
    // Balance methods
    //
    ////////////////////////////////////////


    private balanceNext = (data: IPacket) => {
        this.sequence++
        data.sequence = this.sequence
        data.connectionId = this.uuid
        debug('balanceNext: ', data, this.uuid)
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

    public errorWebSocketHandler = (error: any) => {
        debug('WebSocket connection error: ', error)
    }

    public messageWebSocketHandler = (message: string) => {
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
            this.send(new SerialError(
                `BalanceProxy doesn't recognize the command "${receivedJson.command}".`
            ))
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
