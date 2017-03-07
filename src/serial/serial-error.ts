// The client expects error messages to look like this.
export interface ISerialError {
    error: string
    message: string
}

export class SerialError implements ISerialError {
    public error: string
    public message:string

    constructor(error: string, message:string = null) {
        this.error = !error ? null : error.toString()
        this.message = message || null
    }
}
