import {
    DiscordWebhookLogger,
    IDiscordWebhookLogger
} from "../../discord/discord-webhook-logger"
import { IPacketLogger, PacketLogger } from "./packet-logger"

const BalanceWebhookId = '316298052921065474'
const BalanceWebhookToken = '6YJ0kPw_76zL46GlNtIILQFVhYzZ5vcuplBHd4o3-JKWICuJzK5idUBdbajb7TGO-_F6'

let discordWebhook: IDiscordWebhookLogger = new DiscordWebhookLogger(
    BalanceWebhookId,
    BalanceWebhookToken
)

let packetLoggerService: IPacketLogger = new PacketLogger(discordWebhook)


export default packetLoggerService

