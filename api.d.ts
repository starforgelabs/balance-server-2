// The client expects port status messages to look like this.
interface SerialData {
    data: string
}

// The client expects error messages to look like this.
interface SerialError {
    error: string
    message: string
}

// The client expects the list command to provide this interface.
interface SerialPortResponse {
    device: string,
    vendor: string,
    vendorId: string,
    productId: string,
    connected: boolean,
    prefer: boolean
}

// The client expects port status messages to look like this.
interface SerialList {
    list: Array<SerialPortResponse>
}

// The client expects port status messages to look like this.
interface SerialStatus {
    connected: boolean,
    device: string
}


