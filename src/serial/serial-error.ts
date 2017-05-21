import { IPacket } from "./packet"
import { PacketType } from './packet-type'

////////////////////////////////////////////////////////////////////////////////
//
// Error messages are sent to the client in this format.
//
////////////////////////////////////////////////////////////////////////////////

export interface ISerialError {
    error: string
    message: string
}

export class SerialError implements ISerialError, IPacket {
    public packetType: PacketType = PacketType.Error
    public error: string
    public message: string

    public sequence: number
    public connectionId: string

    constructor(error: string, message: string = null) {
        this.error = !error ? null : error.toString()
        this.message = message || null
    }
}
