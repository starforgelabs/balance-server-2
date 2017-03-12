import { IPacketType, PacketType } from './packet-type'

// The client expects raw measurements from the balance to look like this.
export interface ISerialData {
    data: string  // Raw instrument data
}

export class SerialData implements ISerialData, IPacketType {
    public packetType: PacketType = PacketType.Data
    constructor(public data: string) {
    }
}
