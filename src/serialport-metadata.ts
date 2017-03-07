// SerialPort.list returns an array of data with this format.
export interface ISerialPortMetadata {
    comName: string,
    manufacturer: string,
    serialNumber: string,
    pnpId: string,
    locationId: string,
    vendorId: string,
    productId: string
}
