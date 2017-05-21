import { IPacket } from "./packet"
import { ISerialPortResponse } from './serial-port-response'
import { PacketType } from './packet-type'

////////////////////////////////////////////////////////////////////////////////
//
// Lists of detected serial ports are sent to the client in this format.
//
////////////////////////////////////////////////////////////////////////////////

export interface ISerialList {
    list: Array<ISerialPortResponse>
}

export class SerialList implements ISerialList, IPacket {
    public packetType: PacketType = PacketType.List

    public sequence: number
    public connectionId: string

    constructor(public list: Array<ISerialPortResponse>) {
    }
}
