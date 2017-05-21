import { SerialError } from './serial/serial-error'
import { IPacket } from "./serial/packet"
import { ISerialPortService } from "./serial-port-service"

const debug = require('debug')('app:proxy')
const uuid = require('uuid/v4')

////////////////////////////////////////////////////////////////////////////////
//
// This does two things.
// First, it interprets commands coming from the WebSocket client and
// calls the corresponding method on the balance service.
// Second, it relays packets from the balance service to the WebSocket client.
//
// Each connection will have its own BalanceProxy instance.
//
////////////////////////////////////////////////////////////////////////////////

export interface IBalanceProxy {
    handleWebSocketClose(): void // clean up on WebSocket connection close
    handleWebSocketError(error: any): void // handle error from WebSocket connection
    handleWebSocketMessage(message: string): void // handle messages coming in from the client
}

const CommandClose = 'close'
const CommandConnect = 'connect'
const CommandDisconnect = 'disconnect'
const CommandList = 'list'
const CommandOpen = 'open'
const CommandStatus = 'status'

export class BalanceProxy {
    private subscription: any = null
    private uuid: string
    private sequence: number = 0

    constructor(private connection: any,
                private serialService: ISerialPortService) {
        this.subscribe()
        this.uuid = uuid()
    }

    public handleWebSocketClose = (): void => {
        this.unsubscribe()
        debug('WebSocket connection closed.')
    }

    public handleWebSocketError = (error: any): void => {
        debug('WebSocket connection error: ', error)
    }

    public handleWebSocketMessage = (message: string): void => {
        let command: any
        try {
            command = JSON.parse(message)
        } catch (e) {
            debug('Failed to parse JSON from WebSocket: ', e.message)
            return
        }

        if (!command.command) {
            debug('JSON from WebSocket does not have the required `command` attribute.')
            return
        }

        if (this.matches(command, [CommandList]))
            this.serialService.list()

        else if (this.matches(command, [CommandConnect, CommandOpen]))
            this.serialService.open(command.device)

        else if (this.matches(command, [CommandDisconnect, CommandClose]))
            this.serialService.close()

        else if (this.matches(command, [CommandStatus]))
            this.serialService.status()

        else
            this.send(new SerialError(
                `BalanceProxy doesn't recognize the command "${command.command}".`
            ))
    }

    private matches = (json: any, commands: string[]): boolean => {
        for (let c of commands) {
            if (c === json.command) return true
        }

        return false
    }

    private handlePacket = (data: IPacket): void => {
        data.sequence = ++this.sequence
        data.connectionId = this.uuid
        debug('Packet from service: ', data)
        this.send(data)
    }

    private subscribe = (): void => {
        if (!this.subscription)
            this.subscription = this.serialService.observable
                .subscribe(this.handlePacket)
    }

    private unsubscribe = (): void => {
        if (this.subscription)
            this.subscription.unsubscribe()
    }

    private send = (json: any): void => {
        try {
            this.connection.send(JSON.stringify(json))
        }
        catch (e) {
            debug('Failed to send data to client: ', e.message)
        }
    }
}
