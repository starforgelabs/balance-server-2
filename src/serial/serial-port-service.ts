import { Subject } from 'rxjs'

import { DefaultOhausBalanceOptions } from "./default-ohaus-balance-options"
import { ISerialPortMetadata } from './serialport-metadata'
import { ISerialPortOptions } from './serial-port-options'
import { ISerialPortResponse } from './serial-port-response'
import { SerialPortResponse } from './serial-port-response'

import { ErrorPacket } from '../packets/error-packet'
import { IPacket } from "../packets/packet"
import { MiscellaneousPacket } from "../packets/miscellaneous-packet"
import { SerialDataPacket } from '../packets/serial-data-packet'
import { SerialListPacket } from '../packets/serial-list-packet'
import { SerialStatusPacket } from '../packets/serial-status-packet'
import {
    ISerialPortInstance, SerialPortInstance,
    SerialPortState
} from "./serial-port-instance"

const debug = require('debug')('Serial Port Service')
const SerialPort = require('serialport')

////////////////////////////////////////////////////////////////////////////////
//
// Wrapper for the SerialPort object, pushing messages out through RxJS.
// This is intended to be a singleton to control conflicts of multiple
// clients fighting over the serial port.
//
////////////////////////////////////////////////////////////////////////////////

export interface ISerialPortService {
    device: string
    isOpen: boolean
    observable: Subject<IPacket>
    close(): void
    list(): void
    open(device: string | undefined): void
    simulate(data: string | undefined): void
    status(): void
}

export class SerialPortService implements ISerialPortService {
    private ftdiRegex: RegExp
    private port: ISerialPortInstance | null
    private portOptions: ISerialPortOptions
    public observable: Subject<IPacket>

    constructor() {
        this.ftdiRegex = /0403/ // FTDI manufacturer ID
        this.port = null

        // These are common defaults for an Ohaus balance
        this.portOptions = new DefaultOhausBalanceOptions()

        // This is a hot stream.
        this.observable = new Subject<IPacket>()
    }

    public close = (): void => {
        if (this.port)
            this.port.close()
    }

    public get device(): string {
        return this.port && this.port.path || ""
    }

    public get isOpen(): boolean {
        return this.port !== null && this.port.state === SerialPortState.open
    }

    public list = (): void => {
        SerialPort.list((error: any, data: Array<ISerialPortMetadata>) => {
            if (error) {
                debug('Received error from SerialPort.list: ', error)
                this.send(new ErrorPacket(
                    error, 'Received error from SerialPort.list: '
                ))
                return
            }

            debug('Received data from SerialPort.list: ', data)
            if (!data) data = []

            let result = data.map(port => this.listToResponse(port))
            debug('Transformed serial  port data: ', result)

            this.send(new SerialListPacket(result))
        })
    }

    public open = (device: string | undefined): void => {
        if (!device) {
            this.send(new ErrorPacket('', `open() didn't receive a device.`))
            return
        }

        if (!this.port) {
            this.port = new SerialPortInstance(
                this.portOptions,
                this.portStateChange,
                this.portData,
                this.portError
            )
        }

        this.port.open(device)
    }

    public simulate = (data: string | undefined): void => {
        if (typeof data == 'undefined') {
            this.send(new ErrorPacket(`Rejecting undefined simulated data.`))
            debug(`simulate() didn't receive any data.`)
        } else {
            // Inject these packets into the services'
            debug('Injecting simulated data into the stream: ', data)
            this.send(new MiscellaneousPacket('Simulating data...'))
            this.send(new SerialDataPacket(data + ' SIMULATED'))
        }
    }

    public status = (): void => this.sendStatus()

    ////////////////////////////////////////
    //
    // Handlers
    //
    ////////////////////////////////////////

    private portStateChange = (): void => {
        this.sendStatus()
    }

    private portData = (data: string): void => {
        if (/^\s*$/.test(data)) {
            debug('Ignoring spurious blank line.')
            this.send(new MiscellaneousPacket('**Data:** Ignoring spurious blank line.'))
            return
        }

        debug('Serial port data event:', data)
        this.send(new SerialDataPacket(data))
    }

    private portError = (title: string, message: string): void => {
        debug('Serial port error: ', title, message)
        this.send(new ErrorPacket(message, title))
    }

    ////////////////////////////////////////
    //
    // Private
    //
    ////////////////////////////////////////

    private isDeviceConnected = (device: string): boolean => {
        return device === this.device && this.isOpen
    }

    private isDevicePreferred = (vendorId: string): boolean => {
        return this.ftdiRegex instanceof RegExp && this.ftdiRegex.test(vendorId)
    }

    private listToResponse = (port: ISerialPortMetadata): ISerialPortResponse => {
        if (!port.vendorId && port.pnpId) {
            const pnpRegex = /VID_0403/
            if (pnpRegex.test(port.pnpId))
                port.vendorId = '0x0403'
        }

        return new SerialPortResponse(
            port,
            this.isDeviceConnected(port.comName),
            this.isDevicePreferred(port.vendorId)
        )

    }

    private send = (packet: IPacket): void => {
        this.observable.next(packet)
        debug('Sending packet: ', packet)
    }

    private sendStatus = (): void => {
        this.send(new SerialStatusPacket(this.isOpen, this.device))
    }
}
