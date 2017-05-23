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
    public message: string

    public sequence: number
    public connectionId: string

    constructor(message: string = null) {
        this.message = message || null
    }
}
