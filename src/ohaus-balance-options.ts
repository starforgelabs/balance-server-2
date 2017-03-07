import {ISerialPortOptions} from './serial-port-options'

const SerialPort = require('serialport')

export class OhausBalanceOptions implements ISerialPortOptions {
    public baudRate: number
    public dataBits: number
    public stopBits: number
    public parity: string
    public parser: any
    
    constructor() {
        // These are common defaults for an Ohaus balance
        this.baudRate = 9600
        this.dataBits = 8
        this.stopBits = 1
        this.parity = 'none'
        this.parser = SerialPort.parsers.readline('\n')
    }
}
