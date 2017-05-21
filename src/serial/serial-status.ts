import { IPacket } from "./packet"
import { PacketType } from './packet-type'

////////////////////////////////////////////////////////////////////////////////
//
// The status of the serial port connection is sent to the client in this format.
//
////////////////////////////////////////////////////////////////////////////////

export interface ISerialStatus {
    // This is `true` if the server is connected to a serial port.
    connected: boolean,
    // This is null if not connected.
    // If connected, this is the name of the serial device.
    device: string
}

export class SerialStatus implements ISerialStatus, IPacket {
    public packetType: PacketType = PacketType.Status

    public sequence: number
    public connectionId: string

    constructor(public connected: boolean, public device: string) {
    }
}
