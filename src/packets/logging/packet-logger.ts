import { CommandPacket } from "../command-packet"
import { ErrorPacket } from "../error-packet"
import { IPacket } from "../packet"
import { MiscellaneousPacket } from "../miscellaneous-packet"
import { PacketType } from "../packet-type"
import { SerialDataPacket } from "../serial-data-packet"
import { SerialListPacket } from "../serial-list-packet"
import { SerialStatusPacket } from "../serial-status-packet"

import {
    IDiscordWebhookLogger,
    ISlackAttachment,
    DiscordWebhookLogger
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

    public log = (data: IPacket): void => {
        if (!this.isConfigured) {
            debug('Tried to log packet but not configured. ', data)
            return
        }

        if (!data) {
            if (this.webhook)
                this.webhook.plainText('Tried to transmit an empty packet.')
            return
        }

        let type = PacketType[data.packetType]
        if (data.packetType == PacketType.Miscellaneous)
            this.logMiscellaneousPacket(data)
        else if (data.packetType == PacketType.Data)
            this.logDataPacket(data)
        else if (data.packetType == PacketType.Error)
            this.logErrorPacket(data)
        else if (data.packetType == PacketType.List)
            this.logListPacket(data)
        else if (data.packetType == PacketType.Status)
            this.logStatusPacket(data)
        else if (data.packetType == PacketType.Command)
            this.logCommandPacket(data)
        else {
            debug('Sending raw text to the webhook: ', data)
            if (this.webhook)
                this.webhook.plainText(`${this.name}: ${type}`)
        }
    }

    private getFooter = (data: IPacket): string => {
        if (!data.connectionId)
            return ''
        else
            return `${data.connectionId} #${data.sequence}`
    }

    private logCommandPacket = (packet: IPacket): void => {
        let command: string = (<CommandPacket>packet).command
        let device: string | undefined = (<CommandPacket>packet).device
        let data: string | undefined = (<CommandPacket>packet).data

        let value: string = `${command} ${device || ''}${data || ''}`

        let attachments: ISlackAttachment[] = [{
            color: '#f80',
            fields: [{
                title: 'Command',
                value: `\`${value}\``
            }],
            footer: this.getFooter(packet)
        }]

        debug('Sending command packet to the webhook: ', value, attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
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

        debug('Sending data packet to the webhook: ', value, attachments, this.name)
        if (this.webhook)
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
        if (this.webhook)
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
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name, 'List')
    }

    private logMiscellaneousPacket = (data: IPacket): void => {
        let value: string = (<MiscellaneousPacket>data).message

        let attachments: ISlackAttachment[] = [{
            color: '#ff0',
            fields: [{
                title: 'Miscellaneous',
                value: `\`${value}\``
            }],
            footer: this.getFooter(data)
        }]

        debug('Sending data packet to the webhook: ', value, attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
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
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }
}