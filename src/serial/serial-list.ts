import { IPacketType, PacketType } from './packet-type'
import { ISerialPortResponse } from './serial-port-response'

// The client expects a list of detected serial ports to look like this.
export interface ISerialList {
    list: Array<ISerialPortResponse>
}

export class SerialList implements ISerialList, IPacketType {
    public packetType: PacketType = PacketType.List
    constructor(public list: Array<ISerialPortResponse>) {
    }
}
