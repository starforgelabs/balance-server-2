// The client expects raw measurements from the balance to look like this.
interface SerialData {
    data: string  // Raw instrument data
}

// The client expects error messages to look like this.
interface SerialError {
    error: string
    message: string
}

// The client expects the list command to provide an array of these objects.
interface SerialPortResponse {
    device: string, // Name of the device, which can be passed to the "connect" command.
    vendor: string, // Vendor name
    vendorId: string, // Vendor numeric ID.
    productId: string, // Product name
    connected: boolean, // This is `true` if the server is currently connected to this device.
    prefer: boolean // This is `true` if this is an FTDI serial port, which suggests it may be an Ohaus balance.
}

// The client expects a list of detected serial ports to look like this.
interface SerialList {
    list: Array<SerialPortResponse>
}

// The client expects to receive connection information in this format.
interface SerialStatus {
    connected: boolean, // This is `true` if the server is connected to a serial port.
    device: string // This is null if not connected. If connected, this is the name of the serial device.
}


