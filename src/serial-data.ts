// The client expects raw measurements from the balance to look like this.
export interface ISerialData {
    data: string  // Raw instrument data
}

export class SerialData implements ISerialData {
    constructor(public data:string) {
    }
}
