import { PokemonSet } from "pokemon-showdown/.sim-dist/teams";
// type MoveType = "attack" | "swap"
var MoveType;
(function (MoveType) {
    MoveType[MoveType["ATTACK"] = 0] = "ATTACK";
    MoveType[MoveType["SWAP"] = 1] = "SWAP";
})(MoveType || (MoveType = {}));
export { MoveType, PokemonSet };
