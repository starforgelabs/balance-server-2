import { IPacket } from "./packet"
import { PacketType } from './packet-type'

////////////////////////////////////////////////////////////////////////////////
//
// A command is sent to the server from the client using this format.
//
////////////////////////////////////////////////////////////////////////////////

export interface ICommandPacket {
    command: string
    device?: string
    data?: string
}

export class CommandPacket implements ICommandPacket, IPacket {
    public packetType: PacketType = PacketType.Command

    public sequence: number
    public connectionId: string

    public command: string
    public device: string | undefined
    public data: string | undefined
}

