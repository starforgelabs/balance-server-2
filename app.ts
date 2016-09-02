// This is for the ES6 Map() class.
/// <reference path="typings/typescript/lib.es6.d.ts"/>
/// <reference path="typings/node/node.d.ts" />
/// <reference path="node_modules/rxjs/Rx.d.ts" />

const debug_app = require('debug')('app')
const debug_balance = require('debug')('balance')
const debug_socket = require('debug')('websocket')

const SerialPort = require("serialport")
const WS = require("ws")
const Rx = require('rxjs')

// The list command from the server expects an array of data  with this format.
interface SerialPortResponse {
    device: string,
    vendor: string,
    vendorId: string,
    productId: string,
    connected: boolean,
    prefer: boolean
}

// SerialPort.list returns an array of data with this format.
interface SerialPortMetadata {
    comName: string,
    manufacturer: string,
    serialNumber: string,
    pnpId: string,
    locationId: string,
    vendorId: string,
    productId: string
}

////////////////////////////////////////////////////////////////////////////////
//
// Wrapper for the SerialPort object, pushing messages out through RxJS.
//
////////////////////////////////////////////////////////////////////////////////

class SerialPortPublisher {
    public publisher: any
    private port: any
    private portOptions: any

    constructor() {
        this.port = null

        // These are common defaults for an Ohaus balance
        this.portOptions = {
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            parser: SerialPort.parsers.readline('\n')
        }

        // This is a hot stream.
        this.publisher = new Rx.Subject()
    }

    public close = () => {
        if (this.isOpen)
            this.port.close()

        this.port = null
    }

    public get device(): string {
        return this.port && this.port.path
    }

    public get isOpen(): boolean {
        return this.port && this.port.isOpen()
    }

    public open = (device) => {
        if (!device) {
            debug_balance("open() didn't receive a device.")
            this.publisher.next({
                command: "connect",
                error: "No device specified.",
                noDevice: true
            })
            return
        }

        debug_balance("Doing a close() to be sure things are OK.")
        this.close()

        debug_balance("Opening serial port with options: ", this.portOptions)
        this.port = new SerialPort(device, this.portOptions)
        this.port.on('close', this.portCloseHandler)
        this.port.on('data', this.portDataHandler)
        this.port.on('disconnect', this.close)
        this.port.on('error', this.portErrorHandler)
        this.port.on('open', this.portOpenHandler)
    }

    private portCloseHandler = () => {
        debug_balance("Serial port close event.")
        this.status()
    }

    private portDataHandler = (data) => {
        debug_balance("Serial port data event:", data)
        this.publisher.next({
            data: data
        })
    }

    private portErrorHandler = (error) => {
        debug_balance("Serial port error: ", error)
        this.publisher.next({
            error: error
        })
    }

    private portOpenHandler = () => {
        debug_balance("Serial port open event.")
        this.status()
    }

    public status = () => {
        this.publisher.next({
            connected: this.isOpen,
            device: this.device
        })
    }
}


////////////////////////////////////////////////////////////////////////////////
//
// Serial port singleton
//
////////////////////////////////////////////////////////////////////////////////

const serialPortSingleton = new SerialPortPublisher()


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

class BalanceProxy {
    private ftdiRegex: any
    private subscription: any

    constructor(private connection: any, private serial: SerialPortPublisher) {
        this.ftdiRegex = /0x0403/ // FTDI manufacturer ID
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

    public list = () => {
        SerialPort.list((error: any, data: Array<SerialPortMetadata>) => {
                if (error) {
                    debug_app("Received error from SerialPort.list: " + error)
                    this.send({
                        command: "list",
                        error: error.toString()
                    })
                    return
                }

                debug_app("Received data from SerialPort.list: ", data)
                if (!data) data = []

                let result = data.map(port => this.listToResponse(port))
                debug_app("result: ", result)

                this.send({
                    list: result
                })

            }
        )
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
        debug_socket("WebSocket connection closed.")
    }

    public errorWebSocketHandler = (error) => {
        debug_socket("WebSocket connection error: ", error)
    }

    public messageWebSocketHandler = (message) => {
        let receivedJson: any
        try {
            receivedJson = JSON.parse(message)
        } catch (e) {
            debug_socket("Failed to parse JSON from WebSocket: ", e.message)
            return
        }

        if (!receivedJson.command) {
            debug_socket("JSON from WebSocket does not have the required `command` attribute.")
            return
        }

        if (receivedJson.command === "list")
            this.list()

        else if (receivedJson.command === "connect")
            this.serial.open(receivedJson.device)

        else if (receivedJson.command === "disconnect")
            this.serial.close()

        else if (receivedJson.command === "status")
            this.serial.status()
    }

    public send = (json: any) => {
        try {
            this.connection.send(JSON.stringify(json))
        }
        catch (e) {
            debug_socket("Failed to send data to client: ", e.message)
        }
    }

    ////////////////////////////////////////
    //
    // Private
    //
    ////////////////////////////////////////

    private isDeviceConnected(device: string): boolean {
        return device === this.serial.device && this.serial.isOpen
    }

    private isDevicePreferred(vendorId: string): boolean {
        return this.ftdiRegex instanceof RegExp && this.ftdiRegex.test(vendorId)
    }

    private listToResponse(port: SerialPortMetadata): SerialPortResponse {
        if (!port.vendorId && port.pnpId) {
            const pnpRegex = /VID_0403/
            if (pnpRegex.test(port.pnpId))
                port.vendorId = "0x0403"
        }

        return {
            device: port.comName,
            vendor: port.manufacturer || null,
            vendorId: port.vendorId || null,
            productId: port.productId || null,
            connected: this.isDeviceConnected(port.comName),
            prefer: this.isDevicePreferred(port.vendorId)
        }
    }
}


////////////////////////////////////////////////////////////////////////////////
//
// Start up the WebSocket server.
//
////////////////////////////////////////////////////////////////////////////////

const PORT = 3333
const server = new WS.Server({port: PORT})

server.on("connection", (connection) => {
    const balanceServer = new BalanceProxy(connection, serialPortSingleton)
    debug_socket("Connection received.")

    // Trap the balanceServer instance in the following closures:

    connection.on("close", () => {
        balanceServer.closeWebSocketHandler()
    })

    connection.on("error", (error) => {
        balanceServer.errorWebSocketHandler(error)
    })

    connection.on("message", (message) => {
        debug_socket("Message" + message)
        balanceServer.messageWebSocketHandler(message)
    })
})

server.on("error", (error) => {
    debug_socket("Error event: ", error)
})

