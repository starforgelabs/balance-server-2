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

    private logDataPacket = (packet: IPacket): void => {
        let value: string = (<SerialDataPacket>packet).data

        let attachments: ISlackAttachment[] = [{
            color: '#0f0',
            fields: [{
                title: 'Data',
                value: `\`${value}\``
            }],
            footer: this.getFooter(packet)
        }]

        debug('Sending data packet to the webhook: ', value, attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }

    private logErrorPacket = (packet: IPacket): void => {
        let value: string = (<ErrorPacket>packet).message
        let error: string = (<ErrorPacket>packet).error

        let attachments: ISlackAttachment[] = [{
            color: '#f00',
            fields: [{
                title: 'Error',
                value: `\`${value} - ${error}\``
            }],
            footer: this.getFooter(packet)
        }]

        debug('Sending data packet to the webhook: ', attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }

    private logListPacket = (packet: IPacket): void => {
        let list = (<SerialListPacket>packet).list

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
                footer: this.getFooter(packet)
            }

            attachments.push(attachment)
        }

        debug('Sending data packet to the webhook: ', attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name, 'List')
    }

    private logMiscellaneousPacket = (packet: IPacket): void => {
        let value: string = (<MiscellaneousPacket>packet).message

        let attachments: ISlackAttachment[] = [{
            color: '#ff0',
            fields: [{
                title: 'Miscellaneous',
                value: `\`${value}\``
            }],
            footer: this.getFooter(packet)
        }]

        debug('Sending data packet to the webhook: ', value, attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }

    private logStatusPacket = (packet: IPacket): void => {
        let connected: boolean = (<SerialStatusPacket>packet).connected
        let device: string = (<SerialStatusPacket>packet).device

        let color = connected ? '#0ff' : '#044'
        let state = connected ? `Connected: ${device}` : 'Disconnected'

        let attachments: ISlackAttachment[] = [{
            color: color,
            fields: [{
                title: 'Status',
                value: `\`${state}\``
            }],
            footer: this.getFooter(packet)
        }]

        debug('Sending data packet to the webhook: ', attachments, this.name)
        if (this.webhook)
            this.webhook.rawSlack(attachments, this.name)
    }
}