import { IPacket } from "./packet"
import { PacketType } from './packet-type'

////////////////////////////////////////////////////////////////////////////////
//
// Error messages are sent to the client in this format.
//
////////////////////////////////////////////////////////////////////////////////

export interface IErrorPacket {
    error: string
    message: string
}

export class ErrorPacket implements IErrorPacket, IPacket {
    public packetType: PacketType = PacketType.Error
    public error: string
    public message: string

    public sequence: number
    public connectionId: string

    constructor(error: string, message: string = '') {
        this.error = !error ? '' : error.toString()
        this.message = message || ''
    }
}
