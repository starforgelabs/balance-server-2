const debug = require('debug')('lib:discordlogger')
const Discord = require('discord.js')

export interface ISlackField {
    title?: string
    value: string
}

export interface ISlackAttachment {
    pretext?: string
    color?: string
    fields?: ISlackField[]
    footer_ioon?: string
    footer?: string
    ts?: number
}

export interface IDiscordWebhookLogger {
    plainText(message: string): void
    rawSlack(attachments: ISlackAttachment[], username?: string, text?: string): void
}

export class DiscordWebhookLogger implements IDiscordWebhookLogger {
    private webhook: any

    constructor(private webhookId: string, private webhookToken: string) {
        this.webhook = new Discord.WebhookClient(webhookId, webhookToken)
    }

    public plainText = (message: string): void => {
        this.webhook.send(message)
            .catch(this.catchHandler)
    }

    public rawSlack = (attachments: ISlackAttachment[], username: string = '', text: string = ''): void => {
        let slackMessage: any = {
            username: username || this.webhook.name,
            text: text || '[]()',
            attachments: attachments
        }

        this.webhook.sendSlackMessage(slackMessage)
            .catch(this.catchHandler)
    }

    private catchHandler = (error: any): void => {
        debug('Send to Discord failed: ', error)
    }
}

