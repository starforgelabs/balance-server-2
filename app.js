/// <reference path="typings/node/node.d.ts" />
/// <reference path="node_modules/rxjs/Rx.d.ts" />
"use strict";
/// <reference path="./api.d.ts" />
var balance_proxy_1 = require('./balance-proxy');
var serial_port_publisher_1 = require('./serial-port-publisher');
var debug = require('debug')('app');
var nconf = require('nconf');
var WS = require("ws");
////////////////////////////////////////////////////////////////////////////////
//
// Configuration
//
////////////////////////////////////////////////////////////////////////////////
nconf.argv().env().defaults({
    'port': 3333
});
////////////////////////////////////////////////////////////////////////////////
//
// Serial port singleton
//
// We will connect to *one* balance and publish data from it to all connections.
//
////////////////////////////////////////////////////////////////////////////////
var serialPortSingleton = new serial_port_publisher_1.SerialPortPublisher();
////////////////////////////////////////////////////////////////////////////////
//
// Start up the WebSocket server.
//
////////////////////////////////////////////////////////////////////////////////
var port = nconf.get('port');
debug("Listening on port " + port);
var server = new WS.Server({ port: port });
server.on("connection", function (connection) {
    var balanceServer = new balance_proxy_1.BalanceProxy(connection, serialPortSingleton);
    debug("Connection received.");
    // Trap the balanceServer instance in the following closures:
    connection.on("close", function () {
        balanceServer.closeWebSocketHandler();
    });
    connection.on("error", function (error) {
        balanceServer.errorWebSocketHandler(error);
    });
    connection.on("message", function (message) {
        debug("Message" + message);
        balanceServer.messageWebSocketHandler(message);
    });
});
server.on("error", function (error) {
    debug("Error event: ", error);
});
//# sourceMappingURL=app.js.map