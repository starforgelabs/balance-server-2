// The client expects to receive connection information in this format.
export interface ISerialStatus {
    connected: boolean, // This is `true` if the server is connected to a serial port.
    device: string // This is null if not connected. If connected, this is the name of the serial device.
}

export class SerialStatus implements SerialStatus {
    constructor(public connected: boolean, public device: string) {
    }
}