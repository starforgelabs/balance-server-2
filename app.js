// This is for the ES6 Map() class.
/// <reference path="typings/typescript/lib.es6.d.ts"/>
/// <reference path="typings/node/node.d.ts" />
/// <reference path="node_modules/rxjs/Rx.d.ts" />
var debug_app = require('debug')('app');
var debug_balance = require('debug')('balance');
var debug_socket = require('debug')('websocket');
var SerialPort = require("serialport");
var WS = require("ws");
var Rx = require('rxjs');
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
        this.open = function (device) {
            if (!device) {
                debug_balance("open() didn't receive a device.");
                _this.publisher.next({
                    command: "connect",
                    error: "No device specified.",
                    noDevice: true
                });
                return;
            }
            debug_balance("Doing a close() to be sure things are OK.");
            _this.close();
            debug_balance("Opening serial port with options: ", _this.portOptions);
            _this.port = new SerialPort(device, _this.portOptions);
            _this.port.on('close', _this.portCloseHandler);
            _this.port.on('data', _this.portDataHandler);
            _this.port.on('disconnect', _this.close);
            _this.port.on('error', _this.portErrorHandler);
            _this.port.on('open', _this.portOpenHandler);
        };
        this.portCloseHandler = function () {
            debug_balance("Serial port close event.");
            _this.status();
        };
        this.portDataHandler = function (data) {
            debug_balance("Serial port data event:", data);
            _this.publisher.next({
                data: data
            });
        };
        this.portErrorHandler = function (error) {
            debug_balance("Serial port error: ", error);
            _this.publisher.next({
                error: error
            });
        };
        this.portOpenHandler = function () {
            debug_balance("Serial port open event.");
            _this.status();
        };
        this.status = function () {
            _this.publisher.next({
                connected: _this.isOpen,
                device: _this.device
            });
        };
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
        this.publisher = new Rx.Subject();
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
    return SerialPortPublisher;
}());
////////////////////////////////////////////////////////////////////////////////
//
// Serial port singleton
//
////////////////////////////////////////////////////////////////////////////////
var serialPortSingleton = new SerialPortPublisher();
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
var BalanceProxy = (function () {
    function BalanceProxy(connection, serial) {
        var _this = this;
        this.connection = connection;
        this.serial = serial;
        ////////////////////////////////////////
        //
        // Balance methods
        //
        ////////////////////////////////////////
        this.balanceNext = function (data) {
            _this.send(data);
        };
        this.list = function () {
            SerialPort.list(function (error, data) {
                if (error) {
                    debug_app("Received error from SerialPort.list: " + error);
                    _this.send({
                        command: "list",
                        error: error.toString()
                    });
                    return;
                }
                debug_app("Received data from SerialPort.list: ", data);
                if (!data)
                    data = [];
                var result = data.map(function (port) { return _this.listToResponse(port); });
                debug_app("result: ", result);
                _this.send({
                    list: result
                });
            });
        };
        this.subscribe = function () {
            if (!_this.subscription)
                _this.subscription = _this.serial.publisher.subscribe(_this.balanceNext);
        };
        this.unsubscribe = function () {
            if (_this.subscription)
                _this.subscription.unsubscribe();
        };
        ////////////////////////////////////////
        //
        // WebSocket methods
        //
        ////////////////////////////////////////
        this.closeWebSocketHandler = function () {
            debug_socket("WebSocket connection closed.");
        };
        this.errorWebSocketHandler = function (error) {
            debug_socket("WebSocket connection error: ", error);
        };
        this.messageWebSocketHandler = function (message) {
            var receivedJson;
            try {
                receivedJson = JSON.parse(message);
            }
            catch (e) {
                debug_socket("Failed to parse JSON from WebSocket: ", e.message);
                return;
            }
            if (!receivedJson.command) {
                debug_socket("JSON from WebSocket does not have the required `command` attribute.");
                return;
            }
            if (receivedJson.command === "list")
                _this.list();
            else if (receivedJson.command === "connect")
                _this.serial.open(receivedJson.device);
            else if (receivedJson.command === "disconnect")
                _this.serial.close();
            else if (receivedJson.command === "status")
                _this.serial.status();
        };
        this.send = function (json) {
            try {
                _this.connection.send(JSON.stringify(json));
            }
            catch (e) {
                debug_socket("Failed to send data to client: ", e.message);
            }
        };
        this.ftdiRegex = /0x0403/; // FTDI manufacturer ID
        this.subscription = null;
        this.subscribe();
    }
    ////////////////////////////////////////
    //
    // Private
    //
    ////////////////////////////////////////
    BalanceProxy.prototype.isDeviceConnected = function (device) {
        return device === this.serial.device && this.serial.isOpen;
    };
    BalanceProxy.prototype.isDevicePreferred = function (vendorId) {
        return this.ftdiRegex instanceof RegExp && this.ftdiRegex.test(vendorId);
    };
    BalanceProxy.prototype.listToResponse = function (port) {
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
    return BalanceProxy;
}());
////////////////////////////////////////////////////////////////////////////////
//
// Start up the WebSocket server.
//
////////////////////////////////////////////////////////////////////////////////
var PORT = 3333;
var server = new WS.Server({ port: PORT });
server.on("connection", function (connection) {
    var balanceServer = new BalanceProxy(connection, serialPortSingleton);
    debug_socket("Connection received.");
    // Trap the balanceServer instance in the following closures:
    connection.on("close", function () {
        balanceServer.closeWebSocketHandler();
    });
    connection.on("error", function (error) {
        balanceServer.errorWebSocketHandler(error);
    });
    connection.on("message", function (message) {
        debug_socket("Message" + message);
        balanceServer.messageWebSocketHandler(message);
    });
});
server.on("error", function (error) {
    debug_socket("Error event: ", error);
});
//# sourceMappingURL=app.js.map