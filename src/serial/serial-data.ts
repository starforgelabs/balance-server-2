import { IPacket } from "./packet"
import { PacketType } from './packet-type'

////////////////////////////////////////////////////////////////////////////////
//
// Raw instrument data is sent to the client in this format.
//
////////////////////////////////////////////////////////////////////////////////

export interface ISerialData {
    data: string  // Raw instrument data
}

export class SerialData implements ISerialData, IPacket {
    public packetType: PacketType = PacketType.Data

    public sequence: number
    public connectionId: string

    constructor(public data: string) {
    }
}
