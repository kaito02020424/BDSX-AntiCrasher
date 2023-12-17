import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { Player } from "bdsx/bds/player";
import { CANCEL } from "bdsx/common";
import { events } from "bdsx/event";
import { bedrockServer } from "bdsx/launcher";

/*
events.packetBefore(MinecraftPacketIds.CommandRequest).on((pkt, ni) => {
    const player = ni.getActor()
    if (player == null) return;
    console.log("detect Borion Crasher")
    if (pkt.command.startsWith("/me @e @e @e")) return CANCEL;
})
*/
const playerData: { [key: string]: { time: number, count: number } } = {}
const disconnectQueue:string[] = []
events.packetRaw(MinecraftPacketIds.CommandRequest).on((ptr, size, ni) => {
    const player = ni.getActor()
    if (player == null) return;
    if (player.isSimulated()) return;
    if (disconnectQueue.includes(player.getXuid())) return CANCEL;
    if (!(player.getXuid() in playerData)) playerData[player.getXuid()] = { time: Date.now(), count: 0 }
    const pktId = ptr.readUint8()
    const command = ptr.readVarString()
    if (command.startsWith("/me @e @e @e")) {
        console.log("detect Borion Crasher (Username: ",player.getName(),", Xuid: ",player.getXuid())
        if (Date.now() - playerData[player.getXuid()]!.time > 1000) {
            playerData[player.getXuid()].time = Date.now()
            playerData[player.getXuid()].count = 0
        } else {
            playerData[player.getXuid()].count += 1
        }
        if (playerData[player.getXuid()].count > 10) {
            disconnectPlayer(player)
        }
        return CANCEL
    };
})
events.playerLeft.on((ev) => {
    const player = ev.player
    if (player.isSimulated()) return;
    if (player.getXuid() in playerData) delete playerData[player.getXuid()]
    if (disconnectQueue.includes(player.getXuid())) disconnectQueue.splice(disconnectQueue.indexOf(player.getXuid()), 1)
})
function disconnectPlayer(player: Player) {
    disconnectQueue.push(player.getXuid())
    bedrockServer.serverInstance.disconnectClient(player.getNetworkIdentifier(), "Detect Crasher")
}