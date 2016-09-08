"use strict";
/// <reference path="./api.d.ts" />
const rxjs_1 = require("rxjs");
const debug = require('debug')('balance');
const SerialPort = require("serialport");
////////////////////////////////////////////////////////////////////////////////
//
// Wrapper for the SerialPort object, pushing messages out through RxJS.
//
////////////////////////////////////////////////////////////////////////////////
class SerialPortPublisher {
    constructor() {
        this.close = () => {
            if (this.isOpen)
                this.port.close();
            this.port = null;
        };
        this.list = () => {
            SerialPort.list((error, data) => {
                if (error) {
                    debug("Received error from SerialPort.list: ", error);
                    this.sendError(error, "Received error from SerialPort.list: ");
                    return;
                }
                debug("Received data from SerialPort.list: ", data);
                if (!data)
                    data = [];
                let result = data.map(port => this.listToResponse(port));
                debug("result: ", result);
                this.publisher.next({
                    list: result
                });
            });
        };
        this.open = (device) => {
            if (!device) {
                this.sendError(null, "open() didn't receive a device.");
                return;
            }
            debug("Doing a close() to be sure things are OK.");
            this.close();
            debug("Opening serial port with options: ", this.portOptions);
            this.port = new SerialPort(device, this.portOptions);
            this.port.on('close', this.portCloseHandler);
            this.port.on('data', this.portDataHandler);
            this.port.on('disconnect', this.close);
            this.port.on('error', this.portErrorHandler);
            this.port.on('open', this.portOpenHandler);
        };
        this.sendData = (data) => {
            this.publisher.next({
                data: data
            });
        };
        this.sendError = (error, message) => {
            this.publisher.next({
                error: !error ? null : error.toString(),
                message: message || null
            });
        };
        this.sendStatus = () => {
            this.publisher.next({
                connected: this.isOpen,
                device: this.device
            });
        };
        ////////////////////////////////////////
        //
        // Handlers
        //
        ////////////////////////////////////////
        this.portCloseHandler = () => {
            debug("Serial port close event.");
            this.sendStatus();
        };
        this.portDataHandler = (data) => {
            debug("Serial port data event:", data);
            this.sendData(data);
        };
        this.portErrorHandler = (error) => {
            debug("Serial port error: ", error);
            this.sendError(error, "Serial port error.");
        };
        this.portOpenHandler = () => {
            debug("Serial port open event.");
            this.sendStatus();
        };
        ////////////////////////////////////////
        //
        // Private
        //
        ////////////////////////////////////////
        this.isDeviceConnected = (device) => {
            return device === this.device && this.isOpen;
        };
        this.isDevicePreferred = (vendorId) => {
            return this.ftdiRegex instanceof RegExp && this.ftdiRegex.test(vendorId);
        };
        this.listToResponse = (port) => {
            if (!port.vendorId && port.pnpId) {
                const pnpRegex = /VID_0403/;
                if (pnpRegex.test(port.pnpId))
                    port.vendorId = "0x0403";
            }
            return {
                device: port.comName,
                vendor: port.manufacturer || null,
                vendorId: port.vendorId || null,
                productId: port.productId || null,
                connected: this.isDeviceConnected(port.comName),
                prefer: this.isDevicePreferred(port.vendorId)
            };
        };
        this.ftdiRegex = /0x0403/; // FTDI manufacturer ID
        this.port = null;
        // These are common defaults for an Ohaus balance
        this.portOptions = {
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            parser: SerialPort.parsers.readline('\n')
        };
        // This is a hot stream.
        this.publisher = new rxjs_1.Subject();
    }
    get device() {
        return this.port && this.port.path;
    }
    get isOpen() {
        // Use !! to force a boolean result.
        return !!(this.port && this.port.isOpen());
    }
}
exports.SerialPortPublisher = SerialPortPublisher;
//# sourceMappingURL=serial-port-publisher.js.map