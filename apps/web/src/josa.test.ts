import { expect, it } from 'vitest';
import { josa } from './josa';
it('받침에 맞는 조사', () => { expect(josa('늑대', '이가')).toBe('늑대가'); expect(josa('골렘', '이가')).toBe('골렘이'); expect(josa('슬라임', '은는')).toBe('슬라임은'); expect(josa('붕어', '을를')).toBe('붕어를'); expect(josa('도토리', '을를')).toBe('도토리를'); });
