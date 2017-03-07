// The client expects the list command to provide an array of these objects.
export interface ISerialPortResponse {
    device: string // Name of the device, which can be passed to the "connect" command.
    vendor: string // Vendor name
    vendorId: string // Vendor numeric ID.
    productId: string // Product name
    connected: boolean // This is `true` if the server is currently connected to this device.
    prefer: boolean // This is `true` if this is an FTDI serial port, which suggests it may be an Ohaus balance.
}

export class SerialPortResponse implements ISerialPortResponse {
    public device: string // Name of the device, which can be passed to the "connect" command.
    public vendor: string // Vendor name
    public vendorId: string // Vendor numeric ID.
    public productId: string // Product name
    public connected: boolean // This is `true` if the server is currently connected to this device.
    public prefer: boolean // This is `true` if this is an FTDI serial port, which suggests it may be an Ohaus balance.
    
    constructor(port: any, connected: boolean, prefer: boolean) {
        this.device = port.comName
        this.vendor = port.manufacturer || null
        this.vendorId = port.vendorId || null
        this.productId = port.productId || null
        this.connected = connected
        this.prefer = prefer
    }
}
