import { PacketType } from "./packet-type"

export interface IPacket {
    packetType: PacketType
    sequence: number
    connectionId: string
}
