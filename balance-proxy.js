"use strict";
const debug = require('debug')('proxy');
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
    constructor(connection, serial) {
        this.connection = connection;
        this.serial = serial;
        ////////////////////////////////////////
        //
        // Balance methods
        //
        ////////////////////////////////////////
        this.balanceNext = (data) => {
            this.send(data);
        };
        this.subscribe = () => {
            if (!this.subscription)
                this.subscription = this.serial.publisher.subscribe(this.balanceNext);
        };
        this.unsubscribe = () => {
            if (this.subscription)
                this.subscription.unsubscribe();
        };
        ////////////////////////////////////////
        //
        // WebSocket methods
        //
        ////////////////////////////////////////
        this.closeWebSocketHandler = () => {
            this.unsubscribe();
            debug("WebSocket connection closed.");
        };
        this.errorWebSocketHandler = (error) => {
            debug("WebSocket connection error: ", error);
        };
        this.messageWebSocketHandler = (message) => {
            let receivedJson;
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
                this.serial.list();
            else if (receivedJson.command === "connect" ||
                receivedJson.command === "open")
                this.serial.open(receivedJson.device);
            else if (receivedJson.command === "disconnect" ||
                receivedJson.command === "close")
                this.serial.close();
            else if (receivedJson.command === "status")
                this.serial.sendStatus();
        };
        this.send = (json) => {
            try {
                this.connection.send(JSON.stringify(json));
            }
            catch (e) {
                debug("Failed to send data to client: ", e.message);
            }
        };
        this.subscription = null;
        this.subscribe();
    }
}
exports.BalanceProxy = BalanceProxy;
//# sourceMappingURL=balance-proxy.js.map