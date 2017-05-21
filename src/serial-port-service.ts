import { Subject } from 'rxjs'

import { DefaultOhausBalanceOptions } from "./default-ohaus-balance-options"
import { SerialData } from './serial/serial-data'
import { SerialError } from './serial/serial-error'
import { ISerialPortMetadata } from './serial/serialport-metadata'
import { ISerialPortOptions } from './serial/serial-port-options'
import { ISerialPortResponse } from './serial/serial-port-response'
import { SerialStatus } from './serial/serial-status'
import { SerialList } from './serial/serial-list'
import { SerialPortResponse } from './serial/serial-port-response'
import { IPacket } from "./serial/packet"

const debug = require('debug')('app:balance')
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
    open(device: string): void
    status(): void
}

export class SerialPortService implements ISerialPortService {
    private ftdiRegex: RegExp
    private port: any
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
        if (this.isOpen) {
            this.send(new SerialStatus(false, this.device))
            this.port.close()
        }

        this.port = null
    }

    public get device(): string {
        return this.port && this.port.path || ""
    }

    public get isOpen(): boolean {
        // Use !! to force a boolean result.
        return !!(this.port && this.port.isOpen())
    }

    public list = (): void => {
        SerialPort.list((error: any, data: Array<ISerialPortMetadata>) => {
            if (error) {
                debug('Received error from SerialPort.list: ', error)
                this.send(new SerialError(
                    error, 'Received error from SerialPort.list: '
                ))
                return
            }

            debug('Received data from SerialPort.list: ', data)
            if (!data) data = []

            let result = data.map(port => this.listToResponse(port))
            debug('Transformed serial  port data: ', result)

            this.observable.next(new SerialList(result))
        })
    }

    public open = (device: string): void => {
        if (!device) {
            this.send(new SerialError(null, `open() didn't receive a device.`))
            return
        }

        if (this.isOpen && this.device == device) {
            this.sendStatus()
            return
        }

        debug('Doing a close() to be sure things are OK.')
        this.close()

        debug('Opening serial port with options: ', this.portOptions)
        this.port = new SerialPort(device, this.portOptions)
        this.port.on('close', this.portCloseHandler)
        this.port.on('data', this.portDataHandler)
        this.port.on('disconnect', this.close)
        this.port.on('error', this.portErrorHandler)
        this.port.on('open', this.portOpenHandler)
    }

    public status = (): void => this.sendStatus()

    ////////////////////////////////////////
    //
    // Handlers
    //
    ////////////////////////////////////////

    private portCloseHandler = (): void => {
        debug('Serial port close event.')
        if (this.device !== "")
            this.sendStatus()
    }

    private portDataHandler = (data: string): void => {
        debug('Serial port data event:', data)
        this.observable.next(new SerialData(data))
    }

    private portErrorHandler = (error: any): void => {
        debug('Serial port error: ', error)
        this.send(new SerialError(error, 'Serial port error.'))
    }

    private portOpenHandler = (): void => {
        debug('Serial port open event.')
        this.sendStatus()
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
        this.send(new SerialStatus(this.isOpen, this.device))
    }
}
