import { IPacket } from "./packet"
import { PacketType } from './packet-type'

////////////////////////////////////////////////////////////////////////////////
//
// Miscellaneous packets are for debugging.
//
////////////////////////////////////////////////////////////////////////////////

export interface IMiscellaneousPacket {
    message: string
}

export class MiscellaneousPacket implements IMiscellaneousPacket, IPacket {
    public packetType: PacketType = PacketType.Miscellaneous

    public sequence: number
    public connectionId: string

    constructor(public message: string = '') {
    }
}
