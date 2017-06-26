import { CommandPacket } from "./packets/command-packet"
import { ErrorPacket } from './packets/error-packet'
import { IPacket } from "./packets/packet"
import { ISerialPortService } from "./serial/serial-port-service"
import { PacketType } from "./packets/packet-type"

import packetLoggerService from './packets/logging/packet-logger-service'
import {
    CommandClose,
    CommandConnect, CommandDisconnect, CommandList,
    CommandOpen, CommandSimulateData, CommandStatus
} from "./packets/commands"

const debug = require('debug')('Balance Proxy')
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

const NO_CONNECTION_UUID = 'No connection UUID set yet.'

export class BalanceProxy implements IBalanceProxy {
    private subscription: any = null
    private uuid: string = NO_CONNECTION_UUID
    private sequence: number = 0

    constructor(private connection: any,
                private serialService: ISerialPortService) {
        this.subscribe()
    }

    public handleWebSocketClose = (): void => {
        this.unsubscribe()
        debug('WebSocket connection closed.')
    }

    public handleWebSocketError = (error: any): void => {
        debug('WebSocket connection error: ', error)
    }

    public handleWebSocketMessage = (message: string): void => {
        let packet: CommandPacket
        try {
            packet = JSON.parse(message)
        } catch (e) {
            debug('Failed to parse JSON from WebSocket: ', e.message)
            this.sendErrorPacket(
                `Failed to parse JSON from WebSocket: ${e.message}`
            )
            return
        }

        this.uuid = packet.connectionId

        packetLoggerService.log(packet)

        if (packet.packetType !== PacketType.Command) {
            debug(`JSON from WebSocket isn't a command packet.`, packet)
            this.sendErrorPacket(
                `JSON from WebSocket isn't a command packet. ${packet}`,
            )
            return
        }

        let command: string = packet.command
        if (this.matches(command, [CommandList]))
            this.serialService.list()

        else if (this.matches(command, [CommandConnect, CommandOpen]))
            this.serialService.open(packet.device)

        else if (this.matches(command, [CommandDisconnect, CommandClose]))
            this.serialService.close()

        else if (this.matches(command, [CommandSimulateData]))
            this.serialService.simulate(packet.data)

        else if (this.matches(command, [CommandStatus]))
            this.serialService.status()

        else
            this.sendErrorPacket(
                `BalanceProxy doesn't recognize the command "${command}".`,
            )
    }

    private matches = (command: string, commands: string[]): boolean => {
        for (let c of commands) {
            if (c === command) return true
        }

        return false
    }

    private handlePacket = (data: IPacket): void => {
        data.sequence = ++this.sequence
        data.connectionId = this.uuid
        packetLoggerService.log(data)
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

    private sendErrorPacket = (message: string) => {
        let error = new ErrorPacket(message)
        error.sequence = ++this.sequence
        error.connectionId = this.uuid

        packetLoggerService.log(error)
        this.send(error)
    }
}
