import { Subject } from 'rxjs'

import { OhausBalanceOptions } from './ohaus-balance-options'
import { ISerialData, SerialData } from './serial/serial-data'
import { ISerialError, SerialError } from './serial/serial-error'
import { SerialList } from './serial/serial-list'
import { ISerialPortMetadata } from './serial/serialport-metadata'
import { ISerialPortOptions } from './serial/serial-port-options'
import { ISerialPortResponse, SerialPortResponse } from './serial/serial-port-response'
import { ISerialStatus, SerialStatus } from './serial/serial-status'

const debug = require('debug')('app:balance')
const SerialPort = require('serialport')

////////////////////////////////////////////////////////////////////////////////
//
// Wrapper for the SerialPort object, pushing messages out through RxJS.
//
////////////////////////////////////////////////////////////////////////////////

const DEBOUNCE_DELAY = 800 // mS

export class SerialPortPublisher {
    private ftdiRegex: RegExp
    private port: any
    private portOptions: ISerialPortOptions
    public publisher: Subject<any>

    // Used to pre-process data events before sending them to the WebSocket client.
    private dataStream: Subject<any>

    constructor() {
        this.ftdiRegex = /0403/ // FTDI manufacturer ID
        this.port = null

        // These are common defaults for an Ohaus balance
        this.portOptions = new OhausBalanceOptions()

        // This is a hot stream.
        this.publisher = new Subject()
        this.initializeDataDebouncer()
    }

    public close = () => {
        if (this.isOpen) {
            this.send(new SerialStatus(false, this.device))
            this.port.close()
        }

        this.port = null
    }

    public get device(): string {
        return this.port && this.port.path || ""
    }

    private initializeDataDebouncer = () => {
        // This is a hot stream.
        this.dataStream = new Subject()

        // This debounces the data stream.
        this.dataStream.debounceTime(DEBOUNCE_DELAY)
            .subscribe(this.sendData)
    }

    public get isOpen(): boolean {
        // Use !! to force a boolean result.
        return !!(this.port && this.port.isOpen())
    }

    public list = () => {
        SerialPort.list((error: any, data: Array<ISerialPortMetadata>) => {
            if (error) {
                debug('Received error from SerialPort.list: ', error)
                this.sendError(error, 'Received error from SerialPort.list: ')
                return
            }

            debug('Received data from SerialPort.list: ', data)
            if (!data) data = []

            let result = data.map(port => this.listToResponse(port))
            debug('Transformed serial  port data: ', result)

            this.publisher.next(new SerialList(result))
        })
    }

    public open = (device) => {
        if (!device) {
            this.sendError(null, `open() didn't receive a device.`)
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

    private send = (packet: any): void => {
        this.publisher.next(packet)
        debug('Sending packet: ', packet)
    }

    public sendData = (data: string): void => {
        this.send(new SerialData(data))
    }

    public sendError = (error: any, message?: string): void => {
        this.send(new SerialError(error, message))
    }

    public sendStatus = (): void => {
        this.send(new SerialStatus(this.isOpen, this.device))
    }

    ////////////////////////////////////////
    //
    // Handlers
    //
    ////////////////////////////////////////

    private portCloseHandler = () => {
        debug('Serial port close event.')
        if (this.device !== "")
            this.sendStatus()
    }

    private portDataHandler = (data: string) => {
        debug('Serial port data event:', data)
        // Inject the data into the debouncer
        this.dataStream.next(data)
    }

    private portErrorHandler = (error) => {
        debug('Serial port error: ', error)
        this.sendError(error, 'Serial port error.')
    }

    private portOpenHandler = () => {
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
}
