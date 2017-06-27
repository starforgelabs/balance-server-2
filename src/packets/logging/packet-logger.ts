import { CommandPacket } from "../command-packet"
import { ErrorPacket } from "../error-packet"
import { IPacket } from "../packet"
import { MiscellaneousPacket } from "../miscellaneous-packet"
import { PacketType } from "../packet-type"
import { SerialDataPacket } from "../serial-data-packet"
import { SerialListPacket } from "../serial-list-packet"
import { SerialStatusPacket } from "../serial-status-packet"

import {
    IDiscordWebhookLogger, DiscordWebhookLogger,
    ISlackAttachment,
    ISlackField,
} from "../../discord/discord-webhook-logger"

const debug = require('debug')('Packet Logger')

export interface IPacketLogger {
    isConfigured: boolean
    configure(name: string, webhookId: string, webhookToken: string): boolean
    log(packet: IPacket): void
}

export class PacketLogger implements IPacketLogger {
    public name: string

    private _isConfigured: boolean = false
    private webhook: IDiscordWebhookLogger | null = null

    constructor() {
    }

    public get isConfigured(): boolean {
        return this._isConfigured
    }

    public configure = (name: string, webhookId: string, webhookToken: string): boolean => {
        // Shut down old.
        this._isConfigured = false
        this.webhook = null

        if (!name || !webhookId || !webhookToken) {
            debug(`Can't configure Discord.`)
            return false
        }

        this.name = name
        this.webhook = new DiscordWebhookLogger(webhookId, webhookToken)
        this._isConfigured = true

        debug('Configured Discord for ', name)
        return true
    }

    public log = (packet: IPacket): void => {
        if (!this.isConfigured) {
            debug('Tried to log packet but not configured. ', packet)
            return
        }

        if (!packet) {
            if (this.webhook)
                this.webhook.plainText('Tried to transmit an empty packet.')
            return
        }

        let type = PacketType[packet.packetType]
        if (packet.packetType == PacketType.Miscellaneous)
            this.logMiscellaneousPacket(packet)
        else if (packet.packetType == PacketType.Data)
            this.logDataPacket(packet)
        else if (packet.packetType == PacketType.Error)
            this.logErrorPacket(packet)
        else if (packet.packetType == PacketType.List)
            this.logListPacket(packet)
        else if (packet.packetType == PacketType.Status)
            this.logStatusPacket(packet)
        else if (packet.packetType == PacketType.Command)
            this.logCommandPacket(packet)
        else {
            debug('Sending raw text to the webhook: ', packet)
            if (this.webhook)
                this.webhook.plainText(`${this.name}: ${type}`)
        }
    }

    private getFooter = (packet: IPacket): string => {
        if (!packet.connectionId)
            return ''
        else
            return `${packet.connectionId} #${packet.sequence}`
    }

    private logCommandPacket = (packet: IPacket): void => {
        let command: string = (<CommandPacket>packet).command
        let device: string | undefined = (<CommandPacket>packet).device
        let data: string | undefined = (<CommandPacket>packet).data

        let value: string = `${command} ${device || ''}${data || ''}`

        let date = new Date()
        let attachments: ISlackAttachment[] = [{
            color: '#f80',
            title: 'Command',
            text: `\`${value}\``,
            footer: this.getFooter(packet),
            fields: [
                {value: date.toLocaleDateString(), short: true},
                {value: date.toLocaleTimeString(), short: true},
            ],
        }]

        debug('Sending command packet to the webhook: ', value, attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }

    private logDataPacket = (packet: IPacket): void => {
        let value: string = (<SerialDataPacket>packet).data

        let date = new Date()
        let attachments: ISlackAttachment[] = [{
            color: '#0f0',
            title: 'Data',
            text: `\`${value}\``,
            footer: this.getFooter(packet),
            fields: [
                {value: date.toLocaleDateString(), short: true},
                {value: date.toLocaleTimeString(), short: true},
            ],
        }]

        debug('Sending data packet to the webhook: ', value, attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }

    private logErrorPacket = (packet: IPacket): void => {
        let message: string = (<ErrorPacket>packet).message
        let error: string = (<ErrorPacket>packet).error

        let date = new Date()
        let attachments: ISlackAttachment[] = [{
            color: '#f00',
            title: 'Error',
            text: `${message}\n\`${error}\``,
            footer: this.getFooter(packet),
            fields: [
                {value: date.toLocaleDateString(), short: true},
                {value: date.toLocaleTimeString(), short: true},
            ],
        }]

        debug('Sending data packet to the webhook: ', attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }

    private logListPacket = (packet: IPacket): void => {
        let list = (<SerialListPacket>packet).list

        let fields: ISlackField[] = []
        for (let l of list) {

            let field: ISlackField = {
                title: l.device,
                value: '',
                short: false,
            }

            // There are several conditional values to add to "value".
            if (l.prefer)
                field.value += '[Prefer]'

            if (l.connected)
                field.value += ' **Connected**'

            if (l.vendor)
                field.value += ` ${l.vendor}`

            if (l.vendorId)
                field.value += ` \`${l.vendorId}\``

            if (l.productId)
                field.value += ` \`${l.productId}\``

            field.value = field.value.trim()

            fields.push(field)
        }

        let date = new Date()
        fields.push({value: date.toLocaleDateString(), short: true})
        fields.push({value: date.toLocaleTimeString(), short: true})

        let attachments: ISlackAttachment[] = [{
            color: '#f0f',
            title: 'List',
            footer: this.getFooter(packet),
            fields: fields,
        }]

        debug('Sending data packet to the webhook: ', attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }

    private logMiscellaneousPacket = (packet: IPacket): void => {
        let value: string = (<MiscellaneousPacket>packet).message

        let date = new Date()
        let attachments: ISlackAttachment[] = [{
            color: '#ff0',
            title: 'Miscellaneous',
            text: value,
            footer: this.getFooter(packet),
            fields: [
                {value: date.toLocaleDateString(), short: true},
                {value: date.toLocaleTimeString(), short: true},
            ],
        }]

        debug('Sending data packet to the webhook: ', value, attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }

    private logStatusPacket = (packet: IPacket): void => {
        let connected: boolean = (<SerialStatusPacket>packet).connected
        let device: string = (<SerialStatusPacket>packet).device

        let color = connected ? '#0ff' : '#044'
        let state = connected ? `Connected to \`${device}\`` : 'Disconnected'

        let date = new Date()
        let attachments: ISlackAttachment[] = [{
            color: color,
            title: 'Status',
            text: state,
            footer: this.getFooter(packet),
            fields: [
                {value: date.toLocaleDateString(), short: true},
                {value: date.toLocaleTimeString(), short: true},
            ],
        }]

        debug('Sending data packet to the webhook: ', attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }
}