import { Codex } from './Codex';
import { DungeonScreen } from './DungeonScreen';
import { LoveScreen } from './LoveScreen';
import { FishGame, GatherGame } from './Minigames';
import { useActivity } from './activityStore';

export function ActivityHost() {
  const open = useActivity((s) => s.open);
  if (!open) return null;
  return open.kind === 'fish' ? <FishGame key={open.n} /> : open.kind === 'gather' ? <GatherGame key={open.n} spot={open.spot} /> : open.kind === 'codex' ? <Codex key={open.n} /> : open.kind === 'love' ? <LoveScreen key={open.n} /> : <DungeonScreen key={open.n} />;
}
