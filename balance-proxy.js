"use strict";
var debug = require('debug')('proxy');
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
            debug("WebSocket connection closed.");
        };
        this.errorWebSocketHandler = function (error) {
            debug("WebSocket connection error: ", error);
        };
        this.messageWebSocketHandler = function (message) {
            var receivedJson;
            try {
                receivedJson = JSON.parse(message);
            }
            catch (e) {
                debug("Failed to parse JSON from WebSocket: ", e.message);
                return;
            }
            if (!receivedJson.command) {
                debug("JSON from WebSocket does not have the required `command` attribute.");
                return;
            }
            if (receivedJson.command === "list")
                _this.serial.list();
            else if (receivedJson.command === "connect")
                _this.serial.open(receivedJson.device);
            else if (receivedJson.command === "disconnect")
                _this.serial.close();
            else if (receivedJson.command === "status")
                _this.serial.sendStatus();
        };
        this.send = function (json) {
            try {
                _this.connection.send(JSON.stringify(json));
            }
            catch (e) {
                debug("Failed to send data to client: ", e.message);
            }
        };
        this.subscription = null;
        this.subscribe();
    }
    return BalanceProxy;
}());
exports.BalanceProxy = BalanceProxy;
//# sourceMappingURL=balance-proxy.js.map