import { IPacketType, PacketType } from './packet-type'

// The client expects to receive connection information in this format.
export interface ISerialStatus {
    connected: boolean, // This is `true` if the server is connected to a serial port.
    device: string // This is null if not connected. If connected, this is the name of the serial device.
}

export class SerialStatus implements ISerialStatus, IPacketType {
    public packetType: PacketType = PacketType.Status
    constructor(public connected: boolean, public device: string) {
    }
}
