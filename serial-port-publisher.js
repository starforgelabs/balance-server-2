"use strict";
/// <reference path="./api.d.ts" />
var rxjs_1 = require("rxjs");
var debug = require('debug')('balance');
var SerialPort = require("serialport");
////////////////////////////////////////////////////////////////////////////////
//
// Wrapper for the SerialPort object, pushing messages out through RxJS.
//
////////////////////////////////////////////////////////////////////////////////
var SerialPortPublisher = (function () {
    function SerialPortPublisher() {
        var _this = this;
        this.close = function () {
            if (_this.isOpen)
                _this.port.close();
            _this.port = null;
        };
        this.list = function () {
            SerialPort.list(function (error, data) {
                if (error) {
                    debug("Received error from SerialPort.list: ", error);
                    _this.sendError(error, "Received error from SerialPort.list: ");
                    return;
                }
                debug("Received data from SerialPort.list: ", data);
                if (!data)
                    data = [];
                var result = data.map(function (port) { return _this.listToResponse(port); });
                debug("result: ", result);
                _this.publisher.next({
                    list: result
                });
            });
        };
        this.open = function (device) {
            if (!device) {
                _this.sendError(null, "open() didn't receive a device.");
                return;
            }
            debug("Doing a close() to be sure things are OK.");
            _this.close();
            debug("Opening serial port with options: ", _this.portOptions);
            _this.port = new SerialPort(device, _this.portOptions);
            _this.port.on('close', _this.portCloseHandler);
            _this.port.on('data', _this.portDataHandler);
            _this.port.on('disconnect', _this.close);
            _this.port.on('error', _this.portErrorHandler);
            _this.port.on('open', _this.portOpenHandler);
        };
        this.sendData = function (data) {
            _this.publisher.next({
                data: data
            });
        };
        this.sendError = function (error, message) {
            _this.publisher.next({
                error: error.toString(),
                message: message || null
            });
        };
        this.sendStatus = function () {
            _this.publisher.next({
                connected: _this.isOpen,
                device: _this.device
            });
        };
        ////////////////////////////////////////
        //
        // Handlers
        //
        ////////////////////////////////////////
        this.portCloseHandler = function () {
            debug("Serial port close event.");
            _this.sendStatus();
        };
        this.portDataHandler = function (data) {
            debug("Serial port data event:", data);
            _this.sendData(data);
        };
        this.portErrorHandler = function (error) {
            debug("Serial port error: ", error);
            _this.sendError(error, "Serial port error.");
        };
        this.portOpenHandler = function () {
            debug("Serial port open event.");
            _this.sendStatus();
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
    Object.defineProperty(SerialPortPublisher.prototype, "device", {
        get: function () {
            return this.port && this.port.path;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SerialPortPublisher.prototype, "isOpen", {
        get: function () {
            return this.port && this.port.isOpen();
        },
        enumerable: true,
        configurable: true
    });
    ////////////////////////////////////////
    //
    // Private
    //
    ////////////////////////////////////////
    SerialPortPublisher.prototype.isDeviceConnected = function (device) {
        return device === this.device && this.isOpen;
    };
    SerialPortPublisher.prototype.isDevicePreferred = function (vendorId) {
        return this.ftdiRegex instanceof RegExp && this.ftdiRegex.test(vendorId);
    };
    SerialPortPublisher.prototype.listToResponse = function (port) {
        if (!port.vendorId && port.pnpId) {
            var pnpRegex = /VID_0403/;
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
    return SerialPortPublisher;
}());
exports.SerialPortPublisher = SerialPortPublisher;
//# sourceMappingURL=serial-port-publisher.js.map