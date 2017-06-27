const debug = require('debug')('lib:discordlogger')
const Discord = require('discord.js')

// Slack fields taken from
//
// https://api.slack.com/docs/message-attachments
//
// on 6/26/17

export interface ISlackField {
    title?: string // No markup permitted
    value: string // Uses standard message markup
    short?: boolean
}

export interface ISlackAttachment {
    fallback?: string  // Required plain-text summary of the attachment. No markup.

    color?: string

    pretext?: string

    author_name?: string
    author_link?: string // URL, requires author_name
    author_icon?: string // URL 16x16, requires author_name

    title?: string
    title_link?: string // URL, requires title

    text?: string // Markdown supported.

    image_url?: string // URL, max 400x500
    thumb_url?: string // URL, 75x75

    fields?: ISlackField[]

    footer_icon?: string // URL, 16x16
    footer?: string

    ts?: number // Unix timestamp
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
            attachments: attachments,
            ts: Math.floor(Date.now() / 1000),
        }

        this.webhook.sendSlackMessage(slackMessage)
            .catch(this.catchHandler)
    }

    private catchHandler = (error: any): void => {
        debug('Send to Discord failed: ', error)
    }
}

