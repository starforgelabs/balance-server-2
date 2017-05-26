////////////////////////////////////////////////////////////////////////////////
//
// When a packet goes across the WebSocket connection, the packetType
// field indicates the packet's purpose.
//
////////////////////////////////////////////////////////////////////////////////

// !!!!!!! IMPORTANT !!!!!!!
//
// These values must be kept in sync with the web app.
export enum PacketType {
    // Client side
    WebSocketConnection = 1,
    Miscellaneous = 2,
    Command = 3,

    // Serial Port
    Data = 11,
    Error = 12,
    List = 13,
    Status = 14
}

