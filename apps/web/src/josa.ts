/** 받침에 맞는 조사: josa('늑대','이가') → '늑대가', josa('골렘','이가') → '골렘이'. 짝: 이가·은는·을를 */
export function josa(word: string, pair: '이가' | '은는' | '을를'): string {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  const has = c >= 0 && c <= 11171 && c % 28 !== 0;
  return word + (has ? pair[0] : pair[1]);
}
