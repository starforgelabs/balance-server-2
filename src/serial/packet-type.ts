export enum PacketType {
    // Client side
    WebSocketConnection = 1,

    // Serial Port
    Data = 11,
    Error = 12,
    List = 13,
    Status = 14
}

export interface IPacketType {
    packetType: PacketType
}
