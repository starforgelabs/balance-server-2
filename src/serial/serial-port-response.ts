import { ISerialPortMetadata } from './serialport-metadata'

////////////////////////////////////////////////////////////////////////////////
//
// A detected serial port is sent to the client in this format.
//
////////////////////////////////////////////////////////////////////////////////

// The client expects the list command to provide an array of these objects.
export interface ISerialPortResponse {
    // Name of the device, which can be passed to the "connect" command.
    device: string
    vendor: string // Vendor name
    vendorId: string // Vendor numeric ID.
    productId: string // Product name
    // This is `true` if the server is currently connected to this device.
    connected: boolean
    // This is `true` if this is an FTDI serial port,
    // which suggests it may be an Ohaus balance.
    prefer: boolean
}

export class SerialPortResponse implements ISerialPortResponse {
    public device: string
    public vendor: string
    public vendorId: string
    public productId: string
    public connected: boolean
    public prefer: boolean

    constructor(port: ISerialPortMetadata, connected: boolean, prefer: boolean) {
        this.device = port.comName
        this.vendor = port.manufacturer || ''
        this.vendorId = port.vendorId || ''
        this.productId = port.productId || ''
        this.connected = connected
        this.prefer = prefer
    }
}
