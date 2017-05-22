import { IPacket } from "../packet"
import { IDiscordWebhookLogger } from "../../discord/discord-webhook-logger"
import { PacketType } from "../packet-type"
import { SerialDataPacket } from "../serial-data-packet"
import { ErrorPacket } from "../error-packet"
import { ISlackAttachment } from "../../discord/discord-webhook-logger"
import { SerialStatusPacket } from "../serial-status-packet"
import { ISerialListPacket, SerialListPacket } from "../serial-list-packet"

const debug = require('debug')('Packet Logger')

export interface IPacketLogger {
    name: string
    log(packet: IPacket): void
}


export class PacketLogger implements IPacketLogger {
    public name: string

    constructor(private webhook: IDiscordWebhookLogger) {
        this.name = 'R&D'
    }

    public log = (data: IPacket): void => {
        if (!data) {
            this.webhook.plainText('Tried to transmit an empty packet.')
            return
        }

        let type = PacketType[data.packetType]
        let value: string
        if (data.packetType == PacketType.Data)
            this.logDataPacket(data)
        else if (data.packetType == PacketType.Error)
            this.logErrorPacket(data)
        else if (data.packetType == PacketType.List)
            this.logListPacket(data)
        else if (data.packetType == PacketType.Status)
            this.logStatusPacket(data)
        else {
            let message = `${type}: ${value}`
            debug('Sending raw text to the webhook: ', message)
            this.webhook.plainText(`${this.name}: ${message}`)
        }
    }

    private logDataPacket = (data: IPacket): void => {
        let value: string = (<SerialDataPacket>data).data

        let attachments: ISlackAttachment[] = [{
            color: '#0f0',
            fields: [{
                title: 'Data',
                value: `\`${value}\``
            }],
            footer: this.getFooter(data)
        }]

        debug('Sending data packet to the webhook: ', attachments, this.name)
        this.webhook.rawSlack(attachments, this.name)
    }

    private logErrorPacket = (data: IPacket): void => {
        let value: string = (<ErrorPacket>data).message
        let error: string = (<ErrorPacket>data).error

        let attachments: ISlackAttachment[] = [{
            color: '#f00',
            fields: [{
                title: 'Error',
                value: `\`${value} - ${error}\``
            }],
            footer: this.getFooter(data)
        }]

        debug('Sending data packet to the webhook: ', attachments, this.name)
        this.webhook.rawSlack(attachments, this.name)
    }

    private logListPacket = (data: IPacket): void => {
        let list = (<SerialListPacket>data).list

        let attachments: ISlackAttachment[] = []
        for (let l of list) {
            let vendor = `${l.vendor} ${l.vendorId || ''} ${l.productId || ''}`

            let color = l.prefer ? '#f0f' : '#404'
            let state = l.connected ? ' (Connected) ' : ''

            let attachment: ISlackAttachment = {
                color: color,
                fields: [{
                    title: l.device,
                    value: `\`${state}${vendor}\``
                }],
                footer: this.getFooter(data)
            }

            attachments.push(attachment)
        }

        debug('Sending data packet to the webhook: ', attachments, this.name)
        this.webhook.rawSlack(attachments, this.name, 'List')
    }

    private logStatusPacket = (data: IPacket): void => {
        let connected: boolean = (<SerialStatusPacket>data).connected
        let device: string = (<SerialStatusPacket>data).device

        let color = connected ? '#0ff' : '#044'
        let state = connected ? `Connected: ${device}` : 'Disconnected'

        let attachments: ISlackAttachment[] = [{
            color: color,
            fields: [{
                title: 'Status',
                value: `\`${state}\``
            }],
            footer: this.getFooter(data)
        }]

        debug('Sending data packet to the webhook: ', attachments, this.name)
        this.webhook.rawSlack(attachments, this.name)
    }

    private getFooter = (data:IPacket):string => {
        return `${data.connectionId} #${data.sequence}`
    }
}