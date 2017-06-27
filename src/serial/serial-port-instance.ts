import { ISerialPortOptions } from "./serial-port-options"
const debug = require('debug')('Serial Port Instance')
const SerialPort = require('serialport')

export enum SerialPortState {
    closed,
    isClosing,
    isOpening,
    open,
}

export interface ISerialPortInstance {
    path: string
    state: SerialPortState

    close(): void
    open(device: string): void
}

export class SerialPortInstance implements ISerialPortInstance {
    private port: any = null
    private _path: string = ""
    private _state: SerialPortState = SerialPortState.closed

    constructor(private portOptions: ISerialPortOptions,
                private portStateChange: () => void,
                private portData: (data: string) => void,
                private portError: (title: string, message: string) => void) {
    }

    public close = (): void => {
        if (this.state !== SerialPortState.open) return

        this._state = SerialPortState.isClosing
        // TODO: Implement timeout to catch failures?
        this.port.close()
    }

    public open = (device: string): void => {
        if (this.state !== SerialPortState.closed) return

        this._state = SerialPortState.isOpening

        debug('Opening serial port with options: ', this.portOptions)
        this._path = device

        this.port = new SerialPort(this.path, this.portOptions)
        this.port.on('close', this.portCloseHandler)
        this.port.on('data', this.portDataHandler)
        this.port.on('disconnect', this.portDisconnectHandler)
        this.port.on('error', this.portErrorHandler)
        this.port.on('open', this.portOpenHandler)
        // TODO: Implement timeout to catch failures?
    }

    public get path(): string {
        return this._path
    }

    public get state(): SerialPortState {
        return this._state
    }

    private portCloseHandler = (): void => {
        debug('Serial port close event.')
        this._state = SerialPortState.closed
        this._path = ''
        this.portStateChange()
    }

    private portDataHandler = (data: string): void => {
        if (/^\s*$/.test(data)) {
            debug('Ignoring spurious blank line.')
            return
        }

        debug('Serial port data event:', data)
        this.portData(data)
    }

    private portDisconnectHandler = (): void => {
        this.portError('Disconnect', 'The serial port was unexpectedly disconnected.')
    }

    private portErrorHandler = (error: any): void => {
        debug('Serial port error: ', error)
        if (this.state === SerialPortState.isOpening) {
            this._state = SerialPortState.closed
            this.portError('Failed to open serial port.', error && error.message || '')
            this.portStateChange()
            this.port = null
            return
        }

        if (this.state === SerialPortState.isClosing) {
            this._state = SerialPortState.closed
            this.portError('Failed to close serial port.', error && error.message || '')
            this.portStateChange()
            this.port = null
            return
        }

        this.portError('Serial port error.', error && error.message || '')
    }

    private portOpenHandler = (): void => {
        debug('Serial port open event.')
        this._state = SerialPortState.open
        this.portStateChange()
    }
}

